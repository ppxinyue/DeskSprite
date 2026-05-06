import { create } from 'zustand';
import type { PetState, PetMediaConfig, PetStateMediaConfig } from './animations';
import { DEFAULT_MEDIA_CONFIG } from './animations';

interface PetStore {
  petState: PetState;
  position: { x: number; y: number };
  visible: boolean;
  dialogOpen: boolean;
  chatMode: 'new' | 'history';
  chatConversationId: number | null;
  mediaConfig: PetMediaConfig;

  setPetState: (state: PetState) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setVisible: (v: boolean) => void;
  setDialogOpen: (v: boolean) => void;
  openChat: (mode: 'new' | 'history', conversationId?: number | null) => void;
  closeChat: () => void;
  toggleDialog: () => void;
  setStateMediaConfig: (state: PetState, config: PetStateMediaConfig) => void;
  resetMediaConfig: () => void;
}

export const usePetStore = create<PetStore>((set) => ({
  petState: 'idle',
  position: { x: 100, y: 100 },
  visible: true,
  dialogOpen: false,
  chatMode: 'new',
  chatConversationId: null,
  mediaConfig: DEFAULT_MEDIA_CONFIG,

  setPetState: (petState) => set({ petState }),
  setPosition: (position) => set({ position }),
  setVisible: (visible) => set({ visible }),
  setDialogOpen: (dialogOpen) => set({ dialogOpen }),
  openChat: (chatMode, chatConversationId = null) => set({ dialogOpen: true, chatMode, chatConversationId }),
  closeChat: () => set({ dialogOpen: false, chatConversationId: null }),
  toggleDialog: () => set((s) => ({ dialogOpen: !s.dialogOpen })),
  setStateMediaConfig: (state, config) =>
    set((s) => ({ mediaConfig: { ...s.mediaConfig, [state]: config } })),
  resetMediaConfig: () => set({ mediaConfig: DEFAULT_MEDIA_CONFIG }),
}));
