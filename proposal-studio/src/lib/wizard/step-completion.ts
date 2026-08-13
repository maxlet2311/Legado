import type { WizardData } from "@/types/wizard";

/** Un índice por paso del wizard, en el mismo orden que STEPS en proposal-wizard.tsx. */
function computeCompletion(data: WizardData): boolean[] {
  return [
    Boolean(data.client.id),
    Boolean(data.meta.title.trim() && data.meta.product.trim()),
    Boolean(data.narrative.current_situation.trim()),
    data.alternatives.length > 0,
    data.benefits.length > 0,
    data.comparison.columns.length > 0 && data.comparison.rows.length > 0,
    Boolean(data.narrative.recommended_strategy.trim()),
    data.meta.status === "completed",
  ];
}

/**
 * Paso máximo alcanzable sin quedar "atrapado": el primer paso incompleto
 * (para poder completarlo), o el último si ya está todo completo. Se usa
 * para clampear un `?step=` de la URL que puede venir desactualizado o
 * manipulado manualmente.
 */
function computeMaxReachableStep(completion: boolean[]): number {
  const firstIncomplete = completion.findIndex((done) => !done);
  return firstIncomplete === -1 ? completion.length - 1 : firstIncomplete;
}

/** Clampea un paso solicitado (típicamente desde la URL) a un rango válido y alcanzable. */
function clampRequestedStep(requested: number, data: WizardData, stepCount: number): number {
  const maxStep = computeMaxReachableStep(computeCompletion(data));
  if (!Number.isInteger(requested)) return 0;
  return Math.min(Math.max(requested, 0), maxStep, stepCount - 1);
}

export { computeCompletion, computeMaxReachableStep, clampRequestedStep };
