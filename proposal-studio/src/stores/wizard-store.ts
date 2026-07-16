import { create } from "zustand";

import type {
  AutosaveStatus,
  WizardAlternative,
  WizardBenefit,
  WizardClient,
  WizardComparison,
  WizardData,
  WizardNarrative,
  WizardProposalMeta,
} from "@/types/wizard";

interface StepMeta {
  isValid: boolean;
  autosaveStatus: AutosaveStatus;
  autosaveError?: string;
  saveNow?: () => void;
  /** Solo presentes cuando autosaveStatus === "conflict" (ver hooks/use-autosave.ts). */
  conflictRevision?: number | null;
  resolveKeepMine?: () => void;
  resolveReload?: () => void;
}

const DEFAULT_STEP_META: StepMeta = { isValid: true, autosaveStatus: "idle" };

interface WizardState {
  data: WizardData | null;
  currentStep: number;
  stepMeta: StepMeta;
  hydrate: (data: WizardData) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  reset: () => void;
  setStepMeta: (meta: Partial<StepMeta>) => void;
  setClient: (client: WizardClient) => void;
  setMeta: (meta: Partial<WizardProposalMeta>) => void;
  setNarrative: (narrative: Partial<WizardNarrative>) => void;
  setAlternatives: (alternatives: WizardAlternative[]) => void;
  setBenefits: (benefits: WizardBenefit[]) => void;
  setComparison: (comparison: Partial<WizardComparison>) => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  data: null,
  currentStep: 0,
  stepMeta: DEFAULT_STEP_META,
  hydrate: (data) => set({ data, currentStep: 0, stepMeta: DEFAULT_STEP_META }),
  setStep: (step) => set({ currentStep: step, stepMeta: DEFAULT_STEP_META }),
  nextStep: () =>
    set((state) => ({ currentStep: state.currentStep + 1, stepMeta: DEFAULT_STEP_META })),
  previousStep: () =>
    set((state) => ({
      currentStep: Math.max(0, state.currentStep - 1),
      stepMeta: DEFAULT_STEP_META,
    })),
  reset: () => set({ data: null, currentStep: 0, stepMeta: DEFAULT_STEP_META }),
  setStepMeta: (meta) => set((state) => ({ stepMeta: { ...state.stepMeta, ...meta } })),
  setClient: (client) =>
    set((state) => (state.data ? { data: { ...state.data, client } } : state)),
  setMeta: (meta) =>
    set((state) =>
      state.data ? { data: { ...state.data, meta: { ...state.data.meta, ...meta } } } : state,
    ),
  setNarrative: (narrative) =>
    set((state) =>
      state.data
        ? { data: { ...state.data, narrative: { ...state.data.narrative, ...narrative } } }
        : state,
    ),
  setAlternatives: (alternatives) =>
    set((state) => (state.data ? { data: { ...state.data, alternatives } } : state)),
  setBenefits: (benefits) =>
    set((state) => (state.data ? { data: { ...state.data, benefits } } : state)),
  setComparison: (comparison) =>
    set((state) =>
      state.data
        ? { data: { ...state.data, comparison: { ...state.data.comparison, ...comparison } } }
        : state,
    ),
}));
