import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface WizardStep {
  label: string;
}

export interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
}

/**
 * Mismo lenguaje visual que WizardOutline (auditoría estructural): línea de
 * proceso horizontal con círculos numerados/check conectados, en vez de la
 * fila de pills "Paso X de Y" + barra de progreso que tenía antes -- esta
 * vista de precreación (`/proposals/new`, sin bloques ni preview que
 * mostrar/ocultar) no necesita su propio componente ni su propia
 * navegación por clic, así que no reutiliza WizardOutline directamente
 * (evita el límite de pasar `onJump` desde un Server Component), pero
 * replica su composición para que el asesor vea un único stepper en toda
 * la app, no dos.
 */
function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  const completedCount = steps.filter((_, index) => index < currentStep).length;

  return (
    <nav aria-label="Bloques de la propuesta" className="w-full">
      <p className="mb-3 text-caption font-semibold text-on-surface-variant">
        {completedCount} de {steps.length} bloques completos
      </p>
      <ol className="flex items-start gap-0 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isActive = index === currentStep;
          const isLast = index === steps.length - 1;
          return (
            <li key={step.label} className={cn("flex items-center", !isLast && "flex-1")}>
              <div className="flex shrink-0 flex-col items-center gap-1.5 px-1.5 text-center">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-caption font-semibold",
                    isComplete
                      ? "border-transparent bg-secondary-container text-on-secondary-container"
                      : isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant text-on-surface-variant",
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-caption font-medium",
                    isActive ? "text-primary" : "text-on-surface-variant",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn("mx-1 h-px min-w-6 flex-1", isComplete ? "bg-secondary-container" : "bg-outline-variant")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { WizardStepper };
