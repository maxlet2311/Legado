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
 */
function WizardOutline({ steps, currentStep, onJump }: WizardOutlineProps) {
  const completedCount = steps.filter((step) => step.complete).length;

  return (
    <nav
      aria-label="Bloques de la propuesta"
      className="flex w-full flex-col gap-4 lg:w-64 lg:shrink-0"
    >
      <div>
        <p className="text-caption font-semibold text-on-surface-variant">
          {completedCount} de {steps.length} bloques completos
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-primary transition-all duration-base ease-premium"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          return (
            <li key={step.label}>
              <button
                type="button"
                onClick={() => onJump(index)}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-small font-medium transition-colors duration-fast ease-premium",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-highest",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-caption font-semibold",
                    step.complete
                      ? "border-transparent bg-secondary-container text-on-secondary-container"
                      : isActive
                        ? "border-primary text-primary"
                        : "border-outline-variant",
                  )}
                >
                  {step.complete ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { WizardOutline };
