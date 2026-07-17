import "server-only";

import { createAdminClient } from "@/lib/database/admin";
import type { Database } from "@/lib/database/types";
import type { ProviderName } from "@/lib/payments/types";

type ProcessingStatus = Database["public"]["Tables"]["payment_provider_events"]["Row"]["processing_status"];

const MAX_ERROR_MESSAGE_LENGTH = 500;

/** Trunca antes de persistir: nunca se guarda un stack trace completo ni datos potencialmente sensibles del error crudo. */
function truncateErrorMessage(message: string | null | undefined): string | null {
  if (!message) return null;
  return message.length > MAX_ERROR_MESSAGE_LENGTH ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…` : message;
}

interface RecordEventParams {
  provider: ProviderName;
  idempotencyKey: string;
  eventType: string;
  providerResourceId: string | null;
  signatureValid: boolean;
  payload: Record<string, unknown>;
}

interface RecordedEvent {
  id: string;
  /** `true` si esta llamada insertó la fila; `false` si ya existía (evento repetido — no reprocesar). */
  isNew: boolean;
  attemptCount: number;
}

/**
 * Inserta el evento crudo con idempotencia por `(provider, provider_event_id)`
 * (ver índice único en la migración). Si el evento ya existía (reintento real
 * de Mercado Pago, o un duplicado de red), incrementa `attempt_count` y
 * devuelve `isNew: false` — el llamador nunca debe reprocesar la transición
 * de membresía en ese caso, solo responder 200 igual.
 */
async function recordIncomingEvent(params: RecordEventParams): Promise<RecordedEvent> {
  const admin = createAdminClient();

  const { data: inserted, error: insertError } = await admin
    .from("payment_provider_events")
    .insert({
      provider: params.provider,
      provider_event_id: params.idempotencyKey,
      event_type: params.eventType,
      provider_resource_id: params.providerResourceId,
      signature_valid: params.signatureValid,
      processing_status: "received",
      payload: params.payload as Database["public"]["Tables"]["payment_provider_events"]["Insert"]["payload"],
    })
    .select("id, attempt_count")
    .single();

  if (!insertError && inserted) {
    return { id: inserted.id, isNew: true, attemptCount: inserted.attempt_count };
  }

  // 23505 = unique_violation: el evento ya existía. Se busca la fila existente
  // y se incrementa attempt_count para dejar rastro del reintento.
  const pgError = insertError as { code?: string } | null;
  if (pgError?.code !== "23505") {
    throw insertError ?? new Error("No se pudo registrar el evento del proveedor de pagos.");
  }

  const { data: existing, error: selectError } = await admin
    .from("payment_provider_events")
    .select("id, attempt_count")
    .eq("provider", params.provider)
    .eq("provider_event_id", params.idempotencyKey)
    .single();

  if (selectError || !existing) {
    throw selectError ?? new Error("No se pudo ubicar el evento duplicado del proveedor de pagos.");
  }

  await admin
    .from("payment_provider_events")
    .update({ attempt_count: existing.attempt_count + 1 })
    .eq("id", existing.id);

  return { id: existing.id, isNew: false, attemptCount: existing.attempt_count + 1 };
}

async function markEventStatus(
  eventId: string,
  status: ProcessingStatus,
  errorMessage?: string | null,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("payment_provider_events")
    .update({
      processing_status: status,
      error_message: truncateErrorMessage(errorMessage),
      processed_at: status === "processed" || status === "ignored" || status === "failed" ? new Date().toISOString() : null,
    })
    .eq("id", eventId);
}

export { recordIncomingEvent, markEventStatus };
