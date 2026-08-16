"use client";

import { CheckCircle2, AlertTriangle, Circle } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { Finding } from "@/lib/wizard/pre-summary-checks";

const STEP_LABELS = [
  "Cliente",
  "Información",
  "Diagnóstico",
  "Alternativas",
  "Beneficios",
  "Comparativa",
  "Recomendación",
  "Resumen",
];

interface StepStatusOverviewProps {
  /** `computeCompletion(data)` (lib/wizard/step-completion.ts) — misma lógica certificada que ya clampea la navegación del wizard. */
  completion: boolean[];
  findings: Finding[];
  onJumpToStep: (step: number) => void;
}

/**
 * Estado de los 8 bloques reales (Stitch North Star, "Resumen y Validación"):
 * no inventa datos nuevos, solo reorganiza `completion`/`findings` — ambos ya
 * certificados y usados por la navegación y el checklist existentes — en una
 * vista de una fila por bloque.
 */
function StepStatusOverview({ completion, findings, onJumpToStep }: StepStatusOverviewProps) {
  const currentIndex = STEP_LABELS.length - 1;
  const incompleteCount = completion.slice(0, currentIndex).filter((done) => !done).length;
  const attentionSteps = new Set(findings.filter((f) => f.severity === "warning").map((f) => f.step));
  const attentionCount = [...attentionSteps].filter((step) => completion[step]).length;

  const bannerCopy =
    incompleteCount > 0
      ? `La propuesta requiere tu atención. Hay ${incompleteCount} sección${incompleteCount === 1 ? "" : "es"} incompleta${incompleteCount === 1 ? "" : "s"}${
          attentionCount > 0
            ? ` y ${attentionCount} que requiere${attentionCount === 1 ? "" : "n"} revisión`
            : ""
        }.`
      : attentionCount > 0
        ? `Todas las secciones están completas. Hay ${attentionCount} que conviene revisar antes de presentar.`
        : "Todas las secciones están completas y listas para presentar.";

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg border p-5",
          incompleteCount > 0 ? "border-error/30 bg-error-container/40" : "border-outline-variant bg-surface-container-low",
        )}
      >
        <p className="font-serif text-h4 font-bold text-on-surface">¿Está lista esta propuesta para presentar?</p>
        <p className="mt-1 text-small text-on-surface-variant">{bannerCopy}</p>
      </div>

      <ul className="divide-y divide-outline-variant/60 rounded-lg border border-outline-variant/60">
        {STEP_LABELS.map((label, index) => {
          const isCurrent = index === currentIndex;
          const done = completion[index];
          const hasWarning = attentionSteps.has(index) && done;

          const status = isCurrent
            ? { Icon: Circle, text: "Bloque actual", tone: "text-on-surface-variant" }
            : !done
              ? { Icon: Circle, text: "Incompleto", tone: "text-on-surface-variant" }
              : hasWarning
                ? { Icon: AlertTriangle, text: "Requiere revisión", tone: "text-warning" }
                : { Icon: CheckCircle2, text: "Completado", tone: "text-success" };

          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => (!isCurrent ? onJumpToStep(index) : undefined)}
                disabled={isCurrent}
                className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default hover:enabled:bg-surface-container-low"
              >
                <status.Icon className={cn("h-4 w-4 shrink-0", status.tone)} />
                <span className="flex-1">
                  <span className="font-semibold text-on-surface">
                    {index + 1}. {label}
                  </span>
                  <span className={cn("ml-2 text-caption", status.tone)}>{status.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { StepStatusOverview };
