import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layouts/AppLayout";
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

  // Pet window
  return (
    <TooltipProvider>
      <AppLayout>
        <div className="relative flex flex-col h-full w-full">
          {/* Pet avatar positioned freely */}
          <div className="absolute top-4 left-4 z-10">
            <PetAvatar
              opacity={settings.petOpacity}
              scale={settings.petScale}
            />
          </div>

          {/* Chat dialog shown when dialogOpen */}
          {dialogOpen && (
            <div
              className="absolute bottom-4 left-4 z-20"
              style={{ width: `${settings.dialogWidth}px`, maxWidth: "100%" }}
            >
              <ChatDialog />
            </div>
          )}
        </div>
      </AppLayout>
    </TooltipProvider>
  );
}

export default App;
