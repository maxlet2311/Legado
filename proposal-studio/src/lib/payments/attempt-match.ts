/**
 * Decide qué hacer con el resultado de buscar checkout attempts por
 * `provider_checkout_plan_id` (ver `reconciliation.ts`). Pura y sin
 * dependencias de servidor: cero coincidencias es `unmatched` (webhook queda
 * huérfano, disponible para reconciliación administrativa posterior — nunca
 * fallback por email/orden temporal/monto); más de una coincidencia es
 * `conflict` (inconsistencia crítica: nunca se elige arbitrariamente).
 */
type AttemptMatchResult<T> =
  | { outcome: "unmatched" }
  | { outcome: "matched"; attempt: T }
  | { outcome: "conflict"; attempts: T[] };

function resolveAttemptMatch<T>(candidates: T[]): AttemptMatchResult<T> {
  if (candidates.length === 0) return { outcome: "unmatched" };
  if (candidates.length === 1) return { outcome: "matched", attempt: candidates[0] as T };
  return { outcome: "conflict", attempts: candidates };
}

export { resolveAttemptMatch };
export type { AttemptMatchResult };
