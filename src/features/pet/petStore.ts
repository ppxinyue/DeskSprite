import { create } from 'zustand';
import type { PetState, PetMediaConfig, PetStateMediaConfig } from './animations';
import { DEFAULT_MEDIA_CONFIG, isGifAsset } from './animations';

interface PetStore {
  petState: PetState;
  position: { x: number; y: number };
  visible: boolean;
  dialogOpen: boolean;
  chatMode: 'new' | 'history';
  chatConversationId: number | null;
  mediaConfig: PetMediaConfig;
  userFrames: {
    idle: string[];
    thinking: string[];
    sleeping: string[];
  };
  userGifs: {
    idle: string[];
    thinking: string[];
    sleeping: string[];
  };

  setPetState: (state: PetState) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setVisible: (v: boolean) => void;
  setDialogOpen: (v: boolean) => void;
  openChat: (mode: 'new' | 'history', conversationId?: number | null) => void;
  closeChat: () => void;
  toggleDialog: () => void;
  setStateMediaConfig: (state: PetState, config: PetStateMediaConfig) => void;
  resetMediaConfig: () => void;
  loadUserFrames: () => Promise<void>;
  addUserFrame: (state: PetState, path: string) => void;
  addUserGif: (state: PetState, path: string) => void;
  removeUserFrame: (state: PetState, path: string) => void;
  removeUserGif: (state: PetState, path: string) => void;
}

export const usePetStore = create<PetStore>((set) => ({
  petState: 'idle',
  position: { x: 100, y: 100 },
  visible: true,
  dialogOpen: false,
  chatMode: 'new',
  chatConversationId: null,
  mediaConfig: DEFAULT_MEDIA_CONFIG,
  userFrames: {
    idle: [],
    thinking: [],
    sleeping: [],
  },
  userGifs: {
    idle: [],
    thinking: [],
    sleeping: [],
  },

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
  loadUserFrames: async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    const states: PetState[] = ['idle', 'thinking', 'sleeping'];
    const results = await Promise.allSettled(
      states.map(async (state) => {
        try {
          const paths = await invoke<string[]>('list_pet_images', { state });
          return { state, paths };
        } catch {
          return { state, paths: [] };
        }
      })
    );
    const userFrames: Record<PetState, string[]> = { idle: [], thinking: [], sleeping: [] };
    const userGifs: Record<PetState, string[]> = { idle: [], thinking: [], sleeping: [] };
    for (const result of results) {
      if (result.status === 'fulfilled') {
        userFrames[result.value.state] = result.value.paths.filter((path) => !isGifAsset(path));
        userGifs[result.value.state] = result.value.paths.filter(isGifAsset);
      }
    }
    set({ userFrames, userGifs });
  },
  addUserFrame: (state, path) =>
    set((s) => ({
      userFrames: {
        ...s.userFrames,
        [state]: [...s.userFrames[state], path],
      },
    })),
  addUserGif: (state, path) =>
    set((s) => ({
      userGifs: {
        ...s.userGifs,
        [state]: [...s.userGifs[state], path],
      },
    })),
  removeUserFrame: (state, path) =>
    set((s) => ({
      userFrames: {
        ...s.userFrames,
        [state]: s.userFrames[state].filter((p) => p !== path),
      },
    })),
  removeUserGif: (state, path) =>
    set((s) => ({
      userGifs: {
        ...s.userGifs,
        [state]: s.userGifs[state].filter((p) => p !== path),
      },
    })),
}));
