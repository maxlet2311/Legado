import "server-only";

import { NextResponse } from "next/server";

import { getSubscriptionProvider } from "@/lib/payments";
import { recordIncomingEvent, markEventStatus } from "@/lib/payments/webhook-events";
import { isReprocessable } from "@/lib/payments/webhook-event-status";
import { reconcileMercadoPagoPreapproval } from "@/lib/payments/reconciliation";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

/**
 * Webhook público de Mercado Pago. Público solo a nivel de red — la
 * protección real es la validación de firma (`x-signature`), nunca sesión de
 * usuario ni CSRF. No confía en el payload del evento: siempre vuelve a
 * consultar el recurso real (`GET /preapproval/{id}`) antes de tocar una
 * membresía, y la correlación con la membership local vive exclusivamente en
 * `reconcileMercadoPagoPreapproval` (Paso 2.1) — nunca por email, orden
 * temporal ni monto. Un evento correctamente firmado que no puede
 * correlacionarse a ningún checkout attempt queda `unmatched`, disponible
 * para reconciliación administrativa posterior; nunca se selecciona una
 * membership por fallback.
 *
 * Idempotente por `(provider, provider_event_id)` — ver
 * `src/lib/payments/webhook-events.ts`. Responde 200 tan pronto como el
 * evento queda registrado y clasificado, incluso cuando se ignora — Mercado
 * Pago solo debe reintentar ante una falla real de nuestro lado (5xx).
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

  if (!recorded.isNew && !isReprocessable(recorded.processingStatus)) {
    // Reintento/duplicado ya resuelto (procesado, ignorado o unmatched) en un
    // intento previo — nunca se reprocesa. Si en cambio quedó "failed" (o se
    // cayó el proceso a mitad de camino, dejándolo en "received"/"processing"),
    // se sigue de largo y se reintenta: de lo contrario, una falla transitoria
    // nuestra en el primer intento dejaría el evento huérfano para siempre,
    // porque Mercado Pago solo reintenta un número acotado de veces.
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
    const outcome = await reconcileMercadoPagoPreapproval(event.providerSubscriptionId, {
      source: "payment_provider",
      externalEventId: event.idempotencyKey,
    });

    if (!outcome.matched) {
      // Nunca se toca ninguna membership acá: el evento queda disponible
      // para reconciliación administrativa posterior
      // (`reconcileMercadoPagoPreapproval` vía panel admin).
      await markEventStatus(recorded.id, "unmatched", outcome.reason);
      return NextResponse.json({ status: "unmatched" });
    }

    await markEventStatus(recorded.id, outcome.applied ? "processed" : "ignored", outcome.skipReason ?? null);
    return NextResponse.json({ status: outcome.applied ? "processed" : "ignored" });
  } catch (error) {
    logServerError("mercadoPagoWebhook:processing_failed", error);
    await markEventStatus(recorded.id, "failed", error instanceof Error ? error.message : "unknown_error");
    // 500 para que Mercado Pago reintente: puede ser una falla transitoria
    // nuestra (ej. Supabase caído), no una decisión definitiva sobre el evento.
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export { POST };
