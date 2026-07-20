type DraftApplyMode = "replace" | "confirm";

/**
 * Decide qué hacer con un borrador de IA sin sobrescribir nada en silencio:
 * si el campo ya tiene texto, la UI SIEMPRE debe pedir confirmación
 * (reemplazar/insertar debajo/descartar) antes de tocar el contenido.
 */
function decideNarrativeDraftMode(currentText: string): DraftApplyMode {
  return currentText.trim().length > 0 ? "confirm" : "replace";
}

export { decideNarrativeDraftMode };
export type { DraftApplyMode };
