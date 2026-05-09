import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { currentMonitor, getCurrentWindow, LogicalPosition, LogicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import { Check, MessageCircle, Minus, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PetAvatar } from "@/features/pet/PetAvatar";
import { ChatDialog } from "@/features/chat/ChatDialog";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { usePetStore } from "@/features/pet/petStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { getConversations, getSetting } from "@/lib/db";
import { ALL_PET_STATES, DEFAULT_MEDIA_CONFIG, getPetFrameSources, isGifAsset, normalizePetMediaConfig } from "@/features/pet/animations";
import "./index.css";

const CHAT_HANDOFF_KEY = "desksprite:chat-handoff-conversation-id";
const COMPACT_CHAT_KEY = "desksprite:compact-chat";
const COMPACT_CHAT_DISMISSED_KEY = "desksprite:compact-chat-dismissed";
const SCREEN_MARGIN = 16;
const PET_CONTENT_MARGIN = 20;
const MIN_DIALOG_WIDTH = 200;
const MIN_DIALOG_HEIGHT = 90;
const COMPACT_CHAT_SIDE_CHROME = 10;
const COMPACT_CHAT_TOP_CHROME = 20;
const COMPACT_CHAT_BOTTOM_CHROME = 10;
const COMPACT_CHAT_PREFERRED_HEIGHT = 340;
const CONTEXT_MENU_WIDTH = 112;
const CONTEXT_SUBMENU_WIDTH = 170;
const CONTEXT_MENU_HEIGHT = 204;
const PET_RIGHT_EDGE_MENU_THRESHOLD = 0.62;
const PET_BUBBLE_TOP_SPACE = 78;
const REST_ACTION_DURATION_MS = 60_000;
const DISTRACTION_CHECK_INTERVAL_MS = 3000;
const DISTRACTION_WARNING_COOLDOWN_MS = 60_000;

type PetPrompt =
  | { id: 'rest-reminder'; message: string; variant: 'rest' }
  | { id: 'focus-complete'; message: string; variant: 'rest' }
  | { id: 'focus-warning'; message: string; variant: 'warning'; rule?: string };

function isCompactChatDismissed() {
  return localStorage.getItem(COMPACT_CHAT_DISMISSED_KEY) === "1";
}

function App() {
  const [windowLabel, setWindowLabel] = useState<string>(() => getCurrentWindow().label);
  const { settings, loadSettings } = useSettingsStore();

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
    return <TooltipProvider><SettingsPanel /></TooltipProvider>;
  }

  if (windowLabel === "chat") {
    const handoffConversationId = readChatHandoffConversationId();
    return (
      <TooltipProvider>
        <div className="h-screen w-screen bg-background text-foreground">
          <ChatDialog
            initialConversationId={handoffConversationId}
            initialMode={handoffConversationId ? "history" : "new"}
            maxHeight={760}
            standalone
          />
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

  return <PetWindow />;
}

interface CompactChatSession {
  mode: 'new' | 'history';
  conversationId: number | null;
  version: number;
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
    if (session.conversationId) {
      localStorage.setItem(CHAT_HANDOFF_KEY, String(session.conversationId));
    } else {
      localStorage.removeItem(CHAT_HANDOFF_KEY);
    }
    try {
      await invoke("show_chat_window");
      await emit("chat:open-conversation", { conversationId: session.conversationId });
    } catch (e) {
      console.warn("Failed to expand compact chat:", e);
    }
  }, [session.conversationId]);

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
      </div>
    </div>
  );
}

function PetWindow() {
  const { settings } = useSettingsStore();
  const { dialogOpen, chatMode, chatConversationId, openChat, closeChat, setPetState, petState, mediaConfig, userFrames, userGifs } = usePetStore();
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [chatBurst, setChatBurst] = useState(false);
  const [petHovering, setPetHovering] = useState(false);
  const [compactVisible, setCompactVisible] = useState(false);
  const [petPrompt, setPetPrompt] = useState<PetPrompt | null>(null);
  const [focusEndAt, setFocusEndAt] = useState<number | null>(null);
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [nextRestReminderAt, setNextRestReminderAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const focusEndAtRef = useRef<number | null>(null);
  const focusStartedAtRef = useRef<number | null>(null);
  const focusWarningAtRef = useRef(0);

  const petSize = Math.round(150 * settings.petScale);
  const petImageWidth = Math.round(120 * settings.petScale);
  const petImageHeight = Math.round(150 * settings.petScale);
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
  const [dragging, setDragging] = useState(false);
  const layoutRef = useRef(layout);
  const movedTimerRef = useRef<number | null>(null);
  const layoutApplyingRef = useRef(false);
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
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    focusEndAtRef.current = focusEndAt;
  }, [focusEndAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const requestLayout = useCallback(async (overrides: { contextMenuOpen?: boolean } = {}) => {
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

  const startRestAction = useCallback(() => {
    const endAt = Date.now() + REST_ACTION_DURATION_MS;
    setPetPrompt(null);
    setFocusEndAt(null);
    focusStartedAtRef.current = null;
    setRestEndAt(endAt);
    setNextRestReminderAt(Date.now() + Math.max(1, settings.restReminderIntervalMinutes) * 60_000);
    setPetState('drinking');
  }, [settings.restReminderIntervalMinutes, setPetState]);

  const dismissPrompt = useCallback(() => {
    setPetPrompt(null);
  }, []);

  const endFocus = useCallback(() => {
    setFocusEndAt(null);
    focusStartedAtRef.current = null;
    focusWarningAtRef.current = 0;
    setPetPrompt(null);
    if (!restEndAt) setPetState('idle');
  }, [restEndAt, setPetState]);

  const startFocus = useCallback(() => {
    const duration = Math.max(1, settings.focusDurationMinutes) * 60_000;
    const endAt = Date.now() + duration;
    focusStartedAtRef.current = Date.now();
    focusWarningAtRef.current = 0;
    setRestEndAt(null);
    setPetPrompt(null);
    setFocusEndAt(endAt);
    setPetState('work');
  }, [settings.focusDurationMinutes, setPetState]);

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
    setPetPrompt({ id: 'rest-reminder', message: '该休息啦', variant: 'rest' });
    setPetState('rest');
    setNextRestReminderAt(null);
  }, [focusEndAt, nextRestReminderAt, now, petPrompt, restEndAt, settings.restReminderEnabled, setPetState]);

  useEffect(() => {
    if (!focusEndAt) return;
    if (Date.now() < focusEndAt) return;
    setFocusEndAt(null);
    focusStartedAtRef.current = null;
    setPetState('rest');
    setPetPrompt({ id: 'focus-complete', message: '该休息啦', variant: 'rest' });
  }, [focusEndAt, now, setPetState]);

  useEffect(() => {
    if (!restEndAt) return;
    if (Date.now() < restEndAt) return;
    setRestEndAt(null);
    setPetPrompt(null);
    setPetState('idle');
  }, [restEndAt, now, setPetState]);

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
    const unlisten = listen<{ conversationId: number | null }>("compact-chat:conversation", ({ payload }) => {
      compactConversationIdRef.current = payload.conversationId ?? null;
      if (dialogOpen && !compactDismissedRef.current && !isCompactChatDismissed()) {
        positionCompactChatWindow({ show: false }).catch(() => {});
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [dialogOpen, positionCompactChatWindow]);

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
        if (dialogOpen && !compactDismissedRef.current && !isCompactChatDismissed()) positionCompactChatWindow({ show: false }).catch(() => {});
      }, 220);
    });
    return () => {
      if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
      unlisten.then((fn) => fn());
    };
  }, [dialogOpen, positionCompactChatWindow, requestLayout]);

  useEffect(() => () => {
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
    if (dragFrameRef.current) window.cancelAnimationFrame(dragFrameRef.current);
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

  // Wake word detection
  useEffect(() => {
    if (!settings.wakeWordEnabled) return;

    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
        onend: (() => void) | null;
        onerror: ((event: Event) => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
        onend: (() => void) | null;
        onerror: ((event: Event) => void) | null;
        start: () => void;
        stop: () => void;
      };
    };

    const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Recognition) {
      console.warn('Speech recognition not supported for wake word detection');
      return;
    }

    let recognition: InstanceType<typeof Recognition> | null = null;
    let restartTimeout: number | null = null;

    const startRecognition = () => {
      if (recognition) return;

      recognition = new Recognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const results = event.results;
        for (let i = 0; i < results.length; i++) {
          const transcript = results[i][0]?.transcript?.toLowerCase().trim() || '';
          const wakeWord = settings.wakeWord.toLowerCase();

          if (transcript.includes(wakeWord)) {
            // Play ding sound
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.value = 0.3;
              osc.start();
              osc.stop(ctx.currentTime + 0.15);
            } catch (e) {
              console.warn('Failed to play wake sound:', e);
            }

            if (compactDismissedRef.current || isCompactChatDismissed()) return;

            // Open chat
            invoke('show_compact_chat_window', { x: 0, y: 0, w: 300, h: 400 })
              .then(() => emit('compact-chat:open', {
                mode: 'new',
                conversationId: null,
              }))
              .then(() => emit('compact-chat:focus-input', {}))
              .catch((e) => console.warn('Failed to open chat on wake word:', e));

            // Pre-fill text after wake word
            const textAfterWakeWord = transcript.replace(wakeWord, '').trim();
            if (textAfterWakeWord) {
              emit('compact-chat:prefill', { text: textAfterWakeWord }).catch(() => {});
            }

            // Pause briefly after wake word
            if (recognition) {
              recognition.onend = null;
              recognition.stop();
              recognition = null;
              restartTimeout = window.setTimeout(startRecognition, 2000);
            }
            break;
          }
        }
      };

      recognition.onend = () => {
        if (!dialogOpen) {
          restartTimeout = window.setTimeout(() => {
            recognition = null;
            startRecognition();
          }, 100);
        }
      };

      recognition.onerror = (e) => {
        console.warn('Wake word recognition error:', e);
        recognition = null;
      };

      try {
        recognition.start();
      } catch (e) {
        console.warn('Failed to start wake word recognition:', e);
        recognition = null;
      }
    };

    let disposed = false;
    invoke<boolean>('can_start_speech_recognition')
      .then((canStart) => {
        if (disposed) return;
        if (!canStart) {
          console.warn('Wake word detection disabled: speech recognition is not available in the current macOS runtime.');
          return;
        }
        startRecognition();
      })
      .catch((e) => console.warn('Failed to check speech recognition availability:', e));

    // Pause wake word detection when compact-chat is open
    const unlisten = listen('compact-chat:conversation', () => {
      if (recognition) {
        recognition.onend = null;
        recognition.stop();
        recognition = null;
      }
      if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
      }
    });

    return () => {
      disposed = true;
      if (recognition) {
        recognition.onend = null;
        recognition.stop();
      }
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }
      unlisten.then((fn) => fn());
    };
  }, [settings.wakeWordEnabled, settings.wakeWord, dialogOpen]);

  const handleBoundedDragStart = async (point: { screenX: number; screenY: number }) => {
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
      if (dialogOpen && !compactDismissedRef.current && !isCompactChatDismissed()) {
        positionCompactChatWindow({ show: false, windowLeft: nextLeft, windowTop: nextTop }).catch(() => {});
      }
    });
  };

  const handleBoundedDragEnd = () => {
    dragSessionRef.current = null;
    pendingDragPointRef.current = null;
    lastDragPositionRef.current = null;
    suppressMovedUntilRef.current = Date.now() + 800;
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
    setDragging(false);
  };

  const openLatestChat = async () => {
    try {
      const [latest] = await getConversations();
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
                onOk={startRestAction}
                onIgnore={() => {
                  if (petPrompt.id === 'focus-warning' && focusEndAtRef.current) setPetState('work');
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
              scale={settings.petScale}
              motions={settings.petMotions}
              dragging={dragging}
              onDragStart={handleBoundedDragStart}
              onDragMove={handleBoundedDragMove}
              onDragEnd={handleBoundedDragEnd}
              onMenuOpenChange={setContextMenuOpen}
            />
            {(focusEndAt || restEndAt) && (
              <div className="pointer-events-none mt-1 text-center text-[11px] font-medium tabular-nums text-muted-foreground drop-shadow-sm">
                {formatCountdown(Math.max(0, (restEndAt ?? focusEndAt ?? Date.now()) - now))}
              </div>
            )}
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
              visible={petHovering && !compactVisible}
              title="打开对话"
              onClick={() => {
                openLatestChat();
              }}
            >
              <MessageCircle className={`h-3.5 w-3.5 ${chatBurst ? "animate-chat-pop" : ""}`} />
            </FloatingToolButton>
          </div>

        </div>
      </div>
    </TooltipProvider>
  );
}

function FloatingToolButton({
  muted = false,
  opacity = 1,
  visible = false,
  title,
  onClick,
  children,
}: {
  muted?: boolean;
  opacity?: number;
  visible?: boolean;
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
        muted ? "saturate-0 hover:saturate-100" : ""
      }`}
      style={{ opacity: visible || hovered ? opacity : 0, transform: visible || hovered ? 'scale(1)' : 'scale(0.86)' }}
    >
      {children}
    </Button>
  );
}

function PetPromptBubble({
  prompt,
  onOk,
  onIgnore,
  onEndFocus,
}: {
  prompt: PetPrompt;
  onOk: () => void;
  onIgnore: () => void;
  onEndFocus: () => void;
}) {
  const isWarning = prompt.id === 'focus-warning';
  return (
    <div className="absolute left-1/2 top-[-74px] z-50 w-[196px] -translate-x-1/2 animate-pet-bubble-in rounded-[10px] border border-border/75 bg-background/96 px-2.5 py-2 text-center shadow-[0_12px_34px_rgba(32,28,22,0.16)] backdrop-blur-md">
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
      <div className="absolute bottom-[-5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-border/75 bg-background/96" />
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
  const contentWidth = clamp(requestedDialogWidth, MIN_DIALOG_WIDTH, Math.max(MIN_DIALOG_WIDTH, safeRight - safeLeft - COMPACT_CHAT_SIDE_CHROME * 2));
  const outerWidth = contentWidth + COMPACT_CHAT_SIDE_CHROME * 2;
  const availableBelow = safeBottom - (petY + petImageHeight + 12);
  const outerChromeY = COMPACT_CHAT_TOP_CHROME + COMPACT_CHAT_BOTTOM_CHROME;
  const preferredContentHeight = compact ? 128 : COMPACT_CHAT_PREFERRED_HEIGHT;
  const preferredOuterHeight = preferredContentHeight + outerChromeY;
  const belowHeight = Math.min(preferredOuterHeight, Math.max(0, availableBelow));

  if (belowHeight >= MIN_DIALOG_HEIGHT + outerChromeY) {
    return {
      x: clamp(petX - COMPACT_CHAT_SIDE_CHROME, safeLeft, Math.max(safeLeft, safeRight - outerWidth)),
      y: petY + petImageHeight + 12,
      w: outerWidth,
      h: Math.max(MIN_DIALOG_HEIGHT + outerChromeY, belowHeight),
    };
  }

  const height = Math.max(
    MIN_DIALOG_HEIGHT + outerChromeY,
    Math.min(preferredOuterHeight, Math.max(MIN_DIALOG_HEIGHT + outerChromeY, safeBottom - safeTop)),
  );
  const canPlaceRight = petX + petImageWidth + 12 + outerWidth <= safeRight;
  const x = canPlaceRight
    ? petX + petImageWidth + 12
    : petX - outerWidth - 12;
  return {
    x: clamp(x, safeLeft, Math.max(safeLeft, safeRight - outerWidth)),
    y: clamp(petY, safeTop, Math.max(safeTop, safeBottom - height)),
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
