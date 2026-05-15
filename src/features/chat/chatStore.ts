import { create } from 'zustand';
import type { Message } from '@/features/ai/types';

export interface ChatMessage extends Message {
  id: string;
  timestamp: number;
  imageUrl?: string;
  imageDataUrl?: string;
  tone?: 'default' | 'error';
}

interface ChatState {
  messages: ChatMessage[];
  currentConversationId: number | null;
  isStreaming: boolean;
  streamingContent: string;

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistant: (content: string) => void;
  setCurrentConversationId: (id: number | null) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (token: string) => void;
  clearMessages: () => void;
}

let msgCounter = 0;

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  currentConversationId: null,
  isStreaming: false,
  streamingContent: '',

  setMessages: (messages) => set({ messages }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateLastAssistant: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content };
          break;
        }
      }
      return { messages: msgs };
    }),

  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (token) =>
    set((state) => ({ streamingContent: state.streamingContent + token })),

  clearMessages: () =>
    set({ messages: [], currentConversationId: null, streamingContent: '' }),
}));

export function createMessage(role: Message['role'], content: string, extras: Partial<Pick<ChatMessage, 'imageUrl' | 'imageDataUrl' | 'tone'>> = {}): ChatMessage {
  return {
    id: `msg-${Date.now()}-${++msgCounter}`,
    role,
    content,
    timestamp: Date.now(),
    ...extras,
  };
}
