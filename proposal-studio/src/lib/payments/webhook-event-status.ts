import type { Database } from "@/lib/database/types";

type ProcessingStatus = Database["public"]["Tables"]["payment_provider_events"]["Row"]["processing_status"];

/** Estados que dejan el evento sin aplicar de verdad: un reintento de Mercado Pago sobre estos SÍ debe reprocesarse, nunca tratarse como "duplicado ya resuelto". */
const REPROCESSABLE_STATUSES: ReadonlySet<ProcessingStatus> = new Set(["received", "processing", "failed"]);

/**
 * `true` si un evento existente (`isNew: false` en `recordIncomingEvent`)
 * debe reprocesarse en vez de responderse como duplicado ya resuelto. Lógica
 * pura, separada de `webhook-events.ts` (server-only) para poder testearla
 * directo con `node --test` — mismo criterio que `activation-email-content.ts`.
 */
function isReprocessable(status: ProcessingStatus): boolean {
  return REPROCESSABLE_STATUSES.has(status);
}

export { isReprocessable };
export type { ProcessingStatus };
