import { useEffect, useState, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PetAvatar } from "@/features/pet/PetAvatar";
import { ChatDialog } from "@/features/chat/ChatDialog";
import { HoverInputBar } from "@/features/chat/HoverInputBar";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { usePetStore } from "@/features/pet/petStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { getSetting } from "@/lib/db";
import { ALL_PET_STATES, DEFAULT_MEDIA_CONFIG } from "@/features/pet/animations";
import "./index.css";

function App() {
  const [windowLabel, setWindowLabel] = useState<string>("pet");
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
      if (windowLabel === "pet") usePetStore.getState().setDialogOpen(true);
    });
    return () => { unlisten.then(fn => fn()); };
  }, [windowLabel]);

  if (windowLabel === "settings") {
    return <TooltipProvider><SettingsPanel /></TooltipProvider>;
  }

  return <PetWindow />;
}

function PetWindow() {
  const { settings } = useSettingsStore();
  const { dialogOpen, setDialogOpen, position } = usePetStore();
  const [petHovered, setPetHovered] = useState(false);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePetAreaEnter = () => {
    if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    setPetHovered(true);
    invoke('set_cursor_passthrough', { passthrough: false }).catch(() => {});
  };

  const handlePetAreaLeave = () => {
    hoverLeaveTimer.current = setTimeout(() => setPetHovered(false), 300);
    invoke('set_cursor_passthrough', { passthrough: true }).catch(() => {});
  };

  return (
    <TooltipProvider>
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ background: 'transparent' }}>
        <div
          className="absolute pointer-events-auto"
          style={{ left: position.x, top: position.y, background: 'transparent' }}
          onMouseEnter={handlePetAreaEnter}
          onMouseLeave={handlePetAreaLeave}
        >
          <PetAvatar opacity={settings.petOpacity} scale={settings.petScale} />

          {petHovered && (
            <HoverInputBar
              petName={settings.petName}
              dialogWidth={settings.dialogWidth}
              onExpand={() => setDialogOpen(true)}
            />
          )}

          {dialogOpen && (
            <div
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-30"
              style={{ width: `${settings.dialogWidth}px` }}
            >
              <ChatDialog />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
