import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { currentMonitor, getCurrentWindow, LogicalPosition, LogicalSize, PhysicalPosition } from "@tauri-apps/api/window";
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
const MIN_DIALOG_HEIGHT = 90;
const CONTEXT_MENU_WIDTH = 112;
const CONTEXT_SUBMENU_WIDTH = 170;
const CONTEXT_MENU_HEIGHT = 180;

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
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [dialogSurfaceReady, setDialogSurfaceReady] = useState(dialogOpen);

  const petSize = Math.round(150 * settings.petScale);
  const petImageWidth = Math.round(120 * settings.petScale);
  const petImageHeight = Math.round(150 * settings.petScale);
  const toolButtonSize = 28;
  const toolGap = 4;
  const toolRowWidth = toolButtonSize * 4 + toolGap * 3;
  const collapsedWidth = Math.max(220, petSize + 70);
  const collapsedHeight = Math.max(220, petSize + 70);
  const [layout, setLayout] = useState<PetWindowLayout>(() => createDefaultPetWindowLayout(collapsedWidth, collapsedHeight));
  const [dragging, setDragging] = useState(false);
  const layoutRef = useRef(layout);
  const movedTimerRef = useRef<number | null>(null);
  const layoutApplyingRef = useRef(false);
  const dragSessionRef = useRef<BoundedDragSession | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const pendingDragPointRef = useRef<{ screenX: number; screenY: number } | null>(null);
  const suppressMovedUntilRef = useRef(0);
  const previousDialogOpenRef = useRef<boolean | null>(null);
  const applyLayoutState = useCallback((nextLayout: PetWindowLayout) => {
    layoutRef.current = nextLayout;
    setLayout(nextLayout);
  }, []);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const requestLayout = useCallback(async (overrides: { dialogOpen?: boolean; contextMenuOpen?: boolean } = {}) => {
    const targetDialogOpen = overrides.dialogOpen ?? dialogOpen;
    const targetContextMenuOpen = overrides.contextMenuOpen ?? contextMenuOpen;
    layoutApplyingRef.current = true;
    try {
      await applyPetWindowLayout({
        dialogOpen: targetDialogOpen,
        requestedDialogWidth: settings.dialogWidth,
        petImageWidth,
        petImageHeight,
        toolRowWidth,
        collapsedWidth,
        collapsedHeight,
        contextMenuOpen: targetContextMenuOpen,
        previousLayout: layoutRef.current,
        applyLayout: applyLayoutState,
      });
    } finally {
      window.setTimeout(() => {
        layoutApplyingRef.current = false;
      }, 80);
    }
  }, [applyLayoutState, dialogOpen, settings.dialogWidth, petImageWidth, petImageHeight, toolRowWidth, collapsedWidth, collapsedHeight, contextMenuOpen]);

  useEffect(() => {
    if (previousDialogOpenRef.current === dialogOpen) return;
    previousDialogOpenRef.current = dialogOpen;
    let cancelled = false;
    if (dialogOpen) setDialogSurfaceReady(false);
    requestLayout({ dialogOpen }).then(() => {
      if (!cancelled) setDialogSurfaceReady(dialogOpen);
    });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, requestLayout]);

  useEffect(() => {
    if (!dialogOpen) return;
    requestLayout({ dialogOpen: true }).catch(() => {});
  }, [settings.dialogWidth, settings.compactChatFontSize, requestLayout, dialogOpen]);

  useEffect(() => {
    if (dialogOpen) return;
    requestLayout({ dialogOpen: false, contextMenuOpen }).catch(() => {});
  }, [contextMenuOpen, dialogOpen, requestLayout]);

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
      }, 220);
    });
    return () => {
      if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
      unlisten.then((fn) => fn());
    };
  }, [requestLayout]);

  useEffect(() => () => {
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
    if (dragFrameRef.current) window.cancelAnimationFrame(dragFrameRef.current);
  }, []);

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
      suppressMovedUntilRef.current = Date.now() + 180;
      getCurrentWindow().setPosition(new LogicalPosition(nextLeft, nextTop)).catch(() => {});
    });
  };

  const handleBoundedDragEnd = () => {
    dragSessionRef.current = null;
    pendingDragPointRef.current = null;
    suppressMovedUntilRef.current = Date.now() + 800;
    if (movedTimerRef.current) window.clearTimeout(movedTimerRef.current);
    setDragging(false);
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
    const id = getChatConversationIdForHandoff(chatConversationId);
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
              onDragStart={handleBoundedDragStart}
              onDragMove={handleBoundedDragMove}
              onDragEnd={handleBoundedDragEnd}
              onMenuOpenChange={setContextMenuOpen}
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
                if (dialogOpen) {
                  setDialogSurfaceReady(false);
                  closeChat();
                } else openLatestChat();
              }}
            >
              {dialogOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </FloatingToolButton>
            {dialogOpen && dialogSurfaceReady && (
              <>
                <FloatingToolButton muted opacity={settings.petOpacity} title="图片输入" onClick={() => window.dispatchEvent(new CustomEvent("desksprite:chat-image"))}>
                  <ImagePlus className="h-3.5 w-3.5" />
                </FloatingToolButton>
                <FloatingToolButton muted opacity={settings.petOpacity} title="语音输入" onClick={() => window.dispatchEvent(new CustomEvent("desksprite:chat-voice"))}>
                  <Mic className="h-3.5 w-3.5" />
                </FloatingToolButton>
                <FloatingToolButton muted opacity={settings.petOpacity} title="放大" onClick={expandToStandaloneChat}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </FloatingToolButton>
              </>
            )}
          </div>

          {dialogOpen && dialogSurfaceReady && (
            <>
              <div
                className="absolute z-30"
                style={{ left: layout.dialogLeft, top: layout.dialogTop, width: layout.dialogWidth }}
              >
                <ChatDialog
                  initialConversationId={chatConversationId}
                  initialMode={chatMode}
                  dialogOpacity={settings.petOpacity}
                  compactFontSize={settings.compactChatFontSize}
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
      className={`h-7 w-7 rounded-[8px] border border-[var(--color-chat-border)] bg-[var(--color-chat-bg)] p-0 text-[var(--color-chat-muted)] shadow-none transition-all hover:bg-[color-mix(in_srgb,var(--color-chat-text)_8%,transparent)] hover:text-[var(--color-chat-text)] ${
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

function getChatConversationIdForHandoff(storeConversationId: number | null): number | null {
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
  contextMenuOpen,
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
  contextMenuOpen: boolean;
  previousLayout: PetWindowLayout;
  applyLayout: (layout: PetWindowLayout) => void;
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
    if (!dialogOpen && !contextMenuOpen) {
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
        toolsTop: PET_CONTENT_MARGIN + petImageHeight - 28,
      };
    } else if (!dialogOpen && contextMenuOpen) {
      const menuWindowWidth = Math.min(
        maxWindowWidth,
        Math.max(
          collapsedWidth,
          petImageWidth + 8 + CONTEXT_MENU_WIDTH + CONTEXT_SUBMENU_WIDTH + PET_CONTENT_MARGIN * 2,
        ),
      );
      const menuWindowHeight = Math.min(
        maxWindowHeight,
        Math.max(collapsedHeight, petImageHeight + PET_CONTENT_MARGIN * 2, CONTEXT_MENU_HEIGHT + PET_CONTENT_MARGIN * 2),
      );
      const placeRight = safePetX - PET_CONTENT_MARGIN + menuWindowWidth <= safeRight;
      const placeBelow = safePetY - PET_CONTENT_MARGIN + menuWindowHeight <= safeBottom;
      const petLeft = placeRight
        ? PET_CONTENT_MARGIN
        : Math.max(PET_CONTENT_MARGIN, menuWindowWidth - petImageWidth - PET_CONTENT_MARGIN);
      const petTop = placeBelow
        ? PET_CONTENT_MARGIN
        : Math.max(PET_CONTENT_MARGIN, menuWindowHeight - petImageHeight - PET_CONTENT_MARGIN);

      layout = {
        windowWidth: menuWindowWidth,
        windowHeight: menuWindowHeight,
        petLeft,
        petTop,
        dialogLeft: PET_CONTENT_MARGIN,
        dialogTop: PET_CONTENT_MARGIN,
        dialogWidth: requestedDialogWidth,
        dialogMaxHeight: requestedDialogWidth,
        toolsLeft: placeRight
          ? petLeft + petImageWidth + 8
          : Math.max(PET_CONTENT_MARGIN, petLeft - toolRowWidth - 8),
        toolsTop: petTop + petImageHeight - 28,
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
