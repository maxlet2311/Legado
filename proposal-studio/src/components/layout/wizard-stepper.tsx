import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface WizardStep {
  label: string;
}

export interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
}

function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  const percentage = steps.length > 1 ? Math.round((currentStep / (steps.length - 1)) * 100) : 0;

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-small font-semibold text-on-surface-variant">
          Paso {currentStep + 1} de {steps.length} · {steps[currentStep]?.label}
        </p>
        <p className="text-small font-semibold text-primary">{percentage}%</p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-full rounded-full bg-primary transition-all duration-base ease-premium"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <ol className="mt-6 flex flex-wrap gap-3">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isActive = index === currentStep;
          return (
            <li
              key={step.label}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-caption font-semibold transition-colors duration-fast ease-premium",
                isActive && "border-primary bg-primary/5 text-primary",
                isComplete && "border-transparent bg-secondary-container text-on-secondary-container",
                !isActive && !isComplete && "border-outline-variant text-on-surface-variant",
              )}
            >
              {isComplete ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center">{index + 1}</span>
              )}
              {step.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export { WizardStepper };
