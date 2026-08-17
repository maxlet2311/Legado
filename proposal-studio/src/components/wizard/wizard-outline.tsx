"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface WizardOutlineStep {
  label: string;
  complete: boolean;
}

interface WizardOutlineProps {
  steps: WizardOutlineStep[];
  currentStep: number;
  onJump: (step: number) => void;
}

/**
 * Navegación libre (auditoría del editor, 3.1): reemplaza el stepper de solo
 * lectura por un panel siempre clickeable. No reemplaza la validación del
 * paso actual -- "Siguiente" sigue bloqueado por `stepMeta.isValid` en
 * proposal-wizard.tsx -- pero saltar hacia cualquier otro bloque, completo o
 * no, ya no exige pasar por los intermedios.
 *
 * Línea de proceso horizontal (en vez de una lista vertical de 8 bloques
 * ocupando una columna entera): mismo dato, misma navegación libre, mucho
 * menos ancho consumido -- el editor y el preview ganan el espacio que antes
 * se iba en el rail lateral.
 */
function WizardOutline({ steps, currentStep, onJump }: WizardOutlineProps) {
  const completedCount = steps.filter((step) => step.complete).length;

  return (
    <nav aria-label="Bloques de la propuesta" className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
          Bloques de la Propuesta
        </p>
        <span className="text-[11px] font-medium text-primary">
          {completedCount} de {steps.length} completos
        </span>
      </div>
      <ol className="flex items-start gap-0 overflow-x-auto pb-1 scrollbar-none">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isLast = index === steps.length - 1;
          return (
            <li key={step.label} className={cn("flex items-center", !isLast && "flex-1")}>
              <button
                type="button"
                onClick={() => onJump(index)}
                aria-current={isActive ? "step" : undefined}
                className="flex shrink-0 flex-col items-center gap-1.5 px-1 text-center group cursor-pointer"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-caption font-semibold transition-all duration-fast ease-premium shadow-2xs",
                    step.complete
                      ? "border-secondary bg-secondary text-on-secondary"
                      : isActive
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-fine bg-surface text-on-surface-variant group-hover:border-primary/40",
                  )}
                >
                  {step.complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-[11px] font-medium transition-colors",
                    isActive
                      ? "text-primary font-semibold"
                      : step.complete
                        ? "text-on-surface"
                        : "text-on-surface-variant group-hover:text-on-surface",
                  )}
                >
                  {step.label}
                </span>
              </button>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1 h-px min-w-4 sm:min-w-6 flex-1 transition-colors",
                    step.complete ? "bg-secondary/40" : "bg-border-fine",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { WizardOutline };
