"use client";

import { useEffect, useRef, type ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { WizardLayout } from "@/components/wizard/wizard-layout";
import { WizardFooter } from "@/components/wizard/wizard-footer";
import { DuplicationReviewBanner } from "@/components/wizard/duplication-review-banner";
import { ReadOnlyProposalBanner } from "@/components/wizard/read-only-proposal-banner";
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
import { clampRequestedStep, computeCompletion } from "@/lib/wizard/step-completion";
import { isStepUnsettled } from "@/lib/wizard/step-unsettled";
import type { WizardData, WizardStepProps } from "@/types/wizard";

const STEPS = [
  { label: "Cliente", description: "Seleccioná un cliente existente o creá uno nuevo sin salir del wizard." },
  { label: "Información", description: "Datos generales del documento." },
  { label: "Diagnóstico", description: "Situación del cliente antes de la propuesta." },
  { label: "Alternativas", description: "Agregá las alternativas financieras que forman parte de la propuesta." },
  { label: "Beneficios", description: "Beneficios concretos que el cliente obtiene con esta propuesta." },
  { label: "Comparativa", description: "Tabla comparativa entre las alternativas, lista para el PDF." },
  { label: "Recomendación", description: "La recomendación profesional que sustenta la propuesta." },
  { label: "Resumen", description: "Revisá el documento completo antes de finalizar." },
];

const COMPARISON_STEP_INDEX = 5;

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

const AUTOSAVE_SETTLE_POLL_MS = 100;
const AUTOSAVE_SETTLE_TIMEOUT_MS = 6_000;

/**
 * Espera a que el autosave del paso actual deje de estar "pending"/"saving"
 * antes de que el wizard cambie de paso. Lee el store directamente
 * (`getState`) en vez de una prop capturada por closure: el polling vive
 * fuera del ciclo de render, así que necesita el valor más nuevo en cada
 * vuelta, no una fotografía del momento en que se llamó a este handler.
 */
async function waitForAutosaveToSettle(): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < AUTOSAVE_SETTLE_TIMEOUT_MS) {
    const current = useWizardStore.getState().stepMeta.autosaveStatus;
    // `isStepUnsettled()` cubre la ventana entre que una acción mutante
    // manual (duplicateItem/confirmRemove/reorder) arranca y que el efecto
    // del componente llega a reflejar "saving" en `stepMeta.autosaveStatus`
    // -- ver step-unsettled.ts.
    if ((current !== "pending" && current !== "saving") && !isStepUnsettled()) return;
    await new Promise((resolve) => setTimeout(resolve, AUTOSAVE_SETTLE_POLL_MS));
  }
}

interface ProposalWizardProps {
  initialData: WizardData;
  availableClients: WizardData["client"][];
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function ProposalWizard({ initialData, availableClients }: ProposalWizardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  function updateStepInUrl(step: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(step));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const requestedRaw = searchParams.get("step");
    const requested = requestedRaw !== null ? Number(requestedRaw) : 0;
    const initialStep = clampRequestedStep(requested, initialData, STEPS.length);
    hydrate(initialData, initialStep);
    if (requestedRaw !== String(initialStep)) {
      updateStepInUrl(initialStep);
    }
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
  const isReadOnly = data.meta.status === "completed";
  const completion = computeCompletion(data);
  const outlineSteps: WizardOutlineStep[] = STEPS.map((step, index) => ({
    label: step.label,
    complete: completion[index] ?? false,
  }));

  // Las tres esperan a que el autosave salga de "pending"/"saving" ANTES de
  // navegar. Se probó primero llamar `stepMeta.saveNow()` y esperar
  // directamente su promesa: la respuesta del server action completa 200 en
  // el servidor (confirmado con logs), pero esa promesa nunca resuelve del
  // lado del cliente cuando se la espera desde este handler (cuelga
  // indefinidamente -- confirmado con tracing, >20s sin resolver). En vez de
  // depender de ese flush forzado (que el propio criterio de Z1 pide NO
  // simular si no se puede garantizar), se deja que el debounce normal de
  // `useAutosave` -- que sí se sabe que persiste de forma confiable, ver
  // use-autosave.ts -- termine solo, y acá simplemente se espera a que
  // `stepMeta.autosaveStatus` deje de estar en vuelo antes de cambiar de
  // paso. Tope de tiempo por si algo queda trabado: mejor navegar con el
  // guard de beforeunload todavía cubriendo el "pending" residual que
  // bloquear la UI para siempre.
  async function handleNext() {
    if (!isReadOnly) await waitForAutosaveToSettle();
    if (isLastStep) {
      router.push(`/proposal/${data!.proposalId}`);
      return;
    }
    nextStep();
    updateStepInUrl(currentStep + 1);
  }

  async function handlePrevious() {
    if (!isReadOnly) await waitForAutosaveToSettle();
    previousStep();
    updateStepInUrl(Math.max(0, currentStep - 1));
  }

  async function handleJump(step: number) {
    if (!isReadOnly) await waitForAutosaveToSettle();
    setStep(step);
    updateStepInUrl(step);
  }

  return (
    <WizardLayout
      outline={<WizardOutline steps={outlineSteps} currentStep={currentStep} onJump={handleJump} />}
      footer={
        <WizardFooter
          onPrevious={currentStep > 0 ? handlePrevious : undefined}
          onNext={handleNext}
          nextLabel={isLastStep ? "Ir a la propuesta" : "Siguiente"}
          nextDisabled={!isReadOnly && !stepMeta.isValid}
          autosaveStatus={isReadOnly ? "idle" : stepMeta.autosaveStatus}
          autosaveError={isReadOnly ? undefined : stepMeta.autosaveError}
          onResolveKeepMine={isReadOnly ? undefined : stepMeta.resolveKeepMine}
          onResolveReload={isReadOnly ? undefined : stepMeta.resolveReload}
          onSaveNow={isReadOnly ? undefined : stepMeta.saveNow}
        />
      }
      preview={<LivePreviewPanel />}
      currentStep={currentStep}
      isComparisonStep={currentStep === COMPARISON_STEP_INDEX}
    >
      <ReadOnlyProposalBanner />
      <DuplicationReviewBanner />
      <div className="mb-6 flex flex-col gap-1 border-b border-outline-variant/60 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold uppercase tracking-wider text-primary">
            Bloque {currentStep + 1} de {STEPS.length}
          </span>
          <span className="text-caption font-medium text-on-surface-variant">
            {Math.round(((currentStep + 1) / STEPS.length) * 100)}% completado
          </span>
        </div>
        <h2 className="font-serif text-h2 font-extrabold tracking-tight text-on-surface">
          {STEPS[currentStep]?.label ?? "Información"}
        </h2>
        {STEPS[currentStep]?.description && (
          <p className="text-small text-on-surface-variant">{STEPS[currentStep]?.description}</p>
        )}
      </div>
      <StepComponent onJumpToStep={setStep} availableClients={availableClients} isReadOnly={isReadOnly} />
    </WizardLayout>
  );
}

export { ProposalWizard };
