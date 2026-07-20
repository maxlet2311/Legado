import type { WizardData } from "@/types/wizard";

type Severity = "error" | "warning";

interface Finding {
  severity: Severity;
  message: string;
  /** Índice de paso del wizard al que saltar (0-based, ver STEPS en proposal-wizard.tsx). */
  step: number;
}

/**
 * Checklist previo a Resumen: solo reglas determinísticas (nada de IA acá --
 * lo semántico, como nombres heredados, vive en `semantic-review-action.ts`).
 * No bloquea nada por sí solo: la UI decide qué hacer con `severity`.
 */
function runDeterministicChecks(data: WizardData): Finding[] {
  const findings: Finding[] = [];

  data.alternatives.forEach((alternative, index) => {
    if (!alternative.title.trim()) {
      findings.push({ severity: "error", message: `Alternativa #${index + 1} sin título.`, step: 3 });
    }
    if (!alternative.insurance_company.trim() || !alternative.product_name.trim()) {
      findings.push({
        severity: "error",
        message: `"${alternative.title || `Alternativa #${index + 1}`}" no tiene compañía/producto cargados.`,
        step: 3,
      });
    }
  });

  data.benefits.forEach((benefit, index) => {
    if (!benefit.description.trim() || !benefit.icon.trim()) {
      findings.push({
        severity: "warning",
        message: `"${benefit.title || `Beneficio #${index + 1}`}" está incompleto (falta descripción o ícono).`,
        step: 4,
      });
    }
  });

  if (!data.narrative.recommended_strategy.trim()) {
    findings.push({ severity: "error", message: "La recomendación está vacía.", step: 6 });
  }

  const { columns, rows } = data.comparison;
  if ((columns.length > 0) !== (rows.length > 0)) {
    findings.push({
      severity: "warning",
      message: "La comparativa tiene columnas sin filas (o filas sin columnas).",
      step: 5,
    });
  }

  if (data.alternatives.length > 1 && !data.alternatives.some((a) => a.description.toLowerCase().includes("recomend"))) {
    // Heurística objetiva y barata: no hay forma determinística de saber cuál
    // alternativa es "la recomendada" salvo que el asesor lo mencione en el
    // texto -- por eso es warning, no error.
    findings.push({
      severity: "warning",
      message: "Con más de una alternativa cargada, asegurate de que la recomendación deje clara cuál es la sugerida.",
      step: 6,
    });
  }

  return findings;
}

export { runDeterministicChecks };
export type { Finding, Severity };
