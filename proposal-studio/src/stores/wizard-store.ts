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
const HISTORY_LIMIT = 20;

interface HistoryState {
  past: WizardData[];
  future: WizardData[];
}

const EMPTY_HISTORY: HistoryState = { past: [], future: [] };

interface WizardState {
  data: WizardData | null;
  currentStep: number;
  stepMeta: StepMeta;
  history: HistoryState;
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
  /**
   * Deshacer/rehacer local (nunca toca backend/autosave/versionado): guarda
   * un snapshot de `data` antes de cambios estructurales (agregar/duplicar/
   * borrar/reordenar un ítem). Deliberadamente no se llama en cada
   * keystroke de texto -- el undo nativo del campo ya cubre eso, y meter
   * cada tecla acá competiría con él en vez de complementarlo.
   */
  pushHistorySnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  data: null,
  currentStep: 0,
  stepMeta: DEFAULT_STEP_META,
  history: EMPTY_HISTORY,
  hydrate: (data) => set({ data, currentStep: 0, stepMeta: DEFAULT_STEP_META, history: EMPTY_HISTORY }),
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
  pushHistorySnapshot: () =>
    set((state) =>
      state.data
        ? {
            history: {
              past: [...state.history.past.slice(-(HISTORY_LIMIT - 1)), state.data],
              future: [],
            },
          }
        : state,
    ),
  undo: () =>
    set((state) => {
      const { past, future } = state.history;
      const previous = past[past.length - 1];
      if (!previous || !state.data) return state;
      return {
        data: previous,
        history: { past: past.slice(0, -1), future: [state.data, ...future].slice(0, HISTORY_LIMIT) },
      };
    }),
  redo: () =>
    set((state) => {
      const { past, future } = state.history;
      const next = future[0];
      if (!next || !state.data) return state;
      return {
        data: next,
        history: { past: [...past, state.data].slice(-HISTORY_LIMIT), future: future.slice(1) },
      };
    }),
}));
