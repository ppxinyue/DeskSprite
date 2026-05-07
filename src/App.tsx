import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { currentMonitor, getCurrentWindow, LogicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import { ChevronLeft, ChevronRight, ImagePlus, Maximize2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PetAvatar } from "@/features/pet/PetAvatar";
import { ChatDialog } from "@/features/chat/ChatDialog";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { usePetStore } from "@/features/pet/petStore";
import { useChatStore } from "@/features/chat/chatStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { getConversations, getSetting } from "@/lib/db";
import { ALL_PET_STATES, DEFAULT_MEDIA_CONFIG } from "@/features/pet/animations";
import "./index.css";

const CHAT_HANDOFF_KEY = "desksprite:chat-handoff-conversation-id";
const SCREEN_MARGIN = 16;
const PET_CONTENT_MARGIN = 20;
const MIN_DIALOG_WIDTH = 200;

function App() {
  const [windowLabel, setWindowLabel] = useState<string>(() => getCurrentWindow().label);
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    const label = getCurrentWindow().label;
    setWindowLabel(label);

    loadSettings().then(async () => {
      for (const state of ALL_PET_STATES) {
        try {
          const raw = await getSetting(`petMedia_${state}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            usePetStore.getState().setStateMediaConfig(state, { ...DEFAULT_MEDIA_CONFIG[state], ...parsed });
          }
        } catch { /* use default */ }
      }
    });

    if (label === "settings") {
      document.body.classList.add("has-background");
    }
    if (label === "chat") {
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
      loadSettings().catch(() => {});
    });
    return () => { unlisten.then(fn => fn()); };
  }, [loadSettings]);

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

  return <PetWindow />;
}

function PetWindow() {
  const { settings } = useSettingsStore();
  const { dialogOpen, chatMode, chatConversationId, closeChat, openChat } = usePetStore();

  const petSize = Math.round(150 * settings.petScale);
  const petImageWidth = Math.round(120 * settings.petScale);
  const petImageHeight = Math.round(150 * settings.petScale);
  const toolButtonSize = 32;
  const toolGap = 6;
  const toolRowWidth = toolButtonSize * 4 + toolGap * 3;
  const collapsedWidth = Math.max(220, petSize + 70);
  const collapsedHeight = Math.max(220, petSize + 70);
  const [layout, setLayout] = useState<PetWindowLayout>(() => createDefaultPetWindowLayout(collapsedWidth, collapsedHeight));
  const [dragging, setDragging] = useState(false);
  const layoutRef = useRef(layout);
  const movedTimerRef = useRef<number | null>(null);
  const layoutApplyingRef = useRef(false);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const requestLayout = useCallback(async () => {
    layoutApplyingRef.current = true;
    try {
      await applyPetWindowLayout({
        dialogOpen,
        requestedDialogWidth: settings.dialogWidth,
        petImageWidth,
        petImageHeight,
        toolRowWidth,
        collapsedWidth,
        collapsedHeight,
        previousLayout: layoutRef.current,
        setLayout,
      });
    } finally {
      window.setTimeout(() => {
        layoutApplyingRef.current = false;
      }, 80);
    }
  }, [dialogOpen, settings.dialogWidth, petImageWidth, petImageHeight, toolRowWidth, collapsedWidth, collapsedHeight]);

  useEffect(() => {
    requestLayout();
  }, [requestLayout]);

  useEffect(() => {
    const unlisten = getCurrentWindow().onMoved(() => {
      if (layoutApplyingRef.current) return;
      setDragging(true);
      if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
      movedTimerRef.current = window.setTimeout(() => {
        setDragging(false);
        requestLayout();
      }, 220);
    });
    return () => {
      if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
      unlisten.then((fn) => fn());
    };
  }, [requestLayout]);

  useEffect(() => () => {
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
  }, []);

  const handleNativeDragStart = () => {
    setDragging(true);
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
  };

  const handleNativeDragEnd = () => {
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
    movedTimerRef.current = window.setTimeout(() => {
      setDragging(false);
      requestLayout();
    }, 180);
  };

  const openLatestChat = async () => {
    try {
      const [latest] = await getConversations();
      if (latest) {
        openChat('history', latest.id);
        return;
      }
    } catch (e) {
      console.warn('Failed to open latest chat:', e);
    }
    openChat('new');
  };

  const expandToStandaloneChat = async () => {
    const id = useChatConversationIdForHandoff(chatConversationId);
    if (id) {
      localStorage.setItem(CHAT_HANDOFF_KEY, String(id));
    } else {
      localStorage.removeItem(CHAT_HANDOFF_KEY);
    }
    closeChat();
    try {
      await invoke("show_chat_window");
      await emit("chat:open-conversation", { conversationId: id });
    } catch (e) {
      console.warn("Failed to expand chat window:", e);
    }
  };

  return (
    <TooltipProvider>
      <div className="fixed inset-0 overflow-hidden" style={{ background: 'transparent' }}>
        <div
          className="absolute flex flex-col items-start"
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
            <PetAvatar
              opacity={settings.petOpacity}
              scale={settings.petScale}
              motions={settings.petMotions}
              dragging={dragging}
              onDragStart={handleNativeDragStart}
              onDragEnd={handleNativeDragEnd}
            />
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
              title={dialogOpen ? "收起对话" : "展开对话"}
              onClick={() => {
                if (dialogOpen) closeChat();
                else openLatestChat();
              }}
            >
              {dialogOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </FloatingToolButton>
            {dialogOpen && (
              <>
                <FloatingToolButton muted opacity={settings.petOpacity} title="图片输入" onClick={() => window.dispatchEvent(new CustomEvent("desksprite:chat-image"))}>
                  <ImagePlus className="h-4 w-4" />
                </FloatingToolButton>
                <FloatingToolButton muted opacity={settings.petOpacity} title="语音输入" onClick={() => window.dispatchEvent(new CustomEvent("desksprite:chat-voice"))}>
                  <Mic className="h-4 w-4" />
                </FloatingToolButton>
                <FloatingToolButton muted opacity={settings.petOpacity} title="放大" onClick={expandToStandaloneChat}>
                  <Maximize2 className="h-4 w-4" />
                </FloatingToolButton>
              </>
            )}
          </div>

          {dialogOpen && (
            <>
              <div
                className="absolute z-30"
                style={{ left: layout.dialogLeft, top: layout.dialogTop, width: layout.dialogWidth }}
              >
                <ChatDialog
                  initialConversationId={chatConversationId}
                  initialMode={chatMode}
                  dialogOpacity={settings.petOpacity}
                  maxHeight={layout.dialogMaxHeight}
                  onClose={closeChat}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function FloatingToolButton({
  muted = false,
  opacity = 1,
  title,
  onClick,
  children,
}: {
  muted?: boolean;
  opacity?: number;
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
      className={`h-8 w-8 rounded-[10px] border border-[var(--color-chat-border)] bg-[var(--color-chat-bg)] p-0 text-[var(--color-chat-muted)] shadow-none transition-all hover:bg-[color-mix(in_srgb,var(--color-chat-text)_8%,transparent)] hover:text-[var(--color-chat-text)] ${
        muted ? "saturate-0 hover:saturate-100" : ""
      }`}
      style={{ opacity: muted && !hovered ? opacity * 0.42 : opacity }}
    >
      {children}
    </Button>
  );
}

function readChatHandoffConversationId(): number | null {
  const raw = localStorage.getItem(CHAT_HANDOFF_KEY);
  localStorage.removeItem(CHAT_HANDOFF_KEY);
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

function useChatConversationIdForHandoff(storeConversationId: number | null): number | null {
  const current = useChatStore.getState().currentConversationId ?? usePetStore.getState().chatConversationId ?? storeConversationId;
  return current && current > 0 ? current : null;
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

function createDefaultPetWindowLayout(width: number, height: number): PetWindowLayout {
  return {
    windowWidth: width,
    windowHeight: height,
    petLeft: PET_CONTENT_MARGIN,
    petTop: PET_CONTENT_MARGIN,
    dialogLeft: PET_CONTENT_MARGIN,
    dialogTop: PET_CONTENT_MARGIN,
    dialogWidth: 300,
    dialogMaxHeight: 300,
    toolsLeft: PET_CONTENT_MARGIN + 128,
    toolsTop: PET_CONTENT_MARGIN + 118,
  };
}

async function applyPetWindowLayout({
  dialogOpen,
  requestedDialogWidth,
  petImageWidth,
  petImageHeight,
  toolRowWidth,
  collapsedWidth,
  collapsedHeight,
  previousLayout,
  setLayout,
}: {
  dialogOpen: boolean;
  requestedDialogWidth: number;
  petImageWidth: number;
  petImageHeight: number;
  toolRowWidth: number;
  collapsedWidth: number;
  collapsedHeight: number;
  previousLayout: PetWindowLayout;
  setLayout: (layout: PetWindowLayout) => void;
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
      layout = {
        windowWidth: collapsedWidth,
        windowHeight: collapsedHeight,
        petLeft: PET_CONTENT_MARGIN,
        petTop: PET_CONTENT_MARGIN,
        dialogLeft: PET_CONTENT_MARGIN,
        dialogTop: PET_CONTENT_MARGIN,
        dialogWidth: requestedDialogWidth,
        dialogMaxHeight: requestedDialogWidth,
        toolsLeft: PET_CONTENT_MARGIN + petImageWidth + 8,
        toolsTop: PET_CONTENT_MARGIN + petImageHeight - 32,
      };
    } else {
      const maxDialogWidth = Math.max(MIN_DIALOG_WIDTH, maxWindowWidth - PET_CONTENT_MARGIN * 2);
      const dialogWidth = clamp(requestedDialogWidth, MIN_DIALOG_WIDTH, maxDialogWidth);
      const dialogMaxHeight = Math.max(120, Math.min(dialogWidth, maxWindowHeight - petImageHeight - PET_CONTENT_MARGIN * 2 - 12));
      const expandedWindowWidth = Math.min(
        maxWindowWidth,
        Math.max(
          dialogWidth + PET_CONTENT_MARGIN * 2,
          petImageWidth + 8 + toolRowWidth + PET_CONTENT_MARGIN * 2,
        ),
      );
      const expandedWindowHeight = Math.min(
        maxWindowHeight,
        petImageHeight + dialogMaxHeight + PET_CONTENT_MARGIN * 2 + 12,
      );
      const placeRight = safePetX - PET_CONTENT_MARGIN + expandedWindowWidth <= safeRight;
      const placeBelow = safePetY - PET_CONTENT_MARGIN + expandedWindowHeight <= safeBottom;

      const petLeft = placeRight
        ? PET_CONTENT_MARGIN
        : Math.max(PET_CONTENT_MARGIN, expandedWindowWidth - petImageWidth - PET_CONTENT_MARGIN);
      const petTop = placeBelow
        ? PET_CONTENT_MARGIN
        : Math.max(PET_CONTENT_MARGIN, expandedWindowHeight - petImageHeight - PET_CONTENT_MARGIN);
      const dialogLeft = placeRight
        ? PET_CONTENT_MARGIN
        : Math.max(PET_CONTENT_MARGIN, expandedWindowWidth - dialogWidth - PET_CONTENT_MARGIN);
      const dialogTop = placeBelow
        ? petTop + petImageHeight + 12
        : PET_CONTENT_MARGIN;

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
        toolsTop: petTop + petImageHeight - 32,
      };
    }

    const nextWindowLeft = clamp(safePetX - layout.petLeft, safeLeft, Math.max(safeLeft, safeRight - layout.windowWidth));
    const nextWindowTop = clamp(safePetY - layout.petTop, safeTop, Math.max(safeTop, safeBottom - layout.windowHeight));
    if (!layoutsEqual(previousLayout, layout)) setLayout(layout);

    const nextX = Math.round(nextWindowLeft * scale);
    const nextY = Math.round(nextWindowTop * scale);
    const shouldMove = Math.abs(position.x - nextX) > 1 || Math.abs(position.y - nextY) > 1;
    const shouldResize =
      Math.abs(windowWidth - layout.windowWidth) > 1 ||
      Math.abs(windowHeight - layout.windowHeight) > 1;
    const updates: Array<Promise<void>> = [];
    if (shouldMove) updates.push(win.setPosition(new PhysicalPosition(nextX, nextY)));
    if (shouldResize) updates.push(win.setSize(new LogicalSize(layout.windowWidth, layout.windowHeight)));
    if (updates.length > 0) await Promise.all(updates);
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
