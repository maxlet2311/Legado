import "server-only";

import { NextResponse } from "next/server";

import { getSubscriptionProvider } from "@/lib/payments";
import { recordIncomingEvent, markEventStatus } from "@/lib/payments/webhook-events";
import { applyNormalizedSubscriptionEvent } from "@/lib/payments/subscription-sync";
import { getMembershipByProviderSubscriptionId } from "@/lib/memberships/service";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

/**
 * Webhook público de Mercado Pago (Etapa 4). Público solo a nivel de red —
 * la protección real es la validación de firma (`x-signature`), nunca sesión
 * de usuario ni CSRF (no aplica a un llamador externo sin cookies). No
 * confía en el payload del evento: siempre vuelve a consultar el recurso
 * real vía `getSubscription` antes de tocar una membresía (sección 14 del
 * alcance de Etapa 4).
 *
 * Idempotente por `(provider, provider_event_id)` — ver
 * `src/lib/payments/webhook-events.ts`. Responde 200 tan pronto como el
 * evento queda registrado y clasificado, incluso cuando se ignora
 * (recurso no relacionado a suscripciones, membresía inexistente, o
 * transición no aplicable) — Mercado Pago solo debe reintentar ante una
 * falla real de nuestro lado (5xx), no ante eventos que ya entendimos y
 * decidimos no aplicar.
 */
async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Límite generoso: la firma es la protección real; esto solo frena un
  // flood evidente, sin bloquear los reintentos legítimos de Mercado Pago
  // (cada 15 minutos según su documentación).
  if (!checkRateLimit(`webhook:mercado-pago:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const provider = getSubscriptionProvider("mercado_pago");

  let event;
  try {
    event = await provider.parseWebhook(request);
  } catch (error) {
    logServerError("mercadoPagoWebhook:parse_failed", error);
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const recorded = await recordIncomingEvent({
    provider: event.provider,
    idempotencyKey: event.idempotencyKey,
    eventType: event.eventType,
    providerResourceId: event.providerResourceId,
    signatureValid: event.signatureValid,
    payload: event.payload,
  });

  if (!recorded.isNew) {
    // Reintento/duplicado ya procesado (o ya rechazado) en un intento previo.
    return NextResponse.json({ status: "duplicate" });
  }

  if (!event.signatureValid) {
    await markEventStatus(recorded.id, "ignored", "invalid_signature");
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  await markEventStatus(recorded.id, "processing");

  if (!event.providerSubscriptionId) {
    await markEventStatus(recorded.id, "ignored", "event_not_associated_to_subscription");
    return NextResponse.json({ status: "ignored" });
  }

  try {
    const membership = await getMembershipByProviderSubscriptionId("mercado_pago", event.providerSubscriptionId);

    if (!membership) {
      logServerError("mercadoPagoWebhook:membership_not_found", { providerSubscriptionId: event.providerSubscriptionId });
      await markEventStatus(recorded.id, "failed", "membership_not_found");
      return NextResponse.json({ status: "ignored" });
    }

    const remote = await provider.getSubscription(event.providerSubscriptionId);

    const result = await applyNormalizedSubscriptionEvent({
      membership,
      remote,
      paymentSignal: event.paymentSignal,
      source: "payment_provider",
      externalEventId: event.idempotencyKey,
    });

    await markEventStatus(recorded.id, result.applied ? "processed" : "ignored", result.skipReason ?? null);

    return NextResponse.json({ status: result.applied ? "processed" : "ignored" });
  } catch (error) {
    logServerError("mercadoPagoWebhook:processing_failed", error);
    await markEventStatus(recorded.id, "failed", error instanceof Error ? error.message : "unknown_error");
    // 500 para que Mercado Pago reintente: puede ser una falla transitoria
    // nuestra (ej. Supabase caído), no una decisión definitiva sobre el evento.
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export { POST };
