import "server-only";

import { createAdminClient } from "@/lib/database/admin";
import type { Database } from "@/lib/database/types";
import type { ProviderName } from "@/lib/payments/types";
import type { ProcessingStatus } from "@/lib/payments/webhook-event-status";

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
  /** Estado de la fila existente cuando `isNew` es `false` — el llamador lo usa para decidir si reprocesar. */
  processingStatus: ProcessingStatus;
}

/**
 * Inserta el evento crudo con idempotencia por `(provider, provider_event_id)`
 * (ver índice único en la migración). Si el evento ya existía (reintento real
 * de Mercado Pago, o un duplicado de red) y quedó en un estado terminal
 * (`processed`/`ignored`/`unmatched`), incrementa `attempt_count` y devuelve
 * `isNew: false` — el llamador no debe reprocesar la transición de membresía
 * en ese caso, solo responder 200 igual.
 *
 * Si en cambio quedó en `failed` (o se cayó el proceso a mitad de camino,
 * dejándolo en `received`/`processing`), el reintento SÍ debe reprocesarse:
 * de lo contrario, un evento que falló una vez por una falla transitoria
 * nuestra (ej. Supabase caído durante ese webhook puntual) queda huérfano
 * para siempre, porque Mercado Pago solo reintenta un puñado de veces y cada
 * reintento pasaría a caer en la rama "duplicado" sin jamás volver a
 * aplicarse. `processingStatus` viaja en el resultado para que el llamador
 * decida.
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
    return { id: inserted.id, isNew: true, attemptCount: inserted.attempt_count, processingStatus: "received" };
  }

  // 23505 = unique_violation: el evento ya existía. Se busca la fila existente
  // y se incrementa attempt_count para dejar rastro del reintento.
  const pgError = insertError as { code?: string } | null;
  if (pgError?.code !== "23505") {
    throw insertError ?? new Error("No se pudo registrar el evento del proveedor de pagos.");
  }

  const { data: existing, error: selectError } = await admin
    .from("payment_provider_events")
    .select("id, attempt_count, processing_status")
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

  return {
    id: existing.id,
    isNew: false,
    attemptCount: existing.attempt_count + 1,
    processingStatus: existing.processing_status,
  };
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

interface UnmatchedEventSummary {
  id: string;
  provider: string;
  eventType: string;
  /** Enmascarado: nunca se expone el id completo del recurso, ni siquiera al Platform Owner. */
  providerResourceIdMasked: string | null;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: string;
}

function maskResourceId(id: string | null): string | null {
  if (!id) return null;
  if (id.length <= 6) return "***";
  return `${id.slice(0, 4)}...${id.slice(-2)}`;
}

/**
 * Eventos de webhook correctamente firmados que no pudieron correlacionarse
 * a ningún checkout attempt (Paso 2.1, sección 7). Uso exclusivamente
 * administrativo — nunca se filtra el id completo del recurso.
 */
async function listUnmatchedEvents(limit = 50): Promise<UnmatchedEventSummary[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_provider_events")
    .select("id, provider, event_type, provider_resource_id, error_message, attempt_count, created_at")
    .eq("processing_status", "unmatched")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    eventType: row.event_type,
    providerResourceIdMasked: maskResourceId(row.provider_resource_id),
    errorMessage: row.error_message,
    attemptCount: row.attempt_count,
    createdAt: row.created_at,
  }));
}

interface PaymentProviderEventAdminItem {
  id: string;
  provider: string;
  eventType: string;
  providerResourceIdMasked: string | null;
  processingStatus: ProcessingStatus;
  signatureValid: boolean;
  errorMessage: string | null;
  attemptCount: number;
  payload: Record<string, unknown>;
  createdAt: string;
  processedAt: string | null;
}

interface ListPaymentProviderEventsParams {
  page: number;
  pageSize: number;
  provider?: string;
  eventType?: string;
  processingStatus?: ProcessingStatus;
  /** `true` = `error_message` no nulo. No existe columna dedicada de "último error" fuera de esta — se deriva de la misma. */
  hasError?: boolean;
  dateFrom?: string;
  dateTo?: string;
  /** Búsqueda exacta por el id interno (uuid) de la fila — nunca por `provider_resource_id` completo, que no se persiste sin enmascarar en la UI. */
  eventId?: string;
}

interface ListPaymentProviderEventsResult {
  items: PaymentProviderEventAdminItem[];
  total: number;
}

/**
 * Lectura administrativa general de `payment_provider_events` (Lote B, Paso
 * 8) — hasta ahora solo existía `listUnmatchedEvents` (fijo a
 * `processing_status = 'unmatched'`, sin paginación real). Esta función cubre
 * la pantalla `/admin/payments/events` completa, con `processing_status`
 * como uno más de los filtros (incluyendo `unmatched`, que la UI resalta
 * como vista "No asociados"). Nunca se expone `provider_resource_id`
 * completo — siempre enmascarado con `maskResourceId`.
 *
 * Esta tabla no tiene ninguna columna que la vincule a `memberships` o
 * `membership_checkout_attempts` (confirmado contra la migración — ver
 * `Relationships: []` en los tipos generados): la única correlación posible
 * es indirecta, vía `provider_resource_id` contra
 * `membership_checkout_attempts.provider_checkout_plan_id`/
 * `provider_subscription_id`, y esa correlación ya la hace
 * `reconcileMercadoPagoPreapproval` — no se inventa acá un join que no existe
 * en el esquema real.
 */
async function listPaymentProviderEvents(
  params: ListPaymentProviderEventsParams,
): Promise<ListPaymentProviderEventsResult> {
  const admin = createAdminClient();
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = admin
    .from("payment_provider_events")
    .select("id, provider, event_type, provider_resource_id, processing_status, signature_valid, error_message, attempt_count, payload, created_at, processed_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.provider) query = query.eq("provider", params.provider);
  if (params.eventType) query = query.eq("event_type", params.eventType);
  if (params.processingStatus) query = query.eq("processing_status", params.processingStatus);
  if (params.hasError === true) query = query.not("error_message", "is", null);
  if (params.hasError === false) query = query.is("error_message", null);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", params.dateTo);
  if (params.eventId) query = query.eq("id", params.eventId);

  const { data, count, error } = await query;
  if (error) throw error;

  const items: PaymentProviderEventAdminItem[] = (data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    eventType: row.event_type,
    providerResourceIdMasked: maskResourceId(row.provider_resource_id),
    processingStatus: row.processing_status as ProcessingStatus,
    signatureValid: row.signature_valid,
    errorMessage: row.error_message,
    attemptCount: row.attempt_count,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    processedAt: row.processed_at,
  }));

  return { items, total: count ?? 0 };
}

/** Cuenta por `processing_status`, sin traer filas — usado por el resumen de `/admin/payments`. */
async function countPaymentProviderEventsByStatus(status: ProcessingStatus): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("payment_provider_events")
    .select("id", { count: "exact", head: true })
    .eq("processing_status", status);

  if (error) throw error;
  return count ?? 0;
}

export {
  recordIncomingEvent,
  markEventStatus,
  listUnmatchedEvents,
  listPaymentProviderEvents,
  countPaymentProviderEventsByStatus,
  maskResourceId,
};
export type { UnmatchedEventSummary, PaymentProviderEventAdminItem, ListPaymentProviderEventsParams };
