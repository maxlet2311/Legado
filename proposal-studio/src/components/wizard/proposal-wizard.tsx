"use client";

import { useEffect, useRef, type ComponentType } from "react";
import { useRouter } from "next/navigation";

import { WizardLayout } from "@/components/wizard/wizard-layout";
import { WizardFooter } from "@/components/wizard/wizard-footer";
import { StepClient } from "@/components/wizard/steps/step-client";
import { StepInfo } from "@/components/wizard/steps/step-info";
import { StepDiagnosis } from "@/components/wizard/steps/step-diagnosis";
import { StepAlternatives } from "@/components/wizard/steps/step-alternatives";
import { StepRecommendation } from "@/components/wizard/steps/step-recommendation";
import { StepBenefits } from "@/components/wizard/steps/step-benefits";
import { StepComparison } from "@/components/wizard/steps/step-comparison";
import { StepSummary } from "@/components/wizard/steps/step-summary";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardData, WizardStepProps } from "@/types/wizard";

const STEPS = [
  { label: "Cliente" },
  { label: "Información" },
  { label: "Diagnóstico" },
  { label: "Alternativas" },
  { label: "Recomendación" },
  { label: "Beneficios" },
  { label: "Comparativa" },
  { label: "Resumen" },
];

const STEP_COMPONENTS: ComponentType<WizardStepProps>[] = [
  StepClient,
  StepInfo,
  StepDiagnosis,
  StepAlternatives,
  StepRecommendation,
  StepBenefits,
  StepComparison,
  StepSummary,
];

interface ProposalWizardProps {
  initialData: WizardData;
  availableClients: WizardData["client"][];
}

function ProposalWizard({ initialData, availableClients }: ProposalWizardProps) {
  const router = useRouter();
  const data = useWizardStore((state) => state.data);
  const currentStep = useWizardStore((state) => state.currentStep);
  const stepMeta = useWizardStore((state) => state.stepMeta);
  const hydrate = useWizardStore((state) => state.hydrate);
  const setStep = useWizardStore((state) => state.setStep);
  const nextStep = useWizardStore((state) => state.nextStep);
  const previousStep = useWizardStore((state) => state.previousStep);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate(initialData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return null;
  }

  const StepComponent = STEP_COMPONENTS[currentStep] ?? STEP_COMPONENTS[0]!;
  const isLastStep = currentStep === STEPS.length - 1;

  function handleNext() {
    stepMeta.saveNow?.();
    if (isLastStep) {
      router.push(`/proposal/${data!.proposalId}`);
      return;
    }
    nextStep();
  }

  function handlePrevious() {
    stepMeta.saveNow?.();
    previousStep();
  }

  return (
    <WizardLayout
      steps={STEPS}
      currentStep={currentStep}
      footer={
        <WizardFooter
          onPrevious={currentStep > 0 ? handlePrevious : undefined}
          onNext={handleNext}
          nextLabel={isLastStep ? "Ir a la propuesta" : "Siguiente"}
          nextDisabled={!stepMeta.isValid}
          autosaveStatus={stepMeta.autosaveStatus}
          autosaveError={stepMeta.autosaveError}
        />
      }
    >
      <StepComponent onJumpToStep={setStep} availableClients={availableClients} />
    </WizardLayout>
  );
}

export { ProposalWizard };
