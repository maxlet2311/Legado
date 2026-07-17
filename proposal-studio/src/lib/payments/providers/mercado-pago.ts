import "server-only";

import {
  getMercadoPagoAccessToken,
  getMercadoPagoWebhookSecret,
  allowUnsignedMercadoPagoWebhooks,
} from "@/lib/utils/env";
import { logServerError } from "@/lib/utils/errors";
import { PaymentProviderError } from "@/lib/payments/errors";
import { mapMercadoPagoSubscriptionStatus } from "@/lib/payments/status-map";
import { isValidMercadoPagoSignature } from "@/lib/payments/mercado-pago-signature";
import type { SubscriptionProvider } from "@/lib/payments/provider";
import type {
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  NormalizedProviderSubscription,
  NormalizedSubscriptionEvent,
} from "@/lib/payments/types";

const MP_API_BASE = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Únicos topics de suscripciones documentados por Mercado Pago
 * ("Your integrations > Notifications > Webhooks", sección Suscripciones):
 * `subscription_preapproval` (alta/cambio de la suscripción misma) y
 * `subscription_authorized_payment` (cobro recurrente puntual). El topic
 * genérico `payment` puede llegar para otros productos de la cuenta y se
 * ignora acá — no corresponde a suscripciones.
 */
const PREAPPROVAL_TOPICS = new Set(["subscription_preapproval", "preapproval"]);
const AUTHORIZED_PAYMENT_TOPICS = new Set(["subscription_authorized_payment"]);

interface MercadoPagoPreapprovalResponse {
  id: string;
  status: string;
  payer_email?: string | null;
  external_reference?: string | null;
  init_point?: string;
  sandbox_init_point?: string;
  auto_recurring?: {
    start_date?: string | null;
    end_date?: string | null;
  };
}

interface MercadoPagoAuthorizedPaymentResponse {
  id: string;
  preapproval_id: string;
  status: string;
  date_created?: string | null;
}

/** Cliente HTTP centralizado: única función que hace `fetch` contra la API de Mercado Pago. */
async function mpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = getMercadoPagoAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${MP_API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      // Nunca se loguea el body completo (puede incluir datos del pagador):
      // solo status y el mensaje de error de MP si viene en un campo conocido.
      let providerMessage: string | undefined;
      try {
        const errorBody = (await response.json()) as { message?: string };
        providerMessage = errorBody?.message;
      } catch {
        // body no-JSON: se ignora, no es información recuperable de forma segura.
      }
      logServerError("mercadoPago:request_failed", { code: String(response.status), message: providerMessage });
      throw new PaymentProviderError(
        "provider_request_failed",
        `Mercado Pago respondió ${response.status} para ${init.method ?? "GET"} ${path}.`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof PaymentProviderError) throw error;
    logServerError("mercadoPago:network_error", error);
    throw new PaymentProviderError("provider_unavailable", "No se pudo conectar con Mercado Pago.");
  } finally {
    clearTimeout(timeout);
  }
}

function toNormalizedSubscription(data: MercadoPagoPreapprovalResponse): NormalizedProviderSubscription {
  return {
    providerSubscriptionId: data.id,
    status: mapMercadoPagoSubscriptionStatus(data.status),
    rawStatus: data.status,
    payerEmail: data.payer_email ?? null,
    externalReference: data.external_reference ?? null,
    currentPeriodStart: data.auto_recurring?.start_date ?? null,
    currentPeriodEnd: data.auto_recurring?.end_date ?? null,
    lastPaymentAt: null,
    lastPaymentApproved: null,
  };
}

/**
 * Crea la suscripción vía el modelo de redirección ("pending payment"):
 * se envía `preapproval_plan_id` sin `card_token_id`, con `status: "pending"`
 * explícito. Mercado Pago documenta este modelo para suscripciones sin plan
 * asociado (devuelve `init_point`/`sandbox_init_point` para redirigir al
 * pagador); para suscripciones CON plan asociado la documentación pública
 * solo ilustra la variante con `card_token_id` (sin redirección). Se asume
 * que el mismo modelo de redirección aplica agregando `preapproval_plan_id`
 * — es una inferencia razonable dado que ambos endpoints son el mismo
 * `POST /preapproval`, pero queda como limitación a validar contra Sandbox
 * real antes de producción (ver informe de Etapa 4).
 */
async function createSubscription(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult> {
  const data = await mpFetch<MercadoPagoPreapprovalResponse>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      preapproval_plan_id: input.providerPlanId,
      payer_email: input.payerEmail,
      external_reference: input.externalReference,
      back_url: input.backUrl,
      status: "pending",
    }),
  });

  const checkoutUrl = data.init_point ?? data.sandbox_init_point;
  if (!checkoutUrl) {
    throw new PaymentProviderError(
      "provider_request_failed",
      "Mercado Pago no devolvió una URL de checkout (init_point) para la suscripción creada.",
    );
  }

  return {
    providerSubscriptionId: data.id,
    status: mapMercadoPagoSubscriptionStatus(data.status),
    checkoutUrl,
  };
}

async function getSubscription(providerSubscriptionId: string): Promise<NormalizedProviderSubscription> {
  const data = await mpFetch<MercadoPagoPreapprovalResponse>(`/preapproval/${providerSubscriptionId}`);
  return toNormalizedSubscription(data);
}

async function cancelSubscription(providerSubscriptionId: string): Promise<void> {
  await mpFetch(`/preapproval/${providerSubscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/** Resuelve a qué preapproval pertenece un pago recurrente puntual (topic `subscription_authorized_payment`). */
async function getAuthorizedPayment(paymentId: string): Promise<MercadoPagoAuthorizedPaymentResponse> {
  return mpFetch<MercadoPagoAuthorizedPaymentResponse>(`/authorized_payments/${paymentId}`);
}

/**
 * Clave idempotente sintética para topics/eventos sin un id de notificación
 * único y estable propio (documentado como limitación en la migración de
 * `payment_provider_events`): combina tipo de evento, recurso afectado y el
 * `ts` de la firma (cada reintento real de Mercado Pago reenvía la misma
 * notificación con el mismo `ts` de firma original, así que sigue siendo
 * estable entre reintentos del mismo evento).
 */
function buildIdempotencyKey(eventType: string, resourceId: string | null, ts: string | null): string {
  return `${eventType}:${resourceId ?? "unknown"}:${ts ?? "no-ts"}`;
}

async function parseWebhook(request: Request): Promise<NormalizedSubscriptionEvent> {
  const url = new URL(request.url);
  const rawBody = await request.text();

  let parsedBody: Record<string, unknown> = {};
  try {
    parsedBody = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    throw new PaymentProviderError("invalid_webhook_payload", "El cuerpo del webhook no es JSON válido.");
  }

  // Mercado Pago envía el topic/tipo y el id tanto por query string como,
  // usualmente, dentro del body (`type`/`topic` y `data.id`) — se acepta
  // cualquiera de las dos fuentes, priorizando el query string (es el que
  // usa la firma para el manifest).
  const eventType =
    url.searchParams.get("type") ?? url.searchParams.get("topic") ?? (parsedBody.type as string | undefined) ?? "unknown";
  const dataId =
    url.searchParams.get("data.id") ??
    (parsedBody.data as { id?: string } | undefined)?.id ??
    null;

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  let signatureValid = false;
  try {
    const secret = getMercadoPagoWebhookSecret();
    signatureValid = isValidMercadoPagoSignature({ xSignature, xRequestId, dataId, secret });
  } catch (error) {
    logServerError("mercadoPago:webhook_secret_missing", error);
  }

  if (!signatureValid && allowUnsignedMercadoPagoWebhooks()) {
    signatureValid = true;
  }

  const { ts } = xSignature ? { ts: xSignature.match(/ts=(\d+)/)?.[1] ?? null } : { ts: null };
  const idempotencyKey = buildIdempotencyKey(eventType, dataId, ts);

  const sanitizedPayload: Record<string, unknown> = {
    type: eventType,
    dataId,
    // El body crudo se guarda tal cual: no contiene datos de tarjeta ni
    // secretos, solo ids y metadatos del recurso — pero nunca se incluyen
    // los headers de firma completos acá.
    body: parsedBody,
  };

  let providerSubscriptionId: string | null = null;
  let paymentSignal: NormalizedSubscriptionEvent["paymentSignal"] = null;

  if (dataId && PREAPPROVAL_TOPICS.has(eventType)) {
    providerSubscriptionId = dataId;
  } else if (dataId && AUTHORIZED_PAYMENT_TOPICS.has(eventType)) {
    try {
      const payment = await getAuthorizedPayment(dataId);
      providerSubscriptionId = payment.preapproval_id;
      paymentSignal = {
        approved: payment.status === "processed",
        paidAt: payment.date_created ?? null,
      };
    } catch (error) {
      logServerError("mercadoPago:authorized_payment_lookup_failed", error);
      providerSubscriptionId = null;
    }
  }

  return {
    provider: "mercado_pago",
    idempotencyKey,
    eventType,
    providerResourceId: dataId,
    providerSubscriptionId,
    paymentSignal,
    signatureValid,
    payload: sanitizedPayload,
  };
}

const mercadoPagoProvider: SubscriptionProvider = {
  createSubscription,
  getSubscription,
  cancelSubscription,
  parseWebhook,
};

export { mercadoPagoProvider, buildIdempotencyKey };
