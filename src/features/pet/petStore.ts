import { create } from 'zustand';
import type { PetState } from './animations';

interface PetPosition {
  x: number;
  y: number;
}

interface PetStore {
  petState: PetState;
  position: PetPosition;
  visible: boolean;
  dialogOpen: boolean;

  setPetState: (state: PetState) => void;
  setPosition: (pos: PetPosition) => void;
  setVisible: (visible: boolean) => void;
  setDialogOpen: (open: boolean) => void;
  toggleDialog: () => void;
}

export const usePetStore = create<PetStore>((set) => ({
  petState: 'idle',
  position: { x: 100, y: 100 },
  visible: true,
  dialogOpen: false,

  setPetState: (petState) => set({ petState }),
  setPosition: (position) => set({ position }),
  setVisible: (visible) => set({ visible }),
  setDialogOpen: (dialogOpen) => set({ dialogOpen }),
  toggleDialog: () => set((s) => ({ dialogOpen: !s.dialogOpen })),
}));
