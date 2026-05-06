import { create } from 'zustand';
import type { PetState, PetMediaConfig, PetStateMediaConfig } from './animations';
import { DEFAULT_MEDIA_CONFIG } from './animations';

interface PetStore {
  petState: PetState;
  position: { x: number; y: number };
  visible: boolean;
  dialogOpen: boolean;
  mediaConfig: PetMediaConfig;

  setPetState: (state: PetState) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setVisible: (visible: boolean) => void;
  setDialogOpen: (open: boolean) => void;
  toggleDialog: () => void;
  setStateMediaConfig: (state: PetState, config: PetStateMediaConfig) => void;
  resetMediaConfig: () => void;
}

export const usePetStore = create<PetStore>((set) => ({
  petState: 'idle',
  position: { x: 100, y: 100 },
  visible: true,
  dialogOpen: false,
  mediaConfig: DEFAULT_MEDIA_CONFIG,

  setPetState: (petState) => set({ petState }),
  setPosition: (position) => set({ position }),
  setVisible: (visible) => set({ visible }),
  setDialogOpen: (dialogOpen) => set({ dialogOpen }),
  toggleDialog: () => set((s) => ({ dialogOpen: !s.dialogOpen })),
  setStateMediaConfig: (state, config) =>
    set((s) => ({ mediaConfig: { ...s.mediaConfig, [state]: config } })),
  resetMediaConfig: () => set({ mediaConfig: DEFAULT_MEDIA_CONFIG }),
}));
