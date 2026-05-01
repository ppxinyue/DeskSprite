import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
  const { dialogOpen } = usePetStore();

  useEffect(() => {
    const label = getCurrentWindow().label;
    setWindowLabel(label);
    loadSettings();

    // Add background class for settings window
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
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle("dark", e.matches);
      };
      root.classList.toggle("dark", mq.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  if (windowLabel === "settings") {
    return (
      <TooltipProvider>
        <SettingsPanel />
      </TooltipProvider>
    );
  }

  // Pet window - transparent, pet floats on desktop
  return (
    <TooltipProvider>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Pet avatar - positioned in lower-left */}
        <div className="absolute bottom-16 left-8 z-10">
          <PetAvatar
            opacity={settings.petOpacity}
            scale={settings.petScale}
          />
        </div>

        {/* Debug: show emoji fallback if pet image fails */}
        <noscript>
          <div className="absolute bottom-16 left-8 text-6xl">🐱</div>
        </noscript>

        {/* Chat dialog */}
        {dialogOpen && (
          <div
            className="absolute bottom-4 left-4 z-20"
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
