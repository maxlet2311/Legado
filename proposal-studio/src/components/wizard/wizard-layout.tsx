import type { ReactNode } from "react";

import { WizardStepper, type WizardStep } from "@/components/layout/wizard-stepper";

interface WizardLayoutProps {
  steps: WizardStep[];
  currentStep: number;
  children: ReactNode;
  footer: ReactNode;
}

function WizardLayout({ steps, currentStep, children, footer }: WizardLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <div className="border-b border-outline-variant bg-surface px-4 pb-6 pt-4 sm:px-8">
        <WizardStepper steps={steps} currentStep={currentStep} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-240">{children}</div>
      </div>
      <div className="sticky bottom-0 border-t border-outline-variant bg-surface px-4 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-240 items-center justify-between gap-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

export { WizardLayout };
