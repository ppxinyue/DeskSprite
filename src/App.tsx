import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { currentMonitor, getCurrentWindow, LogicalPosition, LogicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import { Check, MessageCircle, Minus, Maximize2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PetAvatar } from "@/features/pet/PetAvatar";
import { Composer, MessageBubble } from "@/features/chat/ChatPrimitives";
import { usePetStore } from "@/features/pet/petStore";
import { useSettingsStore, type AppSettings, type CodingProvider } from "@/features/settings/settingsStore";
import { createConversation, getConversations, getMessages, getSetting, insertMessage, recordCodingModeTime, recordDistraction, recordFocusSession, upsertTimelineEntry } from "@/lib/db";
import { TimelineRecorder, type TimelineRecorderState, type TimelineSnapshot } from "@/lib/timelineRecorder";
import { installDocumentTranslator } from "@/i18n";
import type { ChatMessage } from "@/features/chat/chatStore";
import { ALL_PET_STATES, DEFAULT_MEDIA_CONFIG, getPetFrameSources, isGifAsset, normalizePetMediaConfig } from "@/features/pet/animations";
import "./index.css";

const SettingsPanel = lazy(() => import("@/features/settings/SettingsPanel").then((mod) => ({ default: mod.SettingsPanel })));
const ChatDialog = lazy(() => import("@/features/chat/ChatDialog").then((mod) => ({ default: mod.ChatDialog })));

const CHAT_HANDOFF_KEY = "desksprite:chat-handoff-conversation-id";
const COMPACT_CHAT_KEY = "desksprite:compact-chat";
const COMPACT_CHAT_DISMISSED_KEY = "desksprite:compact-chat-dismissed";
const CODING_CONVERSATION_KEY = "desksprite:coding-conversation-id";
const CODING_SAVED_MESSAGES_KEY = "desksprite:coding-saved-message-ids";
const TIMELINE_RECORDER_STATE_KEY = "desksprite:timeline-recorder-state";
const SCREEN_MARGIN = 16;
const PET_CONTENT_MARGIN = 20;
const MIN_DIALOG_WIDTH = 200;
const MIN_DIALOG_HEIGHT = 90;
const COMPACT_CHAT_SIDE_CHROME = 10;
const COMPACT_CHAT_TOP_CHROME = 20;
const COMPACT_CHAT_BOTTOM_CHROME = 10;
const COMPACT_CHAT_PREFERRED_HEIGHT = 340;
const CONTEXT_MENU_WIDTH = 136;
const CONTEXT_SUBMENU_WIDTH = 190;
const CONTEXT_MENU_HEIGHT = 312;
const PET_RIGHT_EDGE_MENU_THRESHOLD = 0.62;
const PET_BUBBLE_TOP_SPACE = 78;
const PET_PROMPT_BUBBLE_WIDTH = 196;
const REST_PRESENTATION_SCREEN_RATIO = 0.8;
const REST_PRESENTATION_ANIMATION_MS = 820;
const REST_COUNTDOWN_SPACE = 58;
const ORB_REST_VISUAL_BLEED_RATIO = 0.18;
const PET_REST_ORBIT_MARGIN = 34;
const PET_REST_ORBIT_LOOP_MS = 8_000;
const DISTRACTION_CHECK_INTERVAL_MS = 3000;
const DISTRACTION_WARNING_COOLDOWN_MS = 60_000;
const TIMELINE_POLL_INTERVAL_MS = 3000;
const LIVE_STATS_INTERVAL_MS = 60_000;
const PET_PRESENCE_CHECK_INTERVAL_MS = 3000;
const SYSTEM_ACTIVITY_POLL_INTERVAL_MS = 15_000;
const SYSTEM_INACTIVE_THRESHOLD_MS = 60_000;

function WindowLoadingFallback() {
  return <div className="h-screen w-screen bg-background" />;
}

type PetPrompt =
  | { id: 'rest-reminder'; message: string; variant: 'rest' }
  | { id: 'focus-complete'; message: string; variant: 'rest' }
  | { id: 'focus-warning'; message: string; variant: 'warning'; rule?: string };

function isCompactChatDismissed() {
  return localStorage.getItem(COMPACT_CHAT_DISMISSED_KEY) === "1";
}

const timelineLogLastByKey = new Map<string, number>();
const TIMELINE_PERSIST_LOG_INTERVAL_MS = 60_000;

function shouldPrintTimelineDebug(payload: Record<string, unknown>) {
  const stage = String(payload.stage || '');
  if (!stage) return false;
  if (stage.includes('error') || stage === 'disabled' || stage === 'unsupported') return true;
  if (stage === 'sample' || stage === 'sample:ignore' || stage === 'candidate:hold') return false;
  if (stage === 'persist:skip' && payload.message === 'active segment below minimum') return false;
  if (stage === 'accessibility') return !timelineLogLastByKey.has('accessibility');
  if (stage === 'start') return !timelineLogLastByKey.has('start');
  if (stage === 'persist:ok') {
    const durationMs = typeof payload.durationMs === 'number' ? payload.durationMs : 0;
    const minSegmentMs = typeof payload.minSegmentMs === 'number' ? payload.minSegmentMs : 0;
    const key = `persist:ok:${String(payload.message || payload.key || '')}`;
    const lastDuration = timelineLogLastByKey.get(key);
    if (lastDuration === undefined || durationMs <= minSegmentMs + 5_000 || durationMs - lastDuration >= TIMELINE_PERSIST_LOG_INTERVAL_MS) {
      timelineLogLastByKey.set(key, durationMs);
      return true;
    }
    return false;
  }
  return true;
}

function timelineDebugLog(payload: Record<string, unknown>) {
  if (!shouldPrintTimelineDebug(payload)) return;
  if (payload.stage === 'accessibility') timelineLogLastByKey.set('accessibility', Date.now());
  if (payload.stage === 'start') timelineLogLastByKey.set('start', Date.now());
  invoke('timeline_debug_log', payload).catch(() => {});
}

function loadTimelineRecorderState(minSegmentMs: number): TimelineRecorderState | null {
  try {
    const raw = localStorage.getItem(TIMELINE_RECORDER_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimelineRecorderState & { savedAt?: number; minSegmentMs?: number };
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > Math.max(minSegmentMs * 2, 30 * 60_000)) {
      localStorage.removeItem(TIMELINE_RECORDER_STATE_KEY);
      return null;
    }
    if (typeof parsed.minSegmentMs === 'number' && parsed.minSegmentMs !== minSegmentMs) {
      localStorage.removeItem(TIMELINE_RECORDER_STATE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(TIMELINE_RECORDER_STATE_KEY);
    return null;
  }
}

function saveTimelineRecorderState(state: TimelineRecorderState, minSegmentMs: number) {
  try {
    if (!state.active.key && !state.candidate.key && !state.paused.key) {
      localStorage.removeItem(TIMELINE_RECORDER_STATE_KEY);
      return;
    }
    localStorage.setItem(TIMELINE_RECORDER_STATE_KEY, JSON.stringify({
      ...state,
      savedAt: Date.now(),
      minSegmentMs,
    }));
  } catch {
    // Ignore storage failures; losing a pending timeline segment is non-fatal.
  }
}

function App() {
  const [windowLabel, setWindowLabel] = useState<string>(() => getCurrentWindow().label);
  const { settings, loaded, loadSettings } = useSettingsStore();

  useEffect(() => {
    const label = getCurrentWindow().label;
    setWindowLabel(label);
    if (label === "chat") invoke("hide_compact_chat_window").catch(() => {});
    if (label === "settings") {
      localStorage.setItem(COMPACT_CHAT_DISMISSED_KEY, "1");
      invoke("hide_compact_chat_window").catch(() => {});
      emit("compact-chat:collapsed", {}).catch(() => {});
    }

    loadSettings().then(async () => {
      for (const state of ALL_PET_STATES) {
        try {
          const raw = await getSetting(`petMedia_${state}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            usePetStore.getState().setStateMediaConfig(state, normalizePetMediaConfig(state, parsed));
          }
        } catch { /* use default */ }
      }
    });

    if (label === "settings") {
      document.title = "";
      document.body.classList.add("has-background");
    }
    if (label === "chat") {
      document.title = "";
      document.body.classList.add("has-background");
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") root.classList.add("dark");
    else if (settings.theme === "light") root.classList.remove("dark");
    else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => root.classList.toggle("dark", e.matches);
      root.classList.toggle("dark", mq.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  useEffect(() => {
    if (!loaded) return;
    return installDocumentTranslator(settings.appLanguage);
  }, [loaded, settings.appLanguage]);

  useEffect(() => {
    const unlisten = listen("shortcut:chat-focus", () => {
      if (windowLabel === "pet") usePetStore.getState().openChat('new');
    });
    return () => { unlisten.then(fn => fn()); };
  }, [windowLabel]);

  useEffect(() => {
    const unlisten = listen("settings:updated", () => {
      if (windowLabel === "settings") return;
      loadSettings().catch(() => {});
    });
    return () => { unlisten.then(fn => fn()); };
  }, [loadSettings, windowLabel]);

  useEffect(() => {
    const reloadPetMedia = async () => {
      const store = usePetStore.getState();
      await store.loadUserFrames();
      for (const state of ALL_PET_STATES) {
        try {
          const raw = await getSetting(`petMedia_${state}`);
          const parsed = raw ? JSON.parse(raw) : {};
          store.setStateMediaConfig(state, normalizePetMediaConfig(state, parsed));
        } catch {
          store.setStateMediaConfig(state, DEFAULT_MEDIA_CONFIG[state]);
        }
      }
    };
    const unlisten = listen("pet-media:changed", () => {
      reloadPetMedia().catch((e) => console.warn("Failed to reload pet media:", e));
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  if (windowLabel === "settings") {
    return (
      <TooltipProvider>
        <Suspense fallback={<WindowLoadingFallback />}>
          <SettingsPanel />
        </Suspense>
      </TooltipProvider>
    );
  }

  if (windowLabel === "chat") {
    const handoffConversationId = readChatHandoffConversationId();
    return (
      <TooltipProvider>
        <div className="h-screen w-screen bg-background text-foreground">
          {settings.codingModeEnabled ? (
            <CodingStandaloneDialog />
          ) : (
            <Suspense fallback={<WindowLoadingFallback />}>
              <ChatDialog
                initialConversationId={handoffConversationId}
                initialMode={handoffConversationId ? "history" : "new"}
                maxHeight={760}
                standalone
              />
            </Suspense>
          )}
        </div>
      </TooltipProvider>
    );
  }

  if (windowLabel === "compact-chat") {
    return (
      <TooltipProvider>
        <CompactChatWindow />
      </TooltipProvider>
    );
  }

  if (windowLabel === "pet" && !loaded) return null;

  return <PetWindow />;
}

interface CompactChatSession {
  mode: 'new' | 'history';
  conversationId: number | null;
  version: number;
}

type CodingStatus = 'idle' | 'needs-input' | 'working' | 'done';

interface CodingMessage {
  id: string;
  role: 'user' | 'codex' | 'system' | 'error';
  content: string;
  createdAt: number;
}

interface CodingInheritedSession {
  id: string;
  ackKey: string;
  title: string;
  status: CodingStatus;
  message: string;
  progressMessages?: CodingMessage[];
  updatedAt: number;
  cwd?: string;
  path?: string;
}

interface CodingState {
  status: CodingStatus;
  messages: CodingMessage[];
  provider?: CodingProvider;
  threadId?: string;
  sessions?: CodingInheritedSession[];
  allSessions?: CodingInheritedSession[];
}

const DEFAULT_CODING_STATE: CodingState = { status: 'done', messages: [] };

function codingProviderLabel(provider: CodingProvider) {
  return provider === 'claude' ? 'Claude Code' : 'Codex';
}

function getEnabledCodingProviders(settings: Pick<AppSettings, 'codingCodexEnabled' | 'codingClaudeEnabled'>): CodingProvider[] {
  const providers: CodingProvider[] = [];
  if (settings.codingCodexEnabled) providers.push('codex');
  if (settings.codingClaudeEnabled) providers.push('claude');
  return providers;
}

function isInheritedCodingMode(settings: AppSettings) {
  return settings.codingSessionMode === 'inherit';
}

function codingStateCommand(settings: AppSettings) {
  if (settings.codingProvider === 'claude') {
    return settings.codingSessionMode === 'inherit' ? 'coding_get_claude_inherited_state' : 'coding_get_claude_state';
  }
  return settings.codingSessionMode === 'inherit' ? 'coding_get_inherited_state' : 'coding_get_state';
}

function codingAckCommand(provider: CodingProvider) {
  return provider === 'claude' ? 'coding_ack_claude_inherited_sessions' : 'coding_ack_inherited_sessions';
}

function codingNewStateCommand(provider: CodingProvider) {
  return provider === 'claude' ? 'coding_get_claude_state' : 'coding_get_state';
}

function codingInheritedStateCommand(provider: CodingProvider) {
  return provider === 'claude' ? 'coding_get_claude_inherited_state' : 'coding_get_inherited_state';
}

function isCodingConversationTitle(title: string | null | undefined) {
  return /^(Codex|Claude Code)(?::|\s+Coding\b|\b)/i.test((title || '').trim());
}

function isProviderCodingConversationTitle(title: string | null | undefined, provider: CodingProvider) {
  const prefix = provider === 'claude' ? 'Claude Code' : 'Codex';
  return new RegExp(`^${prefix.replace(/\s+/g, '\\s+')}(?::|\\s+Coding\\b|\\b)`, 'i').test((title || '').trim());
}

function codingConversationKey(provider: CodingProvider) {
  return provider === 'claude' ? `${CODING_CONVERSATION_KEY}:claude` : CODING_CONVERSATION_KEY;
}

function codingSavedMessagesKey(provider: CodingProvider) {
  return provider === 'claude' ? `${CODING_SAVED_MESSAGES_KEY}:claude` : CODING_SAVED_MESSAGES_KEY;
}

function CompactChatWindow() {
  const { settings } = useSettingsStore();
  const lastCompactHeightRef = useRef(0);
  const [chatContentHeight, setChatContentHeight] = useState(MIN_DIALOG_HEIGHT - COMPACT_CHAT_TOP_CHROME - COMPACT_CHAT_BOTTOM_CHROME);
  const [session, setSession] = useState<CompactChatSession>(() => ({
    ...readCompactChatSession(),
    version: 0,
  }));
  const handleConversationChange = useCallback((conversationId: number | null) => {
    localStorage.setItem(COMPACT_CHAT_KEY, JSON.stringify({
      mode: conversationId ? 'history' : 'new',
      conversationId,
    }));
    emit("compact-chat:conversation", { conversationId }).catch(() => {});
  }, []);

  useEffect(() => {
    const openListener = listen<{ mode: 'new' | 'history'; conversationId: number | null }>("compact-chat:open", ({ payload }) => {
      setSession((current) => ({
        mode: payload.mode,
        conversationId: payload.conversationId ?? null,
        version: current.version + 1,
      }));
    });
    const imageListener = listen("compact-chat:image", () => {
      window.dispatchEvent(new CustomEvent("desksprite:chat-image"));
    });
    const voiceListener = listen("compact-chat:voice", () => {
      window.dispatchEvent(new CustomEvent("desksprite:chat-voice"));
    });
    const focusListener = listen("compact-chat:focus-input", () => {
      window.dispatchEvent(new CustomEvent("desksprite:chat-focus"));
    });
    return () => {
      openListener.then((fn) => fn());
      imageListener.then((fn) => fn());
      voiceListener.then((fn) => fn());
      focusListener.then((fn) => fn());
    };
  }, []);

  const expandToStandaloneChat = useCallback(async () => {
    if (settings.codingModeEnabled) {
      localStorage.removeItem(CHAT_HANDOFF_KEY);
    } else if (session.conversationId) {
      localStorage.setItem(CHAT_HANDOFF_KEY, String(session.conversationId));
    } else {
      localStorage.removeItem(CHAT_HANDOFF_KEY);
    }
    try {
      await invoke("show_chat_window");
      if (!settings.codingModeEnabled) {
        await emit("chat:open-conversation", { conversationId: session.conversationId });
      }
    } catch (e) {
      console.warn("Failed to expand compact chat:", e);
    }
  }, [session.conversationId, settings.codingModeEnabled]);

  const collapseCompactChat = useCallback(async () => {
    localStorage.setItem(COMPACT_CHAT_DISMISSED_KEY, "1");
    await invoke("hide_compact_chat_window").catch(() => {});
    await emit("compact-chat:collapsed", {}).catch(() => {});
  }, []);

  const handleContentHeightChange = useCallback((contentHeight: number) => {
    const nextContentHeight = Math.min(
      Math.max(1, Math.ceil(contentHeight)),
      COMPACT_CHAT_PREFERRED_HEIGHT,
    );
    const nextHeight = Math.min(
      Math.max(MIN_DIALOG_HEIGHT, nextContentHeight + COMPACT_CHAT_TOP_CHROME + COMPACT_CHAT_BOTTOM_CHROME),
      COMPACT_CHAT_PREFERRED_HEIGHT + COMPACT_CHAT_TOP_CHROME + COMPACT_CHAT_BOTTOM_CHROME,
    );
    setChatContentHeight((current) => (Math.abs(current - nextContentHeight) <= 2 ? current : nextContentHeight));
    if (Math.abs(lastCompactHeightRef.current - nextHeight) <= 2) return;
    lastCompactHeightRef.current = nextHeight;
    invoke("resize_compact_chat_window", { height: nextHeight }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!settings.codingModeEnabled) return;
    lastCompactHeightRef.current = 0;
  }, [settings.codingModeEnabled, settings.codingProvider, settings.codingSessionMode]);

  useEffect(() => {
    if (!settings.codingModeEnabled) return;
    handleContentHeightChange(chatContentHeight || MIN_DIALOG_HEIGHT);
  }, [chatContentHeight, handleContentHeightChange, settings.codingModeEnabled]);

  const hoverFrameHeight = Math.max(
    MIN_DIALOG_HEIGHT,
    Math.min(
      COMPACT_CHAT_PREFERRED_HEIGHT + COMPACT_CHAT_TOP_CHROME + COMPACT_CHAT_BOTTOM_CHROME,
      chatContentHeight + COMPACT_CHAT_TOP_CHROME + COMPACT_CHAT_BOTTOM_CHROME,
    ),
  );

  return (
    <div className="group relative w-screen overflow-hidden bg-transparent p-0" style={{ height: hoverFrameHeight }}>
      <div className="pointer-events-none absolute left-0 right-0 top-0 rounded-[6px] border border-foreground/0 bg-background/0 opacity-0 shadow-[0_8px_26px_rgba(42,38,31,0.08)] backdrop-blur-[2px] transition-all duration-200 group-hover:border-foreground/22 group-hover:bg-background/24 group-hover:opacity-100" style={{ height: hoverFrameHeight }} />
      <div className="absolute right-1 top-1 z-30 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <MacControlButton title="收起" onClick={collapseCompactChat}>
          <Minus className="h-2.5 w-2.5" />
        </MacControlButton>
        <MacControlButton title="放大到大聊天框" onClick={expandToStandaloneChat}>
          <Maximize2 className="h-2.5 w-2.5" />
        </MacControlButton>
      </div>
      <div className="absolute left-[10px] right-[10px] top-[20px]">
        {settings.codingModeEnabled ? (
          <CodingDialog
            compactFontSize={settings.compactChatFontSize}
            maxHeight={COMPACT_CHAT_PREFERRED_HEIGHT}
            onContentHeightChange={handleContentHeightChange}
          />
        ) : (
          <Suspense fallback={null}>
            <ChatDialog
              key={`${session.mode}-${session.conversationId ?? 'new'}-${session.version}`}
              initialConversationId={session.conversationId}
              initialMode={session.mode}
              dialogOpacity={settings.petOpacity}
              compactFontSize={settings.compactChatFontSize}
              maxHeight={COMPACT_CHAT_PREFERRED_HEIGHT}
              onContentHeightChange={handleContentHeightChange}
              onConversationChange={handleConversationChange}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function CodingDialog({
  compactFontSize,
  maxHeight,
  onContentHeightChange,
  standalone = false,
}: {
  compactFontSize: number;
  maxHeight: number;
  onContentHeightChange?: (height: number) => void;
  standalone?: boolean;
}) {
  const { settings } = useSettingsStore();
  const [state, setState] = useState<CodingState>(DEFAULT_CODING_STATE);
  const [inheritedState, setInheritedState] = useState<CodingState>(DEFAULT_CODING_STATE);
  const [input, setInput] = useState('');
  const [historyItems, setHistoryItems] = useState<Array<{ id: number; title: string | null; updatedAt: string }>>([]);
  const [archivedMessages, setArchivedMessages] = useState<ChatMessage[] | null>(null);
  const [activeArchivedConversationId, setActiveArchivedConversationId] = useState<number | null>(null);
  const [activeInheritedSessionId, setActiveInheritedSessionId] = useState<string | null>(null);
  const [standaloneProvider, setStandaloneProvider] = useState<CodingProvider>(settings.codingProvider);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const enabledProviders = useMemo(() => getEnabledCodingProviders(settings), [settings.codingCodexEnabled, settings.codingClaudeEnabled]);
  const activeProvider = standalone ? standaloneProvider : settings.codingProvider;
  const effectiveSettings = useMemo(() => ({ ...settings, codingProvider: activeProvider }), [activeProvider, settings]);
  const codingLabel = codingProviderLabel(activeProvider);
  const inherited = !standalone && isInheritedCodingMode(effectiveSettings);
  const stateCommand = standalone ? codingNewStateCommand(activeProvider) : codingStateCommand(effectiveSettings);
  const inheritedStateCommand = codingInheritedStateCommand(activeProvider);

  useEffect(() => {
    if (!standalone) return;
    if (enabledProviders.length === 0) return;
    if (!enabledProviders.includes(standaloneProvider)) setStandaloneProvider(enabledProviders[0]);
  }, [enabledProviders, standalone, standaloneProvider]);

  const applyCodingState = useCallback((next: CodingState | null | undefined) => {
    const resolved = next ?? DEFAULT_CODING_STATE;
    setState(resolved);
    if (!inherited) return;
    setActiveInheritedSessionId((current) => {
      if (current && resolved.sessions?.some((session) => session.id === current)) return current;
      return resolved.sessions?.find((session) => session.status !== 'working')?.id
        ?? resolved.sessions?.[0]?.id
        ?? null;
    });
  }, [inherited]);

  useEffect(() => {
    invoke<CodingState>(stateCommand)
      .then(applyCodingState)
      .catch((error) => setState({
        status: 'needs-input',
        messages: [{ id: 'coding-error', role: 'error', content: codingConnectionErrorMessage(error, codingLabel), createdAt: Date.now() }],
      }));
    const unlisten = !inherited ? listen<CodingState>('coding:state', ({ payload }) => {
      if (payload.provider && payload.provider !== activeProvider) return;
      applyCodingState(payload);
    }) : Promise.resolve(() => {});
    let timer = 0;
    if (inherited || activeProvider === 'claude') {
      timer = window.setInterval(() => {
        invoke<CodingState>(stateCommand)
          .then(applyCodingState)
          .catch((error) => setState({
            status: 'needs-input',
            messages: [{ id: 'coding-inherit-error', role: 'error', content: codingConnectionErrorMessage(error, codingLabel), createdAt: Date.now() }],
          }));
      }, 2500);
    }
    return () => {
      if (timer) window.clearInterval(timer);
      unlisten.then((fn) => fn());
    };
  }, [activeProvider, applyCodingState, codingLabel, inherited, stateCommand]);

  useEffect(() => {
    if (!standalone) return;
    let alive = true;
    const loadInherited = () => {
      invoke<CodingState>(inheritedStateCommand)
        .then((next) => {
          if (alive) setInheritedState(next ?? DEFAULT_CODING_STATE);
        })
        .catch(() => {
          if (alive) setInheritedState(DEFAULT_CODING_STATE);
        });
    };
    loadInherited();
    const timer = window.setInterval(loadInherited, 2500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [activeProvider, inheritedStateCommand, standalone]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 28;
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.messages, activeInheritedSessionId]);

  useEffect(() => {
    if (inherited) return;
    persistCodingMessages(state.messages, activeProvider, codingLabel).catch((error) => {
      console.warn("Failed to persist coding messages:", error);
    });
  }, [activeProvider, codingLabel, inherited, state.messages]);

  useEffect(() => {
    if (!standalone) return;
    getConversations()
      .then((items) => setHistoryItems(items
        .filter((item) => isProviderCodingConversationTitle(item.title, activeProvider))
        .map((item) => ({ id: item.id, title: item.title, updatedAt: item.updated_at }))))
      .catch((error) => console.warn("Failed to load coding history:", error));
  }, [activeProvider, standalone, state.messages.length]);

  useEffect(() => {
    if (standalone || !onContentHeightChange) return;
    const frame = window.requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      onContentHeightChange(Math.ceil(root.scrollHeight));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [standalone, onContentHeightChange, state.messages, input, state.status, compactFontSize]);

  useEffect(() => {
    setArchivedMessages(null);
    setActiveArchivedConversationId(null);
    setActiveInheritedSessionId(null);
    setInheritedState(DEFAULT_CODING_STATE);
    stickToBottomRef.current = true;
  }, [activeProvider]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = standalone ? '34px' : '28px';
    el.style.height = `${Math.min(el.scrollHeight, standalone ? 160 : 112)}px`;
  }, [input, standalone]);

  const send = async () => {
    const prompt = input.trim();
    if (inherited || !prompt || state.status === 'working') return;
    setArchivedMessages(null);
    setActiveArchivedConversationId(null);
    setActiveInheritedSessionId(null);
    setInput('');
    await invoke('coding_send_message', { prompt, provider: activeProvider }).catch((e) => {
      setState((current) => ({
        status: 'needs-input',
        messages: [...current.messages, { id: `local-${Date.now()}`, role: 'error', content: codingConnectionErrorMessage(e, codingLabel), createdAt: Date.now() }],
      }));
    });
  };

  const clear = async () => {
    setArchivedMessages(null);
    if (inherited) {
      const ackKeys = (state.sessions || [])
        .filter((session) => session.status !== 'working')
        .map((session) => ({ id: session.id, ackKey: session.ackKey }));
      const next = await invoke<CodingState>(codingAckCommand(activeProvider), { ackKeys }).catch(() => null);
      applyCodingState(next);
      return;
    }
    localStorage.removeItem(codingConversationKey(activeProvider));
    localStorage.removeItem(codingSavedMessagesKey(activeProvider));
    await invoke(activeProvider === 'claude' ? 'coding_clear_claude' : 'coding_clear').catch(() => {});
  };

  const loadArchivedConversation = async (conversationId: number) => {
    try {
      const rows = await getMessages(conversationId);
      setActiveArchivedConversationId(conversationId);
      setArchivedMessages(rows.map((message) => ({
        id: `history-${message.id}`,
        role: message.role === 'user' ? 'user' : message.role === 'assistant' ? 'assistant' : 'system',
        content: message.content,
        timestamp: new Date(message.timestamp).getTime(),
      })));
    } catch (error) {
      console.warn("Failed to load coding history item:", error);
    }
  };

  const inheritedSessions = standalone
    ? (inheritedState.allSessions || inheritedState.sessions || [])
    : state.sessions || [];
  const activeInheritedSession = (standalone || inherited)
    ? (standalone
      ? inheritedSessions.find((session) => session.id === activeInheritedSessionId) ?? null
      : state.status === 'working'
        ? inheritedSessions.find((session) => session.status === 'working') ?? inheritedSessions[0]
        : inheritedSessions.find((session) => session.status !== 'working') ?? inheritedSessions[0])
    : null;
  const activeInheritedMessages = activeInheritedSession?.status === 'working' && activeInheritedSession.progressMessages?.length
    ? activeInheritedSession.progressMessages
    : activeInheritedSession ? [{
      id: `inherit-panel-${activeInheritedSession.id}-${Math.round(activeInheritedSession.updatedAt)}`,
      role: activeInheritedSession.status === 'needs-input' ? 'error' as const : activeInheritedSession.status === 'done' ? 'codex' as const : 'system' as const,
      content: activeInheritedSession.message,
      createdAt: activeInheritedSession.updatedAt,
    }] : state.messages;
  const inheritedMessages = activeInheritedMessages.map(codingMessageToChatMessage);
  const viewingInherited = Boolean(activeInheritedSession);
  const displayStatus = activeInheritedSession?.status ?? state.status;
  const isWorking = displayStatus === 'working';
  const messages = viewingInherited ? inheritedMessages : state.messages.map(codingMessageToChatMessage);
  const visibleMessages = archivedMessages ?? messages;

  if (standalone) {
    return (
      <div className="relative grid h-full grid-cols-[260px_minmax(0,1fr)] bg-background pt-14 text-[var(--text-primary)]">
        <div className="app-drag-region fixed inset-x-0 top-0 z-50 h-14" />
        <aside className="glass-panel flex min-h-0 flex-col rounded-none border-y-0 border-l-0">
          <div className="app-no-drag min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {inherited ? (
              inheritedSessions.length === 0 ? (
                <div className="px-3 py-6 text-[13px] leading-[1.5] text-[var(--text-secondary)]">暂无最近 {codingLabel} session</div>
              ) : inheritedSessions.map((session) => (
                <button
                  key={session.id}
                  className={`block w-full rounded-[13px] px-3 py-2.5 text-left transition-all duration-200 hover:bg-background/52 ${activeInheritedSession?.id === session.id ? 'bg-background/58' : ''}`}
                  onClick={() => {
                  setArchivedMessages(null);
                  setActiveArchivedConversationId(null);
                  setActiveInheritedSessionId(session.id);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${codingStatusDotClass(session.status)}`} />
                    <span className="min-w-0 truncate text-[14px] leading-[1.5]">{session.title}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] leading-[1.5] text-[var(--text-secondary)]">
                    {formatCodingTimestamp(session.updatedAt)}
                  </div>
                </button>
              ))
            ) : (
              <>
                {inheritedSessions.length > 0 && (
                  <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">继承 session</div>
                )}
                {inheritedSessions.map((session) => (
                  <button
                    key={`inherited-${session.id}`}
                    className={`block w-full rounded-[13px] px-3 py-2.5 text-left transition-all duration-200 hover:bg-background/52 ${activeInheritedSessionId === session.id ? 'bg-background/58' : ''}`}
                    onClick={() => {
                      setArchivedMessages(null);
                      setActiveInheritedSessionId(session.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${codingStatusDotClass(session.status)}`} />
                      <span className="min-w-0 truncate text-[14px] leading-[1.5]">{session.title}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] leading-[1.5] text-[var(--text-secondary)]">
                      {formatCodingTimestamp(session.updatedAt)}
                    </div>
                  </button>
                ))}
                {historyItems.length > 0 && (
                  <div className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">新 session 历史</div>
                )}
                {historyItems.map((item) => (
                  <button
                    key={`history-${item.id}`}
                    className={`block w-full rounded-[13px] px-3 py-2.5 text-left transition-all duration-200 hover:bg-background/52 ${activeArchivedConversationId === item.id ? 'bg-background/58' : ''}`}
                    onClick={() => {
                      setActiveInheritedSessionId(null);
                      loadArchivedConversation(item.id);
                    }}
                  >
                    <div className="truncate text-[14px] leading-[1.5]">{item.title || `对话 ${item.id}`}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] leading-[1.5] text-[var(--text-secondary)]">
                      <span>{formatAppConversationTime(item.updatedAt)}</span>
                      <span className="truncate">· {codingLabel}</span>
                    </div>
                  </button>
                ))}
                <button
                  className={`mt-1 block w-full rounded-[13px] px-3 py-2 text-left text-[12px] leading-[1.5] text-[var(--text-secondary)] transition-all duration-200 hover:bg-background/52 hover:text-[var(--text-primary)] ${!archivedMessages && !activeInheritedSessionId ? 'bg-background/42' : ''}`}
                  onClick={() => {
                    setArchivedMessages(null);
                    setActiveArchivedConversationId(null);
                    setActiveInheritedSessionId(null);
                    clear();
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    新建 session
                  </span>
                </button>
                {inheritedSessions.length === 0 && historyItems.length === 0 && (
                  <div className="px-3 py-6 text-[13px] leading-[1.5] text-[var(--text-secondary)]">暂无 Coding 对话</div>
                )}
              </>
            )}
          </div>
        </aside>
        <main className="flex min-h-0 flex-col bg-background">
          <div className="app-no-drag flex h-11 shrink-0 items-center justify-between border-b border-border/55 px-4">
            <div className="flex items-center gap-2 text-[13px] font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${codingStatusDotClass(displayStatus)}`} />
              <span>{codingLabel}</span>
            </div>
            <div className="flex rounded-[10px] border border-border/65 bg-background/45 p-1">
              {enabledProviders.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className={`rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition ${
                    activeProvider === provider
                      ? 'bg-[#2f94ff] text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                  }`}
                  onClick={() => setStandaloneProvider(provider)}
                >
                  {codingProviderLabel(provider)}
                </button>
              ))}
            </div>
          </div>
          <div className="app-no-drag min-h-0 flex-1 overflow-hidden p-3">
            <section className="quiet-card flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] ring-2 ring-ring/16">
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 [overflow-wrap:anywhere]" onScroll={handleScroll}>
                <div className="mx-auto w-full max-w-none min-w-0 space-y-3 overflow-x-hidden py-5 [overflow-wrap:anywhere]">
                  {visibleMessages.length === 0 ? (
                    <div className="pt-16 text-center text-[14px] leading-[1.5] text-muted-foreground">
                      {viewingInherited ? `${codingLabel} 继承 session` : state.threadId ? `已连接 ${codingLabel} 对话` : `输入第一条消息后会自动启动 ${codingLabel}`}
                    </div>
                  ) : visibleMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} fullWidth bubble />
                  ))}
                  {isWorking && !archivedMessages && (
                    <MessageBubble message={{ id: 'coding-working', role: 'assistant', content: '...', timestamp: Date.now() }} />
                  )}
                </div>
              </div>
              {viewingInherited ? (
                <p className="shrink-0 px-5 pb-4 pt-1 text-[12px] leading-5 text-destructive">
                  请回到 {codingLabel} 中回复或处理。
                </p>
              ) : (
                <div className="shrink-0 px-2 pb-2">
                  <div className="mx-auto w-full max-w-none">
                    <Composer
                      input={input}
                      isStreaming={isWorking}
                      onInputChange={setInput}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          send();
                        }
                      }}
                      onSubmit={send}
                      selectedImage={null}
                      textareaRef={textareaRef}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="chat-dialog mx-auto flex w-full max-w-full min-w-0 flex-col overflow-hidden rounded-[10px] border border-[var(--color-chat-border)] bg-[var(--surface-flat)] font-sans text-[var(--color-chat-text)] shadow-[0_8px_24px_rgba(42,38,31,0.10)] dark:bg-[var(--surface-flat)]"
      style={{
        maxHeight,
        fontSize: compactFontSize,
        background: 'color-mix(in srgb, var(--surface-flat) 68%, transparent)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 [overflow-wrap:anywhere]"
        onScroll={handleScroll}
        style={{ maxHeight: Math.max(80, maxHeight - 60) }}
      >
        <div className="min-w-0 max-w-full space-y-2.5 overflow-x-hidden py-4 [overflow-wrap:anywhere]">
          {visibleMessages.length === 0 ? (
            <div className="py-8 text-center text-[12px] leading-[1.5] text-[var(--color-chat-muted)]">
              {inherited ? (state.status === 'idle' ? `没有新的 ${codingLabel} 通知` : `${codingLabel} 正在工作中`) : state.threadId ? `已连接 ${codingLabel} 对话` : `输入第一条消息后会自动启动 ${codingLabel}`}
            </div>
          ) : visibleMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              fullWidth
              compact
              compactFontSize={compactFontSize}
            />
          ))}
          {isWorking && !archivedMessages && (
            <MessageBubble
              message={{ id: 'coding-working', role: 'assistant', content: '...', timestamp: Date.now() }}
              fullWidth
              compact
              compactFontSize={compactFontSize}
            />
          )}
        </div>
      </div>
      {inherited ? (
        <p className="px-3 pb-2 pt-1 text-[11px] leading-5 text-destructive">
          请回到 {codingLabel} 中回复或处理。
        </p>
      ) : (
        <div>
          <Composer
            input={input}
            isStreaming={isWorking}
            onInputChange={setInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            onSubmit={send}
            selectedImage={null}
            textareaRef={textareaRef}
            compact
            compactFontSize={compactFontSize}
          />
        </div>
      )}
    </div>
  );
}

function CodingStandaloneDialog() {
  return (
    <CodingDialog
      compactFontSize={13}
      maxHeight={760}
      standalone
    />
  );
}

function codingMessageToChatMessage(message: CodingMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : message.role === 'codex' ? 'assistant' : 'system',
    content: message.content,
    timestamp: message.createdAt,
  };
}

function readCodingSavedMessageIds(provider: CodingProvider = 'codex') {
  try {
    const parsed = JSON.parse(localStorage.getItem(codingSavedMessagesKey(provider)) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeCodingSavedMessageIds(ids: Set<string>, provider: CodingProvider = 'codex') {
  localStorage.setItem(codingSavedMessagesKey(provider), JSON.stringify(Array.from(ids).slice(-240)));
}

function formatAppConversationTime(value: string) {
  if (!value) return '';
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCodingTimestamp(value: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function ensureCodingHistoryConversation(messages: CodingMessage[], provider: CodingProvider = 'codex', label = 'Codex') {
  const key = codingConversationKey(provider);
  const existing = Number(localStorage.getItem(key) || 0);
  if (existing > 0) return existing;
  const firstUser = messages.find((message) => message.role === 'user')?.content.trim();
  await createConversation(firstUser ? `${label}: ${firstUser.slice(0, 42)}` : `${label} Coding`);
  const latest = (await getConversations())[0]?.id ?? null;
  if (latest) localStorage.setItem(key, String(latest));
  return latest;
}

async function persistCodingMessages(messages: CodingMessage[], provider: CodingProvider = 'codex', label = 'Codex') {
  if (messages.length === 0) return;
  const savedIds = readCodingSavedMessageIds(provider);
  const unsaved = messages.filter((message) => !savedIds.has(message.id));
  if (unsaved.length === 0) return;
  const conversationId = await ensureCodingHistoryConversation(messages, provider, label);
  if (!conversationId) return;
  for (const message of unsaved) {
    const role = message.role === 'user' ? 'user' : message.role === 'codex' ? 'assistant' : 'system';
    await insertMessage(conversationId, role, message.content);
    savedIds.add(message.id);
  }
  writeCodingSavedMessageIds(savedIds, provider);
}

function codingStatusDotClass(status: CodingStatus) {
  if (status === 'idle') return 'bg-[#8e8e93]';
  if (status === 'working') return 'bg-[#ffbd2e]';
  if (status === 'needs-input') return 'bg-[#ff5f57]';
  return 'bg-[#28c840]';
}

function codingStatusColor(status: CodingStatus) {
  if (status === 'idle') return '#8e8e93';
  if (status === 'working') return '#ffbd2e';
  if (status === 'needs-input') return '#ff5f57';
  return '#28c840';
}

function codingConnectionErrorMessage(error: unknown, label = 'Codex') {
  const detail = error instanceof Error ? error.message : String(error || '');
  if (/Unknown command: coding_|coding_get_state|coding_send_message/i.test(detail)) {
    return 'Coding 模式的主进程接口还没有加载。请重启应用或重新运行 pnpm electron:dev。';
  }
  return detail ? `无法连接 ${label}：${detail}` : `无法连接 ${label}。`;
}

function PetWindow() {
  const { settings, updateSettings } = useSettingsStore();
  const { dialogOpen, chatMode, chatConversationId, openChat, closeChat, setPetState, petState, mediaConfig, userFrames, userGifs } = usePetStore();
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [chatBurst, setChatBurst] = useState(false);
  const [petHovering, setPetHovering] = useState(false);
  const [compactVisible, setCompactVisible] = useState(false);
  const [codingState, setCodingState] = useState<CodingState>(DEFAULT_CODING_STATE);
  const [petPrompt, setPetPrompt] = useState<PetPrompt | null>(null);
  const [focusEndAt, setFocusEndAt] = useState<number | null>(null);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [restPresentationActive, setRestPresentationActive] = useState(false);
  const [nextRestReminderAt, setNextRestReminderAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [visualPetScale, setVisualPetScale] = useState(settings.petScale);
  const focusEndAtRef = useRef<number | null>(null);
  const restEndAtRef = useRef<number | null>(null);
  const focusStartedAtRef = useRef<number | null>(null);
  const focusStatsStartedAtRef = useRef<number | null>(null);
  const focusWarningAtRef = useRef(0);
  const codingModeStatsStartedAtRef = useRef<number | null>(null);
  const systemInactiveRef = useRef(false);
  const systemInactiveStartedAtRef = useRef<number | null>(null);
  const lastNowTickRef = useRef(Date.now());
  const autoHiddenForScreenShareRef = useRef(false);
  const topmostSuppressedForGameRef = useRef(false);
  const timelinePausedForGameRef = useRef(false);
  const gameStartedAtRef = useRef<number | null>(null);
  const autoFocusAfterRestRef = useRef(false);
  const restPresentationFrameRef = useRef<number | null>(null);
  const restPresentationSnapshotRef = useRef<RestPresentationSnapshot | null>(null);
  const visualPetScaleRef = useRef(settings.petScale);
  const restPresentationActiveRef = useRef(false);
  const settingsRef = useRef(settings);

  const orbMode = settings.avatarRenderMode === 'orb';
  const petSize = Math.round(150 * visualPetScale);
  const petImageWidth = Math.round((orbMode ? 150 : 120) * visualPetScale);
  const petImageHeight = Math.round(150 * visualPetScale);
  const focusStartedAt = focusStartedAtRef.current;
  const focusProgress = focusEndAt && focusStartedAt
    ? clamp((now - focusStartedAt) / Math.max(1, focusEndAt - focusStartedAt), 0, 1)
    : 0;
  const toolButtonSize = 28;
  const toolGap = 4;
  const toolRowWidth = toolButtonSize + toolGap;
  const collapsedWidth = Math.max(
    220,
    petSize + 70,
    PET_CONTENT_MARGIN + petImageWidth + 8 + toolRowWidth + PET_CONTENT_MARGIN,
  );
  const collapsedHeight = Math.max(220 + PET_BUBBLE_TOP_SPACE, petSize + 70 + PET_BUBBLE_TOP_SPACE);
  const [layout, setLayout] = useState<PetWindowLayout>(() => createDefaultPetWindowLayout(collapsedWidth, collapsedHeight));
  const promptBubbleLeft = clamp(
    petImageWidth / 2 - PET_PROMPT_BUBBLE_WIDTH / 2,
    -layout.petLeft + 8,
    layout.windowWidth - layout.petLeft - PET_PROMPT_BUBBLE_WIDTH - 8,
  );
  const promptBubbleArrowLeft = clamp(petImageWidth / 2 - promptBubbleLeft, 14, PET_PROMPT_BUBBLE_WIDTH - 14);
  const [dragging, setDragging] = useState(false);
  const layoutRef = useRef(layout);
  const movedTimerRef = useRef<number | null>(null);
  const layoutApplyingRef = useRef(false);
  const initialLayoutReadyRef = useRef(false);
  const dragSessionRef = useRef<BoundedDragSession | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const pendingDragPointRef = useRef<{ screenX: number; screenY: number } | null>(null);
  const lastDragPositionRef = useRef<{ left: number; top: number } | null>(null);
  const suppressMovedUntilRef = useRef(0);
  const compactConversationIdRef = useRef<number | null>(chatConversationId);
  const compactDismissedRef = useRef(false);
  const applyLayoutState = useCallback((nextLayout: PetWindowLayout) => {
    layoutRef.current = nextLayout;
    setLayout(nextLayout);
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    focusEndAtRef.current = focusEndAt;
  }, [focusEndAt]);

  useEffect(() => {
    restEndAtRef.current = restEndAt;
  }, [restEndAt]);

  useEffect(() => {
    visualPetScaleRef.current = visualPetScale;
  }, [visualPetScale]);

  useEffect(() => {
    if (restEndAtRef.current || restPresentationActiveRef.current) return;
    visualPetScaleRef.current = settings.petScale;
    setVisualPetScale(settings.petScale);
  }, [settings.petScale]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextNow = Date.now();
      const gapMs = nextNow - lastNowTickRef.current;
      lastNowTickRef.current = nextNow;
      if (gapMs > SYSTEM_INACTIVE_THRESHOLD_MS && focusEndAtRef.current) {
        const nextEndAt = focusEndAtRef.current + gapMs;
        focusEndAtRef.current = nextEndAt;
        setFocusEndAt(nextEndAt);
        if (focusStartedAtRef.current) focusStartedAtRef.current += gapMs;
        if (focusStatsStartedAtRef.current) focusStatsStartedAtRef.current = nextNow;
      }
      if (gapMs > SYSTEM_INACTIVE_THRESHOLD_MS && codingModeStatsStartedAtRef.current) {
        codingModeStatsStartedAtRef.current = nextNow;
      }
      setNow(nextNow);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!settings.codingModeEnabled) {
      setCodingState(DEFAULT_CODING_STATE);
      return;
    }
    const inherited = isInheritedCodingMode(settings);
    const command = codingStateCommand(settings);
    invoke<CodingState>(command)
      .then((next) => setCodingState(next ?? DEFAULT_CODING_STATE))
      .catch(() => setCodingState({ status: 'needs-input', messages: [] }));
    const unlisten = !inherited ? listen<CodingState>('coding:state', ({ payload }) => {
      if (payload.provider && payload.provider !== settings.codingProvider) return;
      setCodingState(payload ?? DEFAULT_CODING_STATE);
    }) : Promise.resolve(() => {});
    let timer = 0;
    if (inherited || settings.codingProvider === 'claude') {
      timer = window.setInterval(() => {
        invoke<CodingState>(command)
          .then((next) => setCodingState(next ?? DEFAULT_CODING_STATE))
          .catch(() => setCodingState({ status: 'needs-input', messages: [] }));
      }, 2500);
    }
    return () => {
      if (timer) window.clearInterval(timer);
      unlisten.then((fn) => fn());
    };
  }, [settings.codingModeEnabled, settings.codingProvider, settings.codingSessionMode]);

  const requestLayout = useCallback(async (overrides: { contextMenuOpen?: boolean } = {}) => {
    if (restEndAtRef.current || restPresentationActiveRef.current) return;
    const targetDialogOpen = false;
    const targetContextMenuOpen = overrides.contextMenuOpen ?? contextMenuOpen;
    layoutApplyingRef.current = true;
    try {
      await applyPetWindowLayout({
        dialogOpen: targetDialogOpen,
        contextMenuOpen: targetContextMenuOpen,
        requestedDialogWidth: 300,
        petImageWidth,
        petImageHeight,
        toolRowWidth,
        collapsedWidth,
        collapsedHeight,
        previousLayout: layoutRef.current,
        applyLayout: applyLayoutState,
      });
      if (!initialLayoutReadyRef.current) {
        initialLayoutReadyRef.current = true;
        invoke("pet_window_layout_ready").catch(() => {});
      }
    } finally {
      window.setTimeout(() => {
        layoutApplyingRef.current = false;
      }, 80);
    }
  }, [applyLayoutState, petImageWidth, petImageHeight, toolRowWidth, collapsedWidth, collapsedHeight, contextMenuOpen]);

  const positionCompactChatWindow = useCallback(async ({
    show,
    windowLeft,
    windowTop,
  }: {
    show: boolean;
    windowLeft?: number;
    windowTop?: number;
  }) => {
    if (show && isCompactChatDismissed()) return;
    const geometry = await getCompactChatGeometry({
      requestedDialogWidth: settings.dialogWidth,
      compact: compactConversationIdRef.current == null,
      petImageWidth,
      petImageHeight,
      layout: layoutRef.current,
      windowLeft,
      windowTop,
    });
    if (!geometry) return;
    await invoke(show ? "show_compact_chat_window" : "position_compact_chat_window", geometry);
  }, [settings.dialogWidth, petImageWidth, petImageHeight]);

  const forceShowCompactChat = useCallback(async (mode: 'new' | 'history', conversationId: number | null = null) => {
    compactDismissedRef.current = false;
    localStorage.removeItem(COMPACT_CHAT_DISMISSED_KEY);
    const payload = { mode, conversationId };
    localStorage.setItem(COMPACT_CHAT_KEY, JSON.stringify(payload));
    await positionCompactChatWindow({ show: true });
    await emit("compact-chat:open", payload);
    setChatBurst(true);
    window.setTimeout(() => setChatBurst(false), 360);
  }, [positionCompactChatWindow]);

  const forceShowCodingChat = useCallback(async () => {
    compactDismissedRef.current = false;
    localStorage.removeItem(COMPACT_CHAT_DISMISSED_KEY);
    await positionCompactChatWindow({ show: true });
    setCompactVisible(true);
    setChatBurst(true);
    window.setTimeout(() => setChatBurst(false), 360);
  }, [positionCompactChatWindow]);

  const animateRestPresentation = useCallback(async (target: RestPresentationSnapshot, options: { onDone?: () => void } = {}) => {
    if (restPresentationFrameRef.current) {
      window.cancelAnimationFrame(restPresentationFrameRef.current);
      restPresentationFrameRef.current = null;
    }
    const win = getCurrentWindow();
    const position = await win.outerPosition();
    const size = await win.outerSize();
    const start = {
      windowLeft: position.x,
      windowTop: position.y,
      windowWidth: size.width,
      windowHeight: size.height,
      layout: layoutRef.current,
      visualScale: visualPetScaleRef.current,
    };
    const startedAt = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const mix = (from: number, to: number, t: number) => from + (to - from) * t;
    let nativeFrame = 0;

    restPresentationActiveRef.current = true;
    setRestPresentationActive(true);
    layoutApplyingRef.current = true;

    await new Promise<void>((resolve) => {
      const step = (time: number) => {
        const progress = ease(clamp((time - startedAt) / REST_PRESENTATION_ANIMATION_MS, 0, 1));
        const nextLayout: PetWindowLayout = {
          windowWidth: mix(start.windowWidth, target.windowWidth, progress),
          windowHeight: mix(start.windowHeight, target.windowHeight, progress),
          petLeft: mix(start.layout.petLeft, target.layout.petLeft, progress),
          petTop: mix(start.layout.petTop, target.layout.petTop, progress),
          dialogLeft: mix(start.layout.dialogLeft, target.layout.dialogLeft, progress),
          dialogTop: mix(start.layout.dialogTop, target.layout.dialogTop, progress),
          dialogWidth: mix(start.layout.dialogWidth, target.layout.dialogWidth, progress),
          dialogMaxHeight: mix(start.layout.dialogMaxHeight, target.layout.dialogMaxHeight, progress),
          toolsLeft: mix(start.layout.toolsLeft, target.layout.toolsLeft, progress),
          toolsTop: mix(start.layout.toolsTop, target.layout.toolsTop, progress),
        };
        const nextScale = mix(start.visualScale, target.visualScale, progress);
        visualPetScaleRef.current = nextScale;
        setVisualPetScale(nextScale);
        applyLayoutState(nextLayout);

        nativeFrame += 1;
        if (nativeFrame % 2 === 0 || progress >= 1) {
          const width = Math.round(mix(start.windowWidth, target.windowWidth, progress));
          const height = Math.round(mix(start.windowHeight, target.windowHeight, progress));
          const left = Math.round(mix(start.windowLeft, target.windowLeft, progress));
          const top = Math.round(mix(start.windowTop, target.windowTop, progress));
          void win.setSize(new LogicalSize(width, height)).catch(() => {});
          void win.setPosition(new PhysicalPosition(left, top)).catch(() => {});
        }

        if (progress < 1) {
          restPresentationFrameRef.current = window.requestAnimationFrame(step);
          return;
        }
        restPresentationFrameRef.current = null;
        visualPetScaleRef.current = target.visualScale;
        setVisualPetScale(target.visualScale);
        applyLayoutState(target.layout);
        void win.setSize(new LogicalSize(target.windowWidth, target.windowHeight)).catch(() => {});
        void win.setPosition(new PhysicalPosition(target.windowLeft, target.windowTop)).catch(() => {});
        window.setTimeout(() => {
          layoutApplyingRef.current = false;
          restPresentationActiveRef.current = Boolean(restEndAtRef.current);
          setRestPresentationActive(Boolean(restEndAtRef.current));
          options.onDone?.();
          resolve();
        }, 80);
      };

      restPresentationFrameRef.current = window.requestAnimationFrame(step);
    });
  }, [applyLayoutState]);

  const startPetRestOrbitPresentation = useCallback(async () => {
    if (restPresentationFrameRef.current) {
      window.cancelAnimationFrame(restPresentationFrameRef.current);
      restPresentationFrameRef.current = null;
    }
    try {
      const win = getCurrentWindow();
      const monitor = await currentMonitor();
      if (!monitor) return;
      const position = await win.outerPosition();
      const size = await win.outerSize();
      const scale = monitor.scaleFactor;
      const work = monitor.workArea;
      const workLeft = work.position.x / scale;
      const workTop = work.position.y / scale;
      const workWidth = work.size.width / scale;
      const workHeight = work.size.height / scale;
      const startScale = visualPetScaleRef.current;
      const orbitPetWidth = Math.round(120 * startScale);
      const orbitPetHeight = Math.round(150 * startScale);
      const orbitCenterX = workWidth / 2;
      const orbitCenterY = workHeight / 2;
      const radiusX = Math.max(0, (workWidth - orbitPetWidth) / 2 - PET_REST_ORBIT_MARGIN);
      const radiusY = Math.max(0, (workHeight - orbitPetHeight) / 2 - PET_REST_ORBIT_MARGIN);
      const orbitRadius = Math.max(0, Math.min(radiusX, radiusY));
      const startedAt = Date.now();

      restPresentationSnapshotRef.current = {
        windowLeft: position.x / scale,
        windowTop: position.y / scale,
        windowWidth: size.width / scale,
        windowHeight: size.height / scale,
        layout: layoutRef.current,
        visualScale: startScale,
      };
      restPresentationActiveRef.current = true;
      setRestPresentationActive(true);
      layoutApplyingRef.current = true;
      visualPetScaleRef.current = startScale;
      setVisualPetScale(startScale);

      await win.setSize(new LogicalSize(workWidth, workHeight)).catch(() => {});
      await win.setPosition(new PhysicalPosition(workLeft, workTop)).catch(() => {});

      const tick = () => {
        if (!restEndAtRef.current) {
          restPresentationFrameRef.current = null;
          return;
        }
        const elapsed = Date.now() - startedAt;
        const progress = (elapsed % PET_REST_ORBIT_LOOP_MS) / PET_REST_ORBIT_LOOP_MS;
        const angle = -Math.PI / 2 + progress * Math.PI * 2;
        const petLeft = orbitCenterX + Math.cos(angle) * orbitRadius - orbitPetWidth / 2;
        const petTop = orbitCenterY + Math.sin(angle) * orbitRadius - orbitPetHeight / 2;
        applyLayoutState({
          windowWidth: workWidth,
          windowHeight: workHeight,
          petLeft,
          petTop,
          dialogLeft: PET_CONTENT_MARGIN,
          dialogTop: PET_CONTENT_MARGIN,
          dialogWidth: 300,
          dialogMaxHeight: 300,
          toolsLeft: workWidth - PET_CONTENT_MARGIN - toolButtonSize,
          toolsTop: PET_CONTENT_MARGIN,
        });
        restPresentationFrameRef.current = window.requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn("Failed to start pet rest orbit:", e);
      restPresentationActiveRef.current = false;
      setRestPresentationActive(false);
      layoutApplyingRef.current = false;
    }
  }, [applyLayoutState, toolButtonSize]);

  const expandPetForRest = useCallback(async () => {
    try {
      if (!orbMode) {
        await startPetRestOrbitPresentation();
        return;
      }
      const win = getCurrentWindow();
      const monitor = await currentMonitor();
      if (!monitor) return;
      const position = await win.outerPosition();
      const size = await win.outerSize();
      const scale = monitor.scaleFactor;
      const work = monitor.workArea;
      const workLeft = work.position.x / scale;
      const workTop = work.position.y / scale;
      const workWidth = work.size.width / scale;
      const workHeight = work.size.height / scale;
      restPresentationSnapshotRef.current = {
        windowLeft: position.x / scale,
        windowTop: position.y / scale,
        windowWidth: size.width / scale,
        windowHeight: size.height / scale,
        layout: layoutRef.current,
        visualScale: visualPetScaleRef.current,
      };

      const targetBaseWidth = orbMode ? 150 : 120;
      const targetBaseHeight = 150;
      const visualWidthRatio = orbMode ? 1 + ORB_REST_VISUAL_BLEED_RATIO * 2 : 1;
      const visualHeightRatio = orbMode ? 1 + ORB_REST_VISUAL_BLEED_RATIO * 2 : 1;
      const targetScale = Math.min(
        (workWidth * REST_PRESENTATION_SCREEN_RATIO) / (targetBaseWidth * visualWidthRatio),
        ((workHeight * REST_PRESENTATION_SCREEN_RATIO) - REST_COUNTDOWN_SPACE) / (targetBaseHeight * visualHeightRatio),
      );
      const targetPetWidth = Math.round(targetBaseWidth * targetScale);
      const targetPetHeight = Math.round(targetBaseHeight * targetScale);
      const targetOrbBleedX = orbMode ? Math.ceil(targetPetWidth * ORB_REST_VISUAL_BLEED_RATIO) : 0;
      const targetOrbBleedY = orbMode ? Math.ceil(targetPetHeight * ORB_REST_VISUAL_BLEED_RATIO) : 0;
      const targetWindowWidth = Math.min(workWidth, targetPetWidth + (PET_CONTENT_MARGIN + targetOrbBleedX) * 2);
      const targetWindowHeight = Math.min(workHeight, targetPetHeight + (PET_CONTENT_MARGIN + targetOrbBleedY) * 2 + REST_COUNTDOWN_SPACE);
      const targetWindowLeft = workLeft + (workWidth - targetWindowWidth) / 2;
      const targetWindowTop = workTop + (workHeight - targetWindowHeight) / 2;
      const targetLayout: PetWindowLayout = {
        windowWidth: targetWindowWidth,
        windowHeight: targetWindowHeight,
        petLeft: (targetWindowWidth - targetPetWidth) / 2,
        petTop: PET_CONTENT_MARGIN + targetOrbBleedY,
        dialogLeft: PET_CONTENT_MARGIN,
        dialogTop: PET_CONTENT_MARGIN,
        dialogWidth: 300,
        dialogMaxHeight: 300,
        toolsLeft: targetWindowWidth - PET_CONTENT_MARGIN - toolButtonSize,
        toolsTop: PET_CONTENT_MARGIN,
      };
      await animateRestPresentation({
        windowLeft: targetWindowLeft,
        windowTop: targetWindowTop,
        windowWidth: targetWindowWidth,
        windowHeight: targetWindowHeight,
        layout: targetLayout,
        visualScale: targetScale,
      });
    } catch (e) {
      console.warn("Failed to expand pet for rest:", e);
    }
  }, [animateRestPresentation, orbMode, startPetRestOrbitPresentation, toolButtonSize]);

  const restorePetAfterRest = useCallback(async () => {
    const snapshot = restPresentationSnapshotRef.current;
    restPresentationSnapshotRef.current = null;
    if (!snapshot) {
      restPresentationActiveRef.current = false;
      setRestPresentationActive(false);
      setVisualPetScale(settings.petScale);
      requestLayout().catch(() => {});
      return;
    }
    await animateRestPresentation(snapshot, {
      onDone: () => {
        restPresentationActiveRef.current = false;
        setRestPresentationActive(false);
        visualPetScaleRef.current = settings.petScale;
        setVisualPetScale(settings.petScale);
        applyLayoutState(snapshot.layout);
      },
    });
  }, [animateRestPresentation, applyLayoutState, requestLayout, settings.petScale]);

  const startRestAction = useCallback(() => {
    const endAt = Date.now() + Math.max(60, settings.restDurationSeconds) * 1000;
    const shouldStartNextFocus = autoFocusAfterRestRef.current || petPrompt?.id === 'focus-complete';
    setPetPrompt(null);
    setFocusEndAt(null);
    focusStartedAtRef.current = null;
    focusStatsStartedAtRef.current = null;
    autoFocusAfterRestRef.current = shouldStartNextFocus;
    restEndAtRef.current = endAt;
    setRestEndAt(endAt);
    setNextRestReminderAt(Date.now() + Math.max(1, settings.restReminderIntervalMinutes) * 60_000);
    setPetState('rest');
    invoke("hide_compact_chat_window").catch(() => {});
    expandPetForRest().catch(() => {});
  }, [expandPetForRest, petPrompt?.id, settings.restDurationSeconds, settings.restReminderIntervalMinutes, setPetState]);

  const dismissPrompt = useCallback(() => {
    autoFocusAfterRestRef.current = false;
    setPetPrompt(null);
  }, []);

  const recordCurrentFocusSession = useCallback((endedAt = Date.now()) => {
    const startedAt = focusStatsStartedAtRef.current;
    if (!startedAt) return;
    focusStatsStartedAtRef.current = endedAt;
    recordFocusSession(startedAt, endedAt)
      .then((day) => {
        if (day) emit('profile:data-updated', { kind: 'focus', date: day.date }).catch(() => {});
      })
      .catch((e) => console.warn("Failed to record focus stats:", e));
  }, []);

  const flushCodingModeStats = useCallback(async (endedAt = Date.now()) => {
    const startedAt = codingModeStatsStartedAtRef.current;
    if (!startedAt) return;
    codingModeStatsStartedAtRef.current = endedAt;
    try {
      const day = await recordCodingModeTime(startedAt, endedAt);
      if (day) await emit('profile:data-updated', { kind: 'coding', date: day.date });
    } catch (error) {
      console.warn('Failed to record coding mode stats:', error);
    }
  }, []);

  const endFocus = useCallback(() => {
    recordCurrentFocusSession();
    setFocusEndAt(null);
    focusStartedAtRef.current = null;
    focusStatsStartedAtRef.current = null;
    focusWarningAtRef.current = 0;
    autoFocusAfterRestRef.current = false;
    setPetPrompt(null);
    if (!restEndAt) setPetState('idle');
  }, [recordCurrentFocusSession, restEndAt, setPetState]);

  const startFocus = useCallback(() => {
    const duration = Math.max(1, settings.focusDurationMinutes) * 60_000;
    const endAt = Date.now() + duration;
    const startedAt = Date.now();
    focusStartedAtRef.current = startedAt;
    focusStatsStartedAtRef.current = startedAt;
    focusWarningAtRef.current = 0;
    setRestEndAt(null);
    setPetPrompt(null);
    setFocusEndAt(endAt);
    setPetState('work');
  }, [settings.focusDurationMinutes, setPetState]);

  const toggleFocus = useCallback(() => {
    if (focusEndAtRef.current) endFocus();
    else startFocus();
  }, [endFocus, startFocus]);

  const finishRest = useCallback(async () => {
    const shouldStartNextFocus = autoFocusAfterRestRef.current;
    autoFocusAfterRestRef.current = false;
    restEndAtRef.current = null;
    setRestEndAt(null);
    setPetPrompt(null);
    await restorePetAfterRest().catch(() => {});
    if (shouldStartNextFocus) startFocus();
    else setPetState('idle');
  }, [restorePetAfterRest, setPetState, startFocus]);

  useEffect(() => {
    const config = mediaConfig[petState] ?? DEFAULT_MEDIA_CONFIG[petState];
    const activeSources = getPetFrameSources(config, userFrames[petState], userGifs[petState]);
    const iconPath = activeSources.find((path) => !isGifAsset(path)) ?? DEFAULT_MEDIA_CONFIG.idle.defaultAssets[0];
    invoke("set_app_icon", { path: iconPath }).catch((e) => console.warn("Failed to set app icon:", e));
  }, [mediaConfig, petState, userFrames, userGifs]);

  useEffect(() => {
    const unlisten = listen("pet:start-focus", () => startFocus());
    return () => { unlisten.then((fn) => fn()); };
  }, [startFocus]);

  useEffect(() => {
    if (!focusEndAtRef.current || !focusStartedAtRef.current) return;
    setFocusEndAt(focusStartedAtRef.current + Math.max(1, settings.focusDurationMinutes) * 60_000);
  }, [settings.focusDurationMinutes]);

  useEffect(() => {
    if (!settings.restReminderEnabled) {
      setNextRestReminderAt(null);
      return;
    }
    setNextRestReminderAt(Date.now() + Math.max(1, settings.restReminderIntervalMinutes) * 60_000);
  }, [settings.restReminderEnabled, settings.restReminderIntervalMinutes]);

  useEffect(() => {
    if (!settings.restReminderEnabled || !nextRestReminderAt) return;
    if (focusEndAt || restEndAt || petPrompt) return;
    if (now < nextRestReminderAt) return;
    autoFocusAfterRestRef.current = false;
    setPetPrompt({ id: 'rest-reminder', message: '该休息啦', variant: 'rest' });
    setPetState('rest');
    setNextRestReminderAt(null);
  }, [focusEndAt, nextRestReminderAt, now, petPrompt, restEndAt, settings.restReminderEnabled, setPetState]);

  useEffect(() => {
    if (!focusEndAt) return;
    if (Date.now() < focusEndAt) return;
    recordCurrentFocusSession(focusEndAt);
    setFocusEndAt(null);
    focusStartedAtRef.current = null;
    focusStatsStartedAtRef.current = null;
    autoFocusAfterRestRef.current = true;
    setPetState('rest');
    setPetPrompt({ id: 'focus-complete', message: '该休息啦', variant: 'rest' });
  }, [focusEndAt, now, recordCurrentFocusSession, setPetState]);

  useEffect(() => {
    if (!restEndAt) return;
    if (Date.now() < restEndAt) return;
    finishRest().catch(() => {});
  }, [finishRest, restEndAt, now]);

  useEffect(() => {
    if (!focusEndAt || !settings.distractionDetectionEnabled) return;
    if (typeof navigator !== 'undefined' && navigator.platform && !navigator.platform.toLowerCase().includes('mac')) return;
    let disposed = false;
    const runCheck = async () => {
      if (disposed || !focusEndAtRef.current) return;
      const startedAt = focusStartedAtRef.current ?? Date.now();
      if (Date.now() - startedAt < Math.max(0, settings.distractionGraceSeconds) * 1000) return;
      try {
        const result = await invoke<{
          supported: boolean;
          appName: string;
          windowTitle: string;
          matchedRule: string | null;
        }>('check_distraction', { settings });
        if (!result.supported || !result.matchedRule || !focusEndAtRef.current) return;
        if (Date.now() - focusWarningAtRef.current < DISTRACTION_WARNING_COOLDOWN_MS) return;
        focusWarningAtRef.current = Date.now();
        const rule = result.matchedRule.replace(/^(app|keyword):/, '');
        recordDistraction(Date.now(), result.appName || rule, DISTRACTION_CHECK_INTERVAL_MS)
          .then((day) => {
            if (day) emit('profile:data-updated', { kind: 'distraction', date: day.date }).catch(() => {});
          })
          .catch((e) => console.warn("Failed to record distraction stats:", e));
        setPetState('work');
        setPetPrompt({
          id: 'focus-warning',
          message: `检测到分心：${rule}`,
          variant: 'warning',
          rule,
        });
      } catch (e) {
        console.warn('Failed to check distraction:', e);
      }
    };
    const firstTimer = window.setTimeout(runCheck, Math.max(0, settings.distractionGraceSeconds) * 1000);
    const timer = window.setInterval(runCheck, DISTRACTION_CHECK_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearTimeout(firstTimer);
      window.clearInterval(timer);
    };
  }, [focusEndAt, settings, setPetState]);

  useEffect(() => {
    if (!focusEndAt) return;
    const timer = window.setInterval(() => {
      if (focusEndAtRef.current) recordCurrentFocusSession();
    }, LIVE_STATS_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [focusEndAt, recordCurrentFocusSession]);

  useEffect(() => {
    const unlisten = listen<{ conversationId: number | null }>("compact-chat:conversation", ({ payload }) => {
      compactConversationIdRef.current = payload.conversationId ?? null;
      if (dialogOpen && !compactDismissedRef.current && !isCompactChatDismissed()) {
        positionCompactChatWindow({ show: false }).catch(() => {});
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [dialogOpen, positionCompactChatWindow]);

  useEffect(() => {
    if (!settings.timelineRecordingEnabled) {
      timelineDebugLog({ stage: 'disabled', message: 'Timeline recording is off' });
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.platform && !navigator.platform.toLowerCase().includes('mac')) {
      timelineDebugLog({ stage: 'unsupported', message: `platform=${navigator.platform}` });
      return;
    }
    let disposed = false;
    let useFallbackSnapshot = false;
    let accessibilityChecked = false;
    let foregroundPaused = false;
    const minSegmentMs = Math.max(1, Math.min(20, settings.timelineMinSegmentMinutes)) * 60_000;
    timelineDebugLog({ stage: 'start', message: 'Timeline sampler started', minSegmentMs });
    const initialTimelineState = loadTimelineRecorderState(minSegmentMs);

    const recorder = new TimelineRecorder({
      minSegmentMs,
      log: timelineDebugLog,
      initialState: initialTimelineState,
      persist: async (payload) => {
        const entry = await upsertTimelineEntry(payload);
        if (entry) {
          emit('profile:data-updated', { kind: 'timeline', date: entry.date }).catch(() => {});
          saveTimelineRecorderState(recorder.getState(), minSegmentMs);
        }
        return entry;
      },
    });

    const readTimelineSnapshot = async (): Promise<TimelineSnapshot> => {
      if (!useFallbackSnapshot) {
        try {
          return await invoke<TimelineSnapshot>('read_timeline_active_window', { musicAppKeywords: settingsRef.current.musicAppKeywords });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.includes('Unknown command: read_timeline_active_window')) throw error;
          useFallbackSnapshot = true;
        }
      }
      const fallback = await invoke<{
        supported: boolean;
        appName: string;
        windowTitle: string;
        error?: string | null;
      }>('check_distraction', { settings: settingsRef.current });
      return {
        supported: fallback.supported,
        appName: fallback.appName,
        windowTitle: fallback.windowTitle,
        url: null,
        background: [],
        error: fallback.error,
      };
    };

    const runTimelineCheck = async () => {
      try {
        if (!accessibilityChecked) {
          accessibilityChecked = true;
          const permission = await invoke<{ supported: boolean; trusted: boolean }>('ensure_accessibility_permission').catch((error) => {
            timelineDebugLog({ stage: 'accessibility:error', error: error instanceof Error ? error.message : String(error) });
            return null;
          });
          if (permission) timelineDebugLog({ stage: 'accessibility', message: `trusted=${permission.trusted}` });
        }
        if (timelinePausedForGameRef.current) {
          if (!foregroundPaused) {
            foregroundPaused = true;
            await recorder.pauseForeground(gameStartedAtRef.current ?? Date.now());
            saveTimelineRecorderState(recorder.getState(), minSegmentMs);
          }
          return;
        }
        if (systemInactiveRef.current) {
          if (!foregroundPaused) {
            foregroundPaused = true;
            await recorder.pauseForeground(systemInactiveStartedAtRef.current ?? Date.now());
            saveTimelineRecorderState(recorder.getState(), minSegmentMs);
          }
          const backgroundOnly = await invoke<{ supported: boolean; background: TimelineSnapshot['background']; error?: string | null }>('read_timeline_background_markers', { musicAppKeywords: settingsRef.current.musicAppKeywords }).catch(() => null);
          if (backgroundOnly?.supported) {
            await recorder.handleBackgroundMarkers(backgroundOnly.background, Date.now());
            saveTimelineRecorderState(recorder.getState(), minSegmentMs);
          }
          return;
        }
        if (foregroundPaused) {
          foregroundPaused = false;
          recorder.resumeForeground(Date.now(), minSegmentMs);
          saveTimelineRecorderState(recorder.getState(), minSegmentMs);
        }
        const result = await readTimelineSnapshot();
        if (disposed) return;
        await recorder.handleSnapshot(result, Date.now());
        saveTimelineRecorderState(recorder.getState(), minSegmentMs);
      } catch (error) {
        timelineDebugLog({ stage: 'error', error: error instanceof Error ? error.message : String(error) });
        if (!disposed) console.warn('Failed to record timeline:', error);
      }
    };

    runTimelineCheck();
    const timer = window.setInterval(runTimelineCheck, TIMELINE_POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      recorder.stop(Date.now())
        .then(() => saveTimelineRecorderState(recorder.getState(), minSegmentMs))
        .catch(() => saveTimelineRecorderState(recorder.getState(), minSegmentMs));
    };
  }, [settings.timelineRecordingEnabled, settings.timelineMinSegmentMinutes, settings.musicAppKeywords]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.platform && !navigator.platform.toLowerCase().includes('mac')) return;
    let disposed = false;

    const runPresenceCheck = async () => {
      try {
        const context = await invoke<{
          supported: boolean;
          isFullscreenGame: boolean;
          isScreenSharing: boolean;
        }>('read_pet_presence_context', { settings: settingsRef.current });
        if (disposed || !context.supported) return;

        const shouldSuppressTopmost = Boolean(settings.alwaysOnTop && context.isFullscreenGame);
        if (context.isFullscreenGame && !timelinePausedForGameRef.current) {
          timelinePausedForGameRef.current = true;
          gameStartedAtRef.current = Date.now();
          timelineDebugLog({ stage: 'game:pause', message: 'Fullscreen game detected; timeline sampler paused' });
        } else if (!context.isFullscreenGame && timelinePausedForGameRef.current) {
          timelinePausedForGameRef.current = false;
          gameStartedAtRef.current = null;
          timelineDebugLog({ stage: 'game:resume', message: 'Fullscreen game ended; timeline sampler resumed' });
        }
        if (topmostSuppressedForGameRef.current !== shouldSuppressTopmost) {
          topmostSuppressedForGameRef.current = shouldSuppressTopmost;
          await invoke('set_topmost_suppressed', { suppressed: shouldSuppressTopmost });
          if (!shouldSuppressTopmost && settings.alwaysOnTop) {
            await invoke('pin_pet_above_fullscreen_cmd');
          }
        }

        const shouldAutoHide = Boolean(settings.hidePetDuringScreenShare && context.isScreenSharing);
        if (shouldAutoHide && !autoHiddenForScreenShareRef.current) {
          autoHiddenForScreenShareRef.current = true;
          await invoke('hide_pet_window');
        } else if (!shouldAutoHide && autoHiddenForScreenShareRef.current) {
          autoHiddenForScreenShareRef.current = false;
          await invoke('show_pet_window');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('Unknown command: read_pet_presence_context')) {
          console.warn('Failed to update pet presence context:', error);
        }
      }
    };

    runPresenceCheck();
    const timer = window.setInterval(runPresenceCheck, PET_PRESENCE_CHECK_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (topmostSuppressedForGameRef.current) {
        topmostSuppressedForGameRef.current = false;
        invoke('set_topmost_suppressed', { suppressed: false }).catch(() => {});
      }
      timelinePausedForGameRef.current = false;
      gameStartedAtRef.current = null;
    };
  }, [settings.alwaysOnTop, settings.hidePetDuringScreenShare, settings.gameAppKeywords]);

  useEffect(() => {
    const unlisten = listen("compact-chat:collapsed", () => {
      compactDismissedRef.current = true;
      setCompactVisible(false);
      localStorage.setItem(COMPACT_CHAT_DISMISSED_KEY, "1");
      closeChat();
      invoke("hide_compact_chat_window").catch(() => {});
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [closeChat]);

  useEffect(() => {
    if (!settings.codingModeEnabled) {
      flushCodingModeStats().catch(() => {});
      codingModeStatsStartedAtRef.current = null;
      return;
    }

    codingModeStatsStartedAtRef.current = Date.now();
    const timer = window.setInterval(() => {
      flushCodingModeStats().catch(() => {});
    }, LIVE_STATS_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      flushCodingModeStats().catch(() => {});
    };
  }, [flushCodingModeStats, settings.codingModeEnabled]);

  useEffect(() => {
    let disposed = false;

    const pauseLiveStats = (startedAt = Date.now()) => {
      if (systemInactiveRef.current) return;
      systemInactiveRef.current = true;
      systemInactiveStartedAtRef.current = startedAt;
      if (focusStatsStartedAtRef.current) {
        recordCurrentFocusSession(startedAt);
        focusStatsStartedAtRef.current = null;
      }
      if (codingModeStatsStartedAtRef.current) {
        flushCodingModeStats(startedAt).catch(() => {});
        codingModeStatsStartedAtRef.current = null;
      }
    };

    const resumeLiveStats = (resumedAt = Date.now()) => {
      if (!systemInactiveRef.current) return;
      const startedAt = systemInactiveStartedAtRef.current ?? resumedAt;
      const pauseMs = Math.max(0, resumedAt - startedAt);
      systemInactiveRef.current = false;
      systemInactiveStartedAtRef.current = null;
      if (pauseMs >= SYSTEM_INACTIVE_THRESHOLD_MS && focusEndAtRef.current) {
        const nextEndAt = focusEndAtRef.current + pauseMs;
        focusEndAtRef.current = nextEndAt;
        setFocusEndAt(nextEndAt);
        if (focusStartedAtRef.current) focusStartedAtRef.current += pauseMs;
      }
      if (focusEndAtRef.current) focusStatsStartedAtRef.current = resumedAt;
      if (settingsRef.current.codingModeEnabled) codingModeStatsStartedAtRef.current = resumedAt;
    };

    const checkActivity = async () => {
      try {
        const state = await invoke<{ supported: boolean; inactive: boolean; idleSeconds: number; state: string }>('read_system_activity_state');
        if (disposed || !state.supported) return;
        if (state.inactive || state.idleSeconds >= 60 || state.state !== 'active') pauseLiveStats(Date.now());
        else resumeLiveStats(Date.now());
      } catch {
        resumeLiveStats(Date.now());
      }
    };

    checkActivity();
    const timer = window.setInterval(checkActivity, SYSTEM_ACTIVITY_POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkActivity();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [flushCodingModeStats, recordCurrentFocusSession]);

  useEffect(() => {
    compactConversationIdRef.current = chatConversationId;
    if (!dialogOpen) {
      invoke("hide_compact_chat_window").catch(() => {});
      return;
    }
    if (compactDismissedRef.current || isCompactChatDismissed()) {
      invoke("hide_compact_chat_window").catch(() => {});
      return;
    }
    const payload = { mode: chatMode, conversationId: chatConversationId ?? null };
    localStorage.setItem(COMPACT_CHAT_KEY, JSON.stringify(payload));
    positionCompactChatWindow({ show: true })
      .then(() => emit("compact-chat:open", payload))
      .catch((e) => console.warn("Failed to show compact chat window:", e));
  }, [chatConversationId, chatMode, dialogOpen, positionCompactChatWindow]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (compactDismissedRef.current || isCompactChatDismissed()) return;
    positionCompactChatWindow({ show: false }).catch(() => {});
  }, [settings.dialogWidth, settings.compactChatFontSize, dialogOpen, positionCompactChatWindow]);

  useEffect(() => {
    const unlisten = listen<{ mode: 'new' | 'history'; conversationId: number | null }>("pet:force-open-chat", ({ payload }) => {
      compactDismissedRef.current = false;
      setCompactVisible(true);
      localStorage.removeItem(COMPACT_CHAT_DISMISSED_KEY);
      openChat(payload.mode, payload.conversationId ?? null);
      forceShowCompactChat(payload.mode, payload.conversationId ?? null).catch((e) => console.warn("Failed to force open compact chat:", e));
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [forceShowCompactChat, openChat]);

  useEffect(() => {
    requestLayout({ contextMenuOpen }).catch(() => {});
  }, [contextMenuOpen, requestLayout]);

  useEffect(() => {
    const unlisten = getCurrentWindow().onMoved(() => {
      if (dragSessionRef.current) return;
      if (layoutApplyingRef.current) return;
      if (Date.now() < suppressMovedUntilRef.current) return;
      setDragging(true);
      if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
      movedTimerRef.current = window.setTimeout(() => {
        setDragging(false);
        requestLayout();
        if ((dialogOpen || (settings.codingModeEnabled && compactVisible)) && !compactDismissedRef.current && !isCompactChatDismissed()) positionCompactChatWindow({ show: false }).catch(() => {});
      }, 220);
    });
    return () => {
      if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
      unlisten.then((fn) => fn());
    };
  }, [compactVisible, dialogOpen, positionCompactChatWindow, requestLayout, settings.codingModeEnabled]);

  useEffect(() => () => {
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
    if (dragFrameRef.current) window.cancelAnimationFrame(dragFrameRef.current);
    if (restPresentationFrameRef.current) window.cancelAnimationFrame(restPresentationFrameRef.current);
  }, []);

  // Initialize always-on-top fullscreen pinning
  useEffect(() => {
    if (!settings.alwaysOnTop) return;
    invoke("pin_pet_above_fullscreen_cmd").catch((e) => console.warn("Failed to pin pet above fullscreen:", e));
    invoke("start_topmost_guard").catch((e) => console.warn("Failed to start topmost guard:", e));
    return () => {
      invoke("stop_topmost_guard").catch((e) => console.warn("Failed to stop topmost guard:", e));
    };
  }, [settings.alwaysOnTop]);

  const handleBoundedDragStart = async (point: { screenX: number; screenY: number }) => {
    if (restEndAtRef.current || restPresentationActiveRef.current) return;
    setDragging(true);
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
    try {
      const win = getCurrentWindow();
      const monitor = await currentMonitor();
      if (!monitor) return;
      const position = await win.outerPosition();
      const scale = monitor.scaleFactor;
      const work = monitor.workArea;
      const workLeft = work.position.x / scale;
      const workTop = work.position.y / scale;
      const workWidth = work.size.width / scale;
      const workHeight = work.size.height / scale;
      const layout = layoutRef.current;
      const safeLeft = workLeft + SCREEN_MARGIN;
      const safeTop = workTop + SCREEN_MARGIN;
      const safeRight = workLeft + workWidth - SCREEN_MARGIN;
      const safeBottom = workTop + workHeight - SCREEN_MARGIN;
      dragSessionRef.current = {
        startScreenX: point.screenX,
        startScreenY: point.screenY,
        startWindowLeft: position.x / scale,
        startWindowTop: position.y / scale,
        minWindowLeft: safeLeft - layout.petLeft,
        maxWindowLeft: Math.max(safeLeft - layout.petLeft, safeRight - petImageWidth - layout.petLeft),
        minWindowTop: safeTop - layout.petTop,
        maxWindowTop: Math.max(safeTop - layout.petTop, safeBottom - petImageHeight - layout.petTop),
      };
      lastDragPositionRef.current = {
        left: position.x / scale,
        top: position.y / scale,
      };
    } catch (e) {
      console.warn("Failed to start bounded pet drag:", e);
    }
  };

  const handleBoundedDragMove = (point: { screenX: number; screenY: number }) => {
    if (restEndAtRef.current || restPresentationActiveRef.current) return;
    pendingDragPointRef.current = point;
    if (dragFrameRef.current) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      const session = dragSessionRef.current;
      const pending = pendingDragPointRef.current;
      if (!session || !pending) return;
      const nextLeft = clamp(
        session.startWindowLeft + pending.screenX - session.startScreenX,
        session.minWindowLeft,
        session.maxWindowLeft,
      );
      const nextTop = clamp(
        session.startWindowTop + pending.screenY - session.startScreenY,
        session.minWindowTop,
        session.maxWindowTop,
      );
      const last = lastDragPositionRef.current;
      if (last && Math.abs(last.left - nextLeft) < 0.5 && Math.abs(last.top - nextTop) < 0.5) return;
      lastDragPositionRef.current = { left: nextLeft, top: nextTop };
      suppressMovedUntilRef.current = Date.now() + 180;
      getCurrentWindow().setPosition(new LogicalPosition(nextLeft, nextTop)).catch(() => {});
      if ((dialogOpen || (settings.codingModeEnabled && compactVisible)) && !compactDismissedRef.current && !isCompactChatDismissed()) {
        positionCompactChatWindow({ show: false, windowLeft: nextLeft, windowTop: nextTop }).catch(() => {});
      }
    });
  };

  const handleBoundedDragEnd = () => {
    if (restEndAtRef.current || restPresentationActiveRef.current) return;
    dragSessionRef.current = null;
    pendingDragPointRef.current = null;
    lastDragPositionRef.current = null;
    suppressMovedUntilRef.current = Date.now() + 800;
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
    setDragging(false);
  };

  const openLatestChat = async () => {
    if (settings.codingModeEnabled) {
      await forceShowCodingChat();
      return;
    }
    try {
      const latest = (await getConversations()).find((item) => !isCodingConversationTitle(item.title));
      if (latest) {
        openChat('history', latest.id);
        await forceShowCompactChat('history', latest.id);
        setCompactVisible(true);
        return;
      }
    } catch (e) {
      console.warn('Failed to open latest chat:', e);
    }
    openChat('new');
    await forceShowCompactChat('new', null);
    setCompactVisible(true);
  };

  const refreshCompactVisibility = useCallback(() => {
    invoke<boolean>("is_compact_chat_visible")
      .then(setCompactVisible)
      .catch(() => setCompactVisible(false));
  }, []);

  return (
    <TooltipProvider>
      <div className="fixed inset-0 overflow-hidden" style={{ background: 'transparent' }}>
        <div
          className="group absolute flex flex-col items-start"
          onMouseEnter={() => {
            setPetHovering(true);
            refreshCompactVisibility();
          }}
          onMouseLeave={() => setPetHovering(false)}
          style={{
            left: 0,
            top: 0,
            width: layout.windowWidth,
            height: layout.windowHeight,
            background: 'transparent',
          }}
        >
          <div
            className="absolute"
            style={{ left: layout.petLeft, top: layout.petTop }}
          >
            {petPrompt && (
              <PetPromptBubble
                prompt={petPrompt}
                left={promptBubbleLeft}
                arrowLeft={promptBubbleArrowLeft}
                onOk={startRestAction}
                onIgnore={() => {
                  if (petPrompt.id === 'focus-warning' && focusEndAtRef.current) setPetState('work');
                  else if (petPrompt.id === 'focus-complete') startFocus();
                  else if (!restEndAt) {
                    setPetState('idle');
                    setNextRestReminderAt(Date.now() + Math.max(1, settings.restReminderIntervalMinutes) * 60_000);
                  }
                  dismissPrompt();
                }}
                onEndFocus={endFocus}
              />
            )}
            <PetAvatar
              opacity={settings.petOpacity}
              scale={visualPetScale}
              renderMode={settings.avatarRenderMode}
              motions={settings.petMotions}
              dragging={dragging}
              restPresentationActive={restPresentationActive}
              focusActive={Boolean(focusEndAt)}
              focusProgress={focusProgress}
              onDragStart={handleBoundedDragStart}
              onDragMove={handleBoundedDragMove}
              onDragEnd={handleBoundedDragEnd}
              onMenuOpenChange={setContextMenuOpen}
              onFocusToggle={toggleFocus}
              codingModeEnabled={settings.codingModeEnabled}
              codingProvider={settings.codingProvider}
              codingCodexEnabled={settings.codingCodexEnabled}
              codingClaudeEnabled={settings.codingClaudeEnabled}
              onCodingModeToggle={(mode, provider) => {
                if (provider === 'codex' && !settings.codingCodexEnabled) return;
                if (provider === 'claude' && !settings.codingClaudeEnabled) return;
                const nextEnabled = mode ? true : !settings.codingModeEnabled;
                const nextProvider = provider ?? settings.codingProvider;
                const nextMode = mode;
                const updates = mode
                  ? { codingModeEnabled: nextEnabled, codingProvider: nextProvider, codingSessionMode: nextMode }
                  : { codingModeEnabled: nextEnabled };
                updateSettings(updates).catch((e) => {
                  console.warn("Failed to toggle coding mode:", e);
                });
                if (settings.codingModeEnabled && !nextEnabled) {
                  invoke("hide_compact_chat_window").catch(() => {});
                  setCompactVisible(false);
                }
              }}
            />
            {restEndAt && (orbMode || !restPresentationActive) ? (
              <div className="mt-2 flex flex-col items-center gap-2">
                <div className="pointer-events-none text-center text-[18px] font-semibold leading-none tabular-nums text-[#4d4a45] drop-shadow-[0_2px_12px_rgba(32,28,22,0.12)]">
                  {formatCountdown(Math.max(0, restEndAt - now))}
                </div>
                <button
                  type="button"
                  className="rounded-[9px] border border-border/65 bg-background/90 px-4 py-1.5 text-[14px] font-medium leading-none text-muted-foreground shadow-[0_8px_22px_rgba(32,28,22,0.12)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:text-foreground active:translate-y-0"
                  onClick={() => finishRest().catch(() => {})}
                >
                  提前结束
                </button>
              </div>
            ) : focusEndAt ? (
              <div className="pointer-events-none mt-1 text-center text-[11px] font-medium tabular-nums text-muted-foreground drop-shadow-sm">
                {formatCountdown(Math.max(0, focusEndAt - now))}
              </div>
            ) : null}
          </div>

          <div
            className="absolute z-40 flex items-center gap-1.5"
            style={{
              left: layout.toolsLeft,
              top: layout.toolsTop,
            }}
          >
            <FloatingToolButton
              muted
              opacity={settings.petOpacity}
              visible={settings.codingModeEnabled || (petHovering && !compactVisible && !restEndAt)}
              title={settings.codingModeEnabled ? "打开 Coding 模式" : "打开对话"}
              accentColor={settings.codingModeEnabled ? codingStatusColor(codingState.status) : undefined}
              onClick={() => {
                openLatestChat();
              }}
            >
              <MessageCircle className={`h-3.5 w-3.5 ${chatBurst ? "animate-chat-pop" : ""}`} />
            </FloatingToolButton>
          </div>

          {restEndAt && !orbMode && restPresentationActive && (
            <div className="absolute inset-x-0 top-7 z-50 flex justify-center">
              <div className="flex flex-col items-center gap-2 rounded-[12px] border border-border/70 bg-background px-4 py-3 text-foreground shadow-[0_12px_32px_rgba(32,28,22,0.16)]">
                <div className="pointer-events-none text-center text-[18px] font-semibold leading-none tabular-nums text-[#4d4a45]">
                  {formatCountdown(Math.max(0, restEndAt - now))}
                </div>
                <button
                  type="button"
                  className="rounded-[9px] border border-border/65 bg-muted px-4 py-1.5 text-[14px] font-medium leading-none text-muted-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-muted/80 hover:text-foreground active:translate-y-0"
                  onClick={() => finishRest().catch(() => {})}
                >
                  提前结束
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </TooltipProvider>
  );
}

function FloatingToolButton({
  muted = false,
  opacity = 1,
  visible = false,
  accentColor,
  title,
  onClick,
  children,
}: {
  muted?: boolean;
  opacity?: number;
  visible?: boolean;
  accentColor?: string;
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`h-5 w-5 rounded-full border border-border/70 bg-background/95 p-0 text-muted-foreground shadow-sm transition-all hover:text-foreground ${
        muted && !accentColor ? "saturate-0 hover:saturate-100" : ""
      }`}
      style={{
        opacity: visible || hovered ? opacity : 0,
        transform: visible || hovered ? 'scale(1)' : 'scale(0.86)',
        backgroundColor: accentColor,
        borderColor: accentColor ? 'rgba(0,0,0,0.14)' : undefined,
        color: accentColor ? 'rgba(32,28,22,0.62)' : undefined,
        boxShadow: accentColor ? `0 0 0 1px rgba(255,255,255,0.45) inset, 0 5px 14px ${accentColor}40` : undefined,
      }}
    >
      {children}
    </Button>
  );
}

function PetPromptBubble({
  prompt,
  left,
  arrowLeft,
  onOk,
  onIgnore,
  onEndFocus,
}: {
  prompt: PetPrompt;
  left: number;
  arrowLeft: number;
  onOk: () => void;
  onIgnore: () => void;
  onEndFocus: () => void;
}) {
  const isWarning = prompt.id === 'focus-warning';
  return (
    <div
      className="absolute top-[-74px] z-50 w-[196px] animate-pet-bubble-in rounded-[10px] border border-border/75 bg-background/96 px-2.5 py-2 text-center shadow-[0_12px_34px_rgba(32,28,22,0.16)] backdrop-blur-md"
      style={{ left }}
    >
      <div className="text-[12px] font-medium leading-snug text-foreground">{prompt.message}</div>
      <div className="mt-2 flex justify-center gap-1.5">
        {isWarning ? (
          <>
            <MicroActionButton label="继续专注" onClick={onIgnore}>
              <Check className="h-3 w-3" />
            </MicroActionButton>
            <MicroActionButton label="结束" danger onClick={onEndFocus}>
              <X className="h-3 w-3" />
            </MicroActionButton>
          </>
        ) : (
          <>
            <MicroActionButton label="休息" onClick={onOk}>
              <Check className="h-3 w-3" />
            </MicroActionButton>
            <MicroActionButton label="忽略" onClick={onIgnore}>
              <X className="h-3 w-3" />
            </MicroActionButton>
          </>
        )}
      </div>
      <div
        className="absolute bottom-[-5px] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-border/75 bg-background/96"
        style={{ left: arrowLeft }}
      />
    </div>
  );
}

function MicroActionButton({
  label,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex h-6 items-center gap-1 rounded-full border border-border/70 bg-background px-2 text-[11px] font-medium text-muted-foreground shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.04] hover:text-foreground active:translate-y-0 active:scale-95 ${
        danger ? 'hover:border-destructive/40 hover:text-destructive' : 'hover:border-foreground/25'
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function MacControlButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border/80 bg-background/95 text-muted-foreground shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-muted hover:text-foreground active:translate-y-0 active:scale-95"
    >
      {children}
    </button>
  );
}

function readChatHandoffConversationId(): number | null {
  const raw = localStorage.getItem(CHAT_HANDOFF_KEY);
  localStorage.removeItem(CHAT_HANDOFF_KEY);
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

function readCompactChatSession(): { mode: 'new' | 'history'; conversationId: number | null } {
  try {
    const raw = localStorage.getItem(COMPACT_CHAT_KEY);
    if (!raw) return { mode: 'new', conversationId: null };
    const parsed = JSON.parse(raw);
    return {
      mode: parsed?.mode === 'history' ? 'history' : 'new',
      conversationId: typeof parsed?.conversationId === 'number' && parsed.conversationId > 0
        ? parsed.conversationId
        : null,
    };
  } catch {
    return { mode: 'new', conversationId: null };
  }
}

interface PetWindowLayout {
  windowWidth: number;
  windowHeight: number;
  petLeft: number;
  petTop: number;
  dialogLeft: number;
  dialogTop: number;
  dialogWidth: number;
  dialogMaxHeight: number;
  toolsLeft: number;
  toolsTop: number;
}

interface BoundedDragSession {
  startScreenX: number;
  startScreenY: number;
  startWindowLeft: number;
  startWindowTop: number;
  minWindowLeft: number;
  maxWindowLeft: number;
  minWindowTop: number;
  maxWindowTop: number;
}

interface RestPresentationSnapshot {
  windowLeft: number;
  windowTop: number;
  windowWidth: number;
  windowHeight: number;
  layout: PetWindowLayout;
  visualScale: number;
}

async function getCompactChatGeometry({
  requestedDialogWidth,
  compact,
  petImageWidth,
  petImageHeight,
  layout,
  windowLeft,
  windowTop,
}: {
  requestedDialogWidth: number;
  compact?: boolean;
  petImageWidth: number;
  petImageHeight: number;
  layout: PetWindowLayout;
  windowLeft?: number;
  windowTop?: number;
}): Promise<{ x: number; y: number; w: number; h: number } | null> {
  const win = getCurrentWindow();
  const monitor = await currentMonitor();
  if (!monitor) return null;
  const position = windowLeft === undefined || windowTop === undefined
    ? await win.outerPosition()
    : null;
  const scale = monitor.scaleFactor;
  const work = monitor.workArea;
  const workLeft = work.position.x / scale;
  const workTop = work.position.y / scale;
  const workWidth = work.size.width / scale;
  const workHeight = work.size.height / scale;
  const safeLeft = workLeft + SCREEN_MARGIN;
  const safeTop = workTop + SCREEN_MARGIN;
  const safeRight = workLeft + workWidth - SCREEN_MARGIN;
  const safeBottom = workTop + workHeight - SCREEN_MARGIN;
  const baseWindowLeft = windowLeft ?? (position ? position.x / scale : safeLeft);
  const baseWindowTop = windowTop ?? (position ? position.y / scale : safeTop);
  const petX = baseWindowLeft + layout.petLeft;
  const petY = baseWindowTop + layout.petTop;
  const safeWidth = Math.max(MIN_DIALOG_WIDTH, safeRight - safeLeft);
  const safeHeight = Math.max(MIN_DIALOG_HEIGHT, safeBottom - safeTop);
  const contentWidth = clamp(
    requestedDialogWidth,
    MIN_DIALOG_WIDTH,
    Math.max(MIN_DIALOG_WIDTH, safeWidth - COMPACT_CHAT_SIDE_CHROME * 2),
  );
  const outerWidth = Math.min(safeWidth, contentWidth + COMPACT_CHAT_SIDE_CHROME * 2);
  const outerChromeY = COMPACT_CHAT_TOP_CHROME + COMPACT_CHAT_BOTTOM_CHROME;
  const preferredContentHeight = compact ? 128 : COMPACT_CHAT_PREFERRED_HEIGHT;
  const preferredOuterHeight = preferredContentHeight + outerChromeY;
  const minOuterHeight = MIN_DIALOG_HEIGHT + outerChromeY;
  const maxOuterHeight = Math.max(minOuterHeight, Math.min(preferredOuterHeight, safeHeight));
  const gap = 12;
  const petCenterX = petX + petImageWidth / 2;
  const petCenterY = petY + petImageHeight / 2;

  type Candidate = {
    x: number;
    y: number;
    h: number;
    priority: number;
  };

  const makeCandidate = (x: number, y: number, h: number, priority: number): Candidate | null => {
    if (h < minOuterHeight) return null;
    return { x, y, h: Math.min(maxOuterHeight, h), priority };
  };

  const centeredX = petCenterX - outerWidth / 2;
  const centeredY = petCenterY - maxOuterHeight / 2;
  const candidates = [
    makeCandidate(centeredX, petY + petImageHeight + gap, safeBottom - (petY + petImageHeight + gap), 0),
    makeCandidate(centeredX, petY - gap - Math.min(maxOuterHeight, petY - gap - safeTop), petY - gap - safeTop, 1),
    makeCandidate(petX + petImageWidth + gap, centeredY, maxOuterHeight, 2),
    makeCandidate(petX - outerWidth - gap, centeredY, maxOuterHeight, 3),
    makeCandidate(safeLeft + (safeWidth - outerWidth) / 2, safeTop + (safeHeight - maxOuterHeight) / 2, maxOuterHeight, 4),
  ].filter((item): item is Candidate => Boolean(item));

  const scoreCandidate = (candidate: Candidate) => {
    const overflowX = Math.max(0, safeLeft - candidate.x) + Math.max(0, candidate.x + outerWidth - safeRight);
    const overflowY = Math.max(0, safeTop - candidate.y) + Math.max(0, candidate.y + candidate.h - safeBottom);
    const heightLoss = maxOuterHeight - candidate.h;
    return overflowX * 1000 + overflowY * 1000 + heightLoss * 10 + candidate.priority;
  };

  const best = candidates
    .sort((a, b) => scoreCandidate(a) - scoreCandidate(b))[0] ?? {
      x: safeLeft + (safeWidth - outerWidth) / 2,
      y: safeTop + (safeHeight - maxOuterHeight) / 2,
      h: maxOuterHeight,
      priority: 5,
    };
  const height = Math.max(minOuterHeight, Math.min(maxOuterHeight, best.h));

  return {
    x: clamp(best.x, safeLeft, Math.max(safeLeft, safeRight - outerWidth)),
    y: clamp(best.y, safeTop, Math.max(safeTop, safeBottom - height)),
    w: outerWidth,
    h: height,
  };
}

function createDefaultPetWindowLayout(width: number, height: number): PetWindowLayout {
  return {
    windowWidth: width,
    windowHeight: height,
    petLeft: PET_CONTENT_MARGIN,
    petTop: PET_CONTENT_MARGIN + PET_BUBBLE_TOP_SPACE,
    dialogLeft: PET_CONTENT_MARGIN,
    dialogTop: PET_CONTENT_MARGIN,
    dialogWidth: 300,
    dialogMaxHeight: 300,
    toolsLeft: PET_CONTENT_MARGIN + 128,
    toolsTop: PET_CONTENT_MARGIN + PET_BUBBLE_TOP_SPACE + 118,
  };
}

async function applyPetWindowLayout({
  dialogOpen,
  contextMenuOpen,
  requestedDialogWidth,
  petImageWidth,
  petImageHeight,
  toolRowWidth,
  collapsedWidth,
  collapsedHeight,
  previousLayout,
  applyLayout,
}: {
  dialogOpen: boolean;
  requestedDialogWidth: number;
  petImageWidth: number;
  petImageHeight: number;
  toolRowWidth: number;
  collapsedWidth: number;
  collapsedHeight: number;
  previousLayout: PetWindowLayout;
  applyLayout: (layout: PetWindowLayout) => void;
  contextMenuOpen: boolean;
}) {
  try {
    const win = getCurrentWindow();
    const monitor = await currentMonitor();
    if (!monitor) return;
    const position = await win.outerPosition();
    const size = await win.outerSize();
    const work = monitor.workArea;
    const scale = monitor.scaleFactor;
    const workLeft = work.position.x / scale;
    const workTop = work.position.y / scale;
    const workWidth = work.size.width / scale;
    const workHeight = work.size.height / scale;
    const workRight = workLeft + workWidth;
    const workBottom = workTop + workHeight;
    const windowLeft = position.x / scale;
    const windowTop = position.y / scale;
    const windowWidth = size.width / scale;
    const windowHeight = size.height / scale;
    const safeLeft = workLeft + SCREEN_MARGIN;
    const safeTop = workTop + SCREEN_MARGIN;
    const safeRight = workRight - SCREEN_MARGIN;
    const safeBottom = workBottom - SCREEN_MARGIN;
    const maxWindowWidth = Math.max(160, workWidth - SCREEN_MARGIN * 2);
    const maxWindowHeight = Math.max(160, workHeight - SCREEN_MARGIN * 2);
    const safePetX = clamp(
      windowLeft + previousLayout.petLeft,
      safeLeft,
      Math.max(safeLeft, safeRight - petImageWidth),
    );
    const safePetY = clamp(
      windowTop + previousLayout.petTop,
      safeTop,
      Math.max(safeTop, safeBottom - petImageHeight),
    );

    let layout: PetWindowLayout;
    if (!dialogOpen) {
      const compactPetTop = PET_CONTENT_MARGIN + PET_BUBBLE_TOP_SPACE;
      const menuWindowWidth = contextMenuOpen
        ? Math.min(
            maxWindowWidth,
            Math.max(
              collapsedWidth,
              petImageWidth + 8 + CONTEXT_MENU_WIDTH + CONTEXT_SUBMENU_WIDTH + PET_CONTENT_MARGIN * 2,
            ),
          )
        : collapsedWidth;
      const menuWindowHeight = contextMenuOpen
        ? Math.min(
            maxWindowHeight,
            Math.max(collapsedHeight, petImageHeight + PET_CONTENT_MARGIN * 2, CONTEXT_MENU_HEIGHT + PET_CONTENT_MARGIN * 2),
          )
        : collapsedHeight;
      const petNearRightEdge = contextMenuOpen && safePetX > safeLeft + (safeRight - safeLeft) * PET_RIGHT_EDGE_MENU_THRESHOLD;
      const petLeft = petNearRightEdge
        ? Math.max(PET_CONTENT_MARGIN, menuWindowWidth - petImageWidth - PET_CONTENT_MARGIN)
        : PET_CONTENT_MARGIN;
      const toolsFitRight = petLeft + petImageWidth + 8 + toolRowWidth <= menuWindowWidth - PET_CONTENT_MARGIN;
      layout = {
        windowWidth: menuWindowWidth,
        windowHeight: menuWindowHeight,
        petLeft,
        petTop: compactPetTop,
        dialogLeft: PET_CONTENT_MARGIN,
        dialogTop: PET_CONTENT_MARGIN,
        dialogWidth: requestedDialogWidth,
        dialogMaxHeight: requestedDialogWidth,
        toolsLeft: toolsFitRight
          ? petLeft + petImageWidth + 8
          : Math.max(PET_CONTENT_MARGIN, petLeft - toolRowWidth - 8),
        toolsTop: compactPetTop + petImageHeight - 28,
      };
    } else {
      const maxDialogWidth = Math.max(MIN_DIALOG_WIDTH, maxWindowWidth - PET_CONTENT_MARGIN * 2);
      const dialogWidth = clamp(requestedDialogWidth, MIN_DIALOG_WIDTH, maxDialogWidth);
      const availableBelow = safeBottom - (safePetY + petImageHeight + 12);
      const belowDialogHeight = Math.min(dialogWidth, Math.max(0, availableBelow));
      const placeBelow = belowDialogHeight >= MIN_DIALOG_HEIGHT;

      let expandedWindowWidth: number;
      let expandedWindowHeight: number;
      let petLeft: number;
      let petTop: number;
      let dialogLeft: number;
      let dialogTop: number;
      let dialogMaxHeight: number;
      let placeRight: boolean;

      if (placeBelow) {
        dialogMaxHeight = Math.max(MIN_DIALOG_HEIGHT, belowDialogHeight);
        expandedWindowWidth = Math.min(
          maxWindowWidth,
          Math.max(
            dialogWidth + PET_CONTENT_MARGIN * 2,
            petImageWidth + 8 + toolRowWidth + PET_CONTENT_MARGIN * 2,
          ),
        );
        expandedWindowHeight = Math.min(
          maxWindowHeight,
          petImageHeight + dialogMaxHeight + PET_CONTENT_MARGIN * 2 + 12,
        );
        placeRight = safePetX - PET_CONTENT_MARGIN + expandedWindowWidth <= safeRight;
        petLeft = placeRight
          ? PET_CONTENT_MARGIN
          : Math.max(PET_CONTENT_MARGIN, expandedWindowWidth - petImageWidth - PET_CONTENT_MARGIN);
        petTop = PET_CONTENT_MARGIN;
        dialogLeft = placeRight
          ? PET_CONTENT_MARGIN
          : Math.max(PET_CONTENT_MARGIN, expandedWindowWidth - dialogWidth - PET_CONTENT_MARGIN);
        dialogTop = petTop + petImageHeight + 12;
      } else {
        dialogMaxHeight = Math.max(
          MIN_DIALOG_HEIGHT,
          Math.min(dialogWidth, maxWindowHeight - PET_CONTENT_MARGIN * 2),
        );
        expandedWindowWidth = Math.min(
          maxWindowWidth,
          dialogWidth + petImageWidth + 12 + PET_CONTENT_MARGIN * 2,
        );
        expandedWindowHeight = Math.min(
          maxWindowHeight,
          Math.max(petImageHeight, dialogMaxHeight) + PET_CONTENT_MARGIN * 2,
        );
        placeRight = safePetX + petImageWidth + 12 + dialogWidth + PET_CONTENT_MARGIN <= safeRight;
        petLeft = placeRight
          ? PET_CONTENT_MARGIN
          : Math.max(PET_CONTENT_MARGIN, expandedWindowWidth - petImageWidth - PET_CONTENT_MARGIN);
        const minPetTop = Math.max(PET_CONTENT_MARGIN, safePetY - (safeBottom - expandedWindowHeight));
        const maxPetTop = Math.min(
          expandedWindowHeight - petImageHeight - PET_CONTENT_MARGIN,
          safePetY - safeTop,
        );
        petTop = clamp(PET_CONTENT_MARGIN, minPetTop, Math.max(minPetTop, maxPetTop));
        dialogLeft = placeRight
          ? petLeft + petImageWidth + 12
          : PET_CONTENT_MARGIN;
        dialogTop = clamp(
          petTop,
          PET_CONTENT_MARGIN,
          Math.max(PET_CONTENT_MARGIN, expandedWindowHeight - dialogMaxHeight - PET_CONTENT_MARGIN),
        );
      }

      layout = {
        windowWidth: expandedWindowWidth,
        windowHeight: expandedWindowHeight,
        petLeft,
        petTop,
        dialogLeft,
        dialogTop,
        dialogWidth,
        dialogMaxHeight,
        toolsLeft: placeRight
          ? petLeft + petImageWidth + 8
          : Math.max(PET_CONTENT_MARGIN, petLeft - toolRowWidth - 8),
        toolsTop: petTop + petImageHeight - 28,
      };
    }

    const nextWindowLeft = clamp(safePetX - layout.petLeft, safeLeft, Math.max(safeLeft, safeRight - layout.windowWidth));
    const nextWindowTop = clamp(safePetY - layout.petTop, safeTop, Math.max(safeTop, safeBottom - layout.windowHeight));
    const nextX = Math.round(nextWindowLeft * scale);
    const nextY = Math.round(nextWindowTop * scale);
    const shouldMove = Math.abs(position.x - nextX) > 1 || Math.abs(position.y - nextY) > 1;
    const shouldResize =
      Math.abs(windowWidth - layout.windowWidth) > 1 ||
      Math.abs(windowHeight - layout.windowHeight) > 1;
    const isExpanding = layout.windowWidth >= windowWidth || layout.windowHeight >= windowHeight;
    if (shouldResize && isExpanding) {
      await win.setSize(new LogicalSize(layout.windowWidth, layout.windowHeight));
    }
    if (shouldMove) {
      await win.setPosition(new PhysicalPosition(nextX, nextY));
    }
    if (!layoutsEqual(previousLayout, layout)) applyLayout(layout);
    if (shouldResize && !isExpanding) {
      await win.setSize(new LogicalSize(layout.windowWidth, layout.windowHeight));
    }
  } catch (e) {
    console.warn("Failed to apply pet window layout:", e);
  }
}

function layoutsEqual(a: PetWindowLayout, b: PetWindowLayout): boolean {
  return (
    nearlyEqual(a.windowWidth, b.windowWidth) &&
    nearlyEqual(a.windowHeight, b.windowHeight) &&
    nearlyEqual(a.petLeft, b.petLeft) &&
    nearlyEqual(a.petTop, b.petTop) &&
    nearlyEqual(a.dialogLeft, b.dialogLeft) &&
    nearlyEqual(a.dialogTop, b.dialogTop) &&
    nearlyEqual(a.dialogWidth, b.dialogWidth) &&
    nearlyEqual(a.dialogMaxHeight, b.dialogMaxHeight) &&
    nearlyEqual(a.toolsLeft, b.toolsLeft) &&
    nearlyEqual(a.toolsTop, b.toolsTop)
  );
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.5;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default App;
