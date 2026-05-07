import { useEffect, useState } from "react";
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
  const [workAreaWidth, setWorkAreaWidth] = useState<number | null>(null);

  const petSize = Math.round(150 * settings.petScale);
  const petImageWidth = Math.round(120 * settings.petScale);
  const petImageHeight = Math.round(150 * settings.petScale);
  const toolButtonSize = 32;
  const toolGap = 6;
  const toolRowWidth = toolButtonSize * 4 + toolGap * 3;
  const maxDialogWidth = workAreaWidth
    ? Math.max(200, workAreaWidth - SCREEN_MARGIN * 2 - 40)
    : settings.dialogWidth;
  const dialogWidth = Math.min(settings.dialogWidth, maxDialogWidth);
  const maxDialogHeight = dialogWidth;
  const expandedWidth = Math.max(dialogWidth + 40, 20 + petImageWidth + 8 + toolRowWidth + 20);
  const expandedHeight = 20 + petSize + 12 + maxDialogHeight + 28;
  const collapsedWidth = Math.max(220, petSize + 70);
  const collapsedHeight = Math.max(220, petSize + 70);

  useEffect(() => {
    getCurrentWindow()
      .setSize(dialogOpen ? new LogicalSize(expandedWidth, expandedHeight) : new LogicalSize(collapsedWidth, collapsedHeight))
      .then(() => clampPetWindowToWorkArea())
      .catch(() => {});
  }, [dialogOpen, expandedWidth, expandedHeight, collapsedWidth, collapsedHeight]);

  useEffect(() => {
    const refreshWorkAreaWidth = async () => {
      const monitor = await currentMonitor();
      if (!monitor) return;
      setWorkAreaWidth(monitor.workArea.size.width / monitor.scaleFactor);
    };

    refreshWorkAreaWidth();
    const unlisten = getCurrentWindow().onMoved(() => {
      refreshWorkAreaWidth();
      window.setTimeout(() => { clampPetWindowToWorkArea(); }, 80);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

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
            left: 20,
            top: 20,
            width: dialogOpen ? dialogWidth : collapsedWidth - 40,
            background: 'transparent',
          }}
        >
          <PetAvatar opacity={settings.petOpacity} scale={settings.petScale} motions={settings.petMotions} />

          <div
            className="absolute z-40 flex items-center gap-1.5"
            style={{
              left: petImageWidth + 8,
              top: petImageHeight - toolButtonSize,
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
              <div className="mt-2 z-30 w-full">
                <ChatDialog
                  initialConversationId={chatConversationId}
                  initialMode={chatMode}
                  dialogOpacity={settings.petOpacity}
                  maxHeight={maxDialogHeight}
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

async function clampPetWindowToWorkArea() {
  try {
    const win = getCurrentWindow();
    const monitor = await currentMonitor();
    if (!monitor) return;
    const [position, size] = await Promise.all([win.outerPosition(), win.outerSize()]);
    const work = monitor.workArea;
    const margin = Math.round(SCREEN_MARGIN * monitor.scaleFactor);
    const minX = work.position.x + margin;
    const minY = work.position.y + margin;
    const maxX = work.position.x + work.size.width - size.width - margin;
    const maxY = work.position.y + work.size.height - size.height - margin;
    const nextX = clamp(position.x, minX, Math.max(minX, maxX));
    const nextY = clamp(position.y, minY, Math.max(minY, maxY));
    if (Math.abs(nextX - position.x) > 1 || Math.abs(nextY - position.y) > 1) {
      await win.setPosition(new PhysicalPosition(nextX, nextY));
    }
  } catch (e) {
    console.warn("Failed to clamp pet window:", e);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default App;
