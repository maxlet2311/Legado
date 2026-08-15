import type { AutosaveStatus } from "@/types/wizard";

/**
 * Agrega el estado de autosave de una lista de ítems editables (Alternativas,
 * Beneficios) a partir del set de claves con una edición pendiente/en vuelo.
 *
 * Causa raíz del P0 de pérdida de datos: `StepAlternatives`/`StepBenefits`
 * exponían `stepMeta.autosaveStatus` fijo en "idle", así que
 * `waitForAutosaveToSettle` (proposal-wizard.tsx) nunca esperaba el debounce
 * de cada ítem antes de cambiar de paso -- el ítem se desmontaba (cancelando
 * su `setTimeout` pendiente) antes de que el guardado llegara a dispararse.
 * Esta función es la pieza que debe reflejar el estado real.
 */
function deriveListAutosaveStatus(busyKeys: ReadonlySet<string>): AutosaveStatus {
  return busyKeys.size > 0 ? "pending" : "idle";
}

export { deriveListAutosaveStatus };
