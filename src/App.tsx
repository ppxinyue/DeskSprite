import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { ImagePlus, Maximize2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PetAvatar } from "@/features/pet/PetAvatar";
import { ChatDialog } from "@/features/chat/ChatDialog";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { usePetStore } from "@/features/pet/petStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { getSetting } from "@/lib/db";
import { ALL_PET_STATES, DEFAULT_MEDIA_CONFIG } from "@/features/pet/animations";
import "./index.css";

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
    return (
      <TooltipProvider>
        <div className="h-screen w-screen bg-background text-foreground">
          <ChatDialog initialMode="new" maxHeight={760} standalone />
        </div>
      </TooltipProvider>
    );
  }

  return <PetWindow />;
}

function PetWindow() {
  const { settings } = useSettingsStore();
  const { dialogOpen, chatMode, chatConversationId, closeChat } = usePetStore();

  const petSize = Math.round(150 * settings.petScale);
  const petImageWidth = Math.round(120 * settings.petScale);
  const petImageHeight = Math.round(150 * settings.petScale);
  const toolButtonSize = 32;
  const toolGap = 6;
  const toolRowWidth = toolButtonSize * 3 + toolGap * 2;
  const maxDialogHeight = settings.dialogWidth;
  const expandedWidth = Math.max(settings.dialogWidth + 40, 20 + petImageWidth + 8 + toolRowWidth + 20);
  const expandedHeight = 20 + petSize + 12 + maxDialogHeight + 28;
  const collapsedWidth = Math.max(220, petSize + 70);
  const collapsedHeight = Math.max(220, petSize + 70);

  useEffect(() => {
    getCurrentWindow()
      .setSize(dialogOpen ? new LogicalSize(expandedWidth, expandedHeight) : new LogicalSize(collapsedWidth, collapsedHeight))
      .catch(() => {});
  }, [dialogOpen, expandedWidth, expandedHeight, collapsedWidth, collapsedHeight]);

  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload }) => {
      if (!payload) closeChat();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [closeChat]);

  return (
    <TooltipProvider>
      <div className="fixed inset-0 overflow-hidden" style={{ background: 'transparent' }}>
        <div
          className="absolute flex flex-col items-start"
          style={{
            left: 20,
            top: 20,
            width: dialogOpen ? settings.dialogWidth : collapsedWidth - 40,
            background: 'transparent',
          }}
        >
          <PetAvatar opacity={settings.petOpacity} scale={settings.petScale} />

          {dialogOpen && (
            <>
              <div
                className="absolute z-40 flex items-center gap-1.5"
                style={{
                  left: petImageWidth + 8,
                  top: petImageHeight - toolButtonSize,
                }}
              >
                <FloatingToolButton title="图片输入" onClick={() => window.dispatchEvent(new CustomEvent("desksprite:chat-image"))}>
                  <ImagePlus className="h-4 w-4" />
                </FloatingToolButton>
                <FloatingToolButton title="语音输入" onClick={() => window.dispatchEvent(new CustomEvent("desksprite:chat-voice"))}>
                  <Mic className="h-4 w-4" />
                </FloatingToolButton>
                <FloatingToolButton title="放大" onClick={() => invoke("show_chat_window").catch(() => {})}>
                  <Maximize2 className="h-4 w-4" />
                </FloatingToolButton>
              </div>
              <div className="mt-2 z-30 w-full">
                <ChatDialog
                  initialConversationId={chatConversationId}
                  initialMode={chatMode}
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
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      onClick={onClick}
      className="h-8 w-8 rounded-full border border-border/40 bg-popover/75 p-0 text-popover-foreground shadow-lg backdrop-blur-xl hover:bg-accent"
    >
      {children}
    </Button>
  );
}

export default App;
