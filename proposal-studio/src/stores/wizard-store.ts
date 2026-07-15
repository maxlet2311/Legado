import { create } from "zustand";

interface WizardState {
  currentStep: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  reset: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  currentStep: 0,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  previousStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),
  reset: () => set({ currentStep: 0 }),
}));
