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
      <p className="mb-3 text-caption font-semibold text-on-surface-variant">
        {completedCount} de {steps.length} bloques completos
      </p>
      <ol className="flex items-start gap-0 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isLast = index === steps.length - 1;
          return (
            <li key={step.label} className={cn("flex items-center", !isLast && "flex-1")}>
              <button
                type="button"
                onClick={() => onJump(index)}
                aria-current={isActive ? "step" : undefined}
                className="flex shrink-0 flex-col items-center gap-1.5 px-1.5 text-center"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-caption font-semibold transition-colors duration-fast ease-premium",
                    step.complete
                      ? "border-transparent bg-secondary-container text-on-secondary-container"
                      : isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant text-on-surface-variant",
                  )}
                >
                  {step.complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-caption font-medium",
                    isActive ? "text-primary" : "text-on-surface-variant",
                  )}
                >
                  {step.label}
                </span>
              </button>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1 h-px min-w-6 flex-1",
                    step.complete ? "bg-secondary-container" : "bg-outline-variant",
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
