import { create } from "zustand";

interface FocusModeState {
  active: boolean;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
}

/**
 * Estado puramente de UI (nunca persistido, nunca tocado por el backend):
 * oculta el chrome del shell (sidebar, top nav) mientras se edita un bloque
 * del wizard. Vive fuera del wizard-store porque lo consume `AppShell`, que
 * envuelve toda la app y no conoce nada del wizard.
 */
export const useFocusModeStore = create<FocusModeState>((set) => ({
  active: false,
  enable: () => set({ active: true }),
  disable: () => set({ active: false }),
  toggle: () => set((state) => ({ active: !state.active })),
}));
