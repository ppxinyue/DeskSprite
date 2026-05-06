import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PetAvatar } from "@/features/pet/PetAvatar";
import { ChatDialog } from "@/features/chat/ChatDialog";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { usePetStore } from "@/features/pet/petStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { startAttachEngine, stopAttachEngine } from "@/features/pet/attachEngine";
import { getSetting } from "@/lib/db";
import type { PetState } from "@/features/pet/animations";
import "./index.css";

function App() {
  const [windowLabel, setWindowLabel] = useState<string>("pet");
  const { settings, loadSettings } = useSettingsStore();
  const { setDialogOpen, setPetImages } = usePetStore();

  useEffect(() => {
    const label = getCurrentWindow().label;
    setWindowLabel(label);

    // Load settings & restore pet images
    (async () => {
      await loadSettings();
      await restorePetImages(setPetImages);
    })();

    if (label === "settings") {
      document.body.classList.add("has-background");
    }
  }, []);

  // Theme sync
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

  // Global shortcut listener
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

  // Pet window
  return <PetWindow />;
}

function PetWindow() {
  const { settings } = useSettingsStore();
  const { dialogOpen, position } = usePetStore();

  // Start attach engine
  useEffect(() => {
    startAttachEngine();
    return () => stopAttachEngine();
  }, []);

  return (
    <TooltipProvider>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Pet avatar — position from petStore */}
        <div
          className="absolute pointer-events-auto"
          style={{ left: position.x, top: position.y }}
        >
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

// Step 7: Restore pet images from DB on startup
async function restorePetImages(
  setPetImages: (images: Record<PetState, string | null>) => void,
) {
  try {
    const states: PetState[] = ['idle', 'happy', 'thinking', 'sleeping', 'dragging'];
    const images: Record<string, string | null> = {};
    for (const state of states) {
      const val = await getSetting(`petImage_${state}`);
      if (val) {
        try {
          images[state] = JSON.parse(val);
        } catch {
          images[state] = val;
        }
      }
    }
    setPetImages(images as Record<PetState, string | null>);
  } catch (e) {
    console.warn('Failed to restore pet images:', e);
  }
}

export default App;
