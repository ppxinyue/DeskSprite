import { create } from 'zustand';
import type { PetState } from './animations';

interface PetPosition {
  x: number;
  y: number;
}

export interface PetImageConfig {
  idle: string | null;
  happy: string | null;
  thinking: string | null;
  sleeping: string | null;
  dragging: string | null;
}

interface PetStore {
  petState: PetState;
  position: PetPosition;
  visible: boolean;
  dialogOpen: boolean;
  petImages: PetImageConfig;

  setPetState: (state: PetState) => void;
  setPosition: (pos: PetPosition) => void;
  setVisible: (visible: boolean) => void;
  setDialogOpen: (open: boolean) => void;
  toggleDialog: () => void;
  setPetImage: (state: PetState, path: string | null) => void;
  setPetImages: (images: PetImageConfig) => void;
  clearPetImages: () => void;
}

export const usePetStore = create<PetStore>((set) => ({
  petState: 'idle',
  position: { x: 100, y: 100 },
  visible: true,
  dialogOpen: false,
  petImages: {
    idle: null,
    happy: null,
    thinking: null,
    sleeping: null,
    dragging: null,
  },

  setPetState: (petState) => set({ petState }),
  setPosition: (position) => set({ position }),
  setVisible: (visible) => set({ visible }),
  setDialogOpen: (dialogOpen) => set({ dialogOpen }),
  toggleDialog: () => set((s) => ({ dialogOpen: !s.dialogOpen })),

  setPetImage: (state, path) =>
    set((s) => ({
      petImages: { ...s.petImages, [state]: path },
    })),

  setPetImages: (images) => set({ petImages: images }),

  clearPetImages: () =>
    set({
      petImages: {
        idle: null,
        happy: null,
        thinking: null,
        sleeping: null,
        dragging: null,
      },
    }),
}));
