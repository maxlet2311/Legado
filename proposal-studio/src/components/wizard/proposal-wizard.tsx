"use client";

import { useEffect, useRef, type ComponentType } from "react";
import { useRouter } from "next/navigation";

import { WizardLayout } from "@/components/wizard/wizard-layout";
import { WizardFooter } from "@/components/wizard/wizard-footer";
import { DuplicationReviewBanner } from "@/components/wizard/duplication-review-banner";
import { LivePreviewPanel } from "@/components/wizard/live-preview-panel";
import { WizardOutline, type WizardOutlineStep } from "@/components/wizard/wizard-outline";
import { StepClient } from "@/components/wizard/steps/step-client";
import { StepInfo } from "@/components/wizard/steps/step-info";
import { StepDiagnosis } from "@/components/wizard/steps/step-diagnosis";
import { StepAlternatives } from "@/components/wizard/steps/step-alternatives";
import { StepRecommendation } from "@/components/wizard/steps/step-recommendation";
import { StepBenefits } from "@/components/wizard/steps/step-benefits";
import { StepComparison } from "@/components/wizard/steps/step-comparison";
import { StepSummary } from "@/components/wizard/steps/step-summary";
import { useWizardStore } from "@/stores/wizard-store";
import { useFocusModeStore } from "@/stores/focus-mode-store";
import type { WizardData, WizardStepProps } from "@/types/wizard";

const STEPS = [
  { label: "Cliente" },
  { label: "Información" },
  { label: "Diagnóstico" },
  { label: "Alternativas" },
  { label: "Beneficios" },
  { label: "Comparativa" },
  { label: "Recomendación" },
  { label: "Resumen" },
];

const STEP_COMPONENTS: ComponentType<WizardStepProps>[] = [
  StepClient,
  StepInfo,
  StepDiagnosis,
  StepAlternatives,
  StepBenefits,
  StepComparison,
  StepRecommendation,
  StepSummary,
];

interface ProposalWizardProps {
  initialData: WizardData;
  availableClients: WizardData["client"][];
}

function computeCompletion(data: WizardData): boolean[] {
  return [
    Boolean(data.client.id),
    Boolean(data.meta.title.trim() && data.meta.product.trim()),
    Boolean(data.narrative.current_situation.trim()),
    data.alternatives.length > 0,
    data.benefits.length > 0,
    data.comparison.columns.length > 0 && data.comparison.rows.length > 0,
    Boolean(data.narrative.recommended_strategy.trim()),
    data.meta.status === "completed",
  ];
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
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
  const undo = useWizardStore((state) => state.undo);
  const redo = useWizardStore((state) => state.redo);
  const toggleFocusMode = useFocusModeStore((state) => state.toggle);
  const disableFocusMode = useFocusModeStore((state) => state.disable);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate(initialData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El modo foco es un flag de UI global (AppShell lo lee); si el asesor
  // navega fuera del wizard con el modo activo, nunca debe quedar el resto
  // de la app sin sidebar/header.
  useEffect(() => disableFocusMode, [disableFocusMode]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (!meta && event.key.toLowerCase() === "f" && !isEditableTarget(event.target)) {
        event.preventDefault();
        toggleFocusMode();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [undo, redo, toggleFocusMode]);

  if (!data) {
    return null;
  }

  const StepComponent = STEP_COMPONENTS[currentStep] ?? STEP_COMPONENTS[0]!;
  const isLastStep = currentStep === STEPS.length - 1;
  const completion = computeCompletion(data);
  const outlineSteps: WizardOutlineStep[] = STEPS.map((step, index) => ({
    label: step.label,
    complete: completion[index] ?? false,
  }));

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

  function handleJump(step: number) {
    stepMeta.saveNow?.();
    setStep(step);
  }

  return (
    <WizardLayout
      outline={<WizardOutline steps={outlineSteps} currentStep={currentStep} onJump={handleJump} />}
      footer={
        <WizardFooter
          onPrevious={currentStep > 0 ? handlePrevious : undefined}
          onNext={handleNext}
          nextLabel={isLastStep ? "Ir a la propuesta" : "Siguiente"}
          nextDisabled={!stepMeta.isValid}
          autosaveStatus={stepMeta.autosaveStatus}
          autosaveError={stepMeta.autosaveError}
          onResolveKeepMine={stepMeta.resolveKeepMine}
          onResolveReload={stepMeta.resolveReload}
          onSaveNow={stepMeta.saveNow}
        />
      }
      preview={<LivePreviewPanel />}
    >
      <DuplicationReviewBanner />
      <StepComponent onJumpToStep={setStep} availableClients={availableClients} />
    </WizardLayout>
  );
}

export { ProposalWizard };
