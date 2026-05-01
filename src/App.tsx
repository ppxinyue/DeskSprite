import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PetAvatar } from "@/features/pet/PetAvatar";
import { ChatDialog } from "@/features/chat/ChatDialog";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { usePetStore } from "@/features/pet/petStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import "./index.css";

function App() {
  const [windowLabel, setWindowLabel] = useState<string>("pet");
  const { settings, loadSettings } = useSettingsStore();
  const { dialogOpen, setDialogOpen } = usePetStore();

  useEffect(() => {
    const label = getCurrentWindow().label;
    setWindowLabel(label);
    loadSettings();

    if (label === "settings") {
      document.body.classList.add("has-background");
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else if (settings.theme === "light") {
      root.classList.remove("dark");
    } else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => root.classList.toggle("dark", e.matches);
      root.classList.toggle("dark", mq.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  useEffect(() => {
    const unlisten = listen("shortcut:chat-focus", () => {
      if (windowLabel === "pet") setDialogOpen(true);
    });
    return () => { unlisten.then(fn => fn()); };
  }, [windowLabel]);

  if (windowLabel === "settings") {
    return (
      <TooltipProvider>
        <SettingsPanel />
      </TooltipProvider>
    );
  }

  // Pet window - full screen transparent overlay
  return (
    <TooltipProvider>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Pet avatar at bottom-left, clickable */}
        <div className="absolute bottom-20 left-8 pointer-events-auto">
          <PetAvatar opacity={settings.petOpacity} scale={settings.petScale} />
        </div>

        {/* Chat dialog */}
        {dialogOpen && (
          <div
            className="absolute bottom-4 left-4 z-30 pointer-events-auto"
            style={{ width: `${settings.dialogWidth}px`, maxWidth: "calc(100% - 32px)" }}
          >
            <ChatDialog />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default App;
