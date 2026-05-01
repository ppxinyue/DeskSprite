import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PetAvatar } from "@/features/pet/PetAvatar";
import { ChatDialog } from "@/features/chat/ChatDialog";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { usePetStore } from "@/features/pet/petStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { startAttachEngine, stopAttachEngine, pauseAttach } from "@/features/pet/attachEngine";
import "./index.css";

function App() {
  const [windowLabel, setWindowLabel] = useState<string>("pet");
  const { settings, loadSettings } = useSettingsStore();
  const { dialogOpen, setDialogOpen, position, petState } = usePetStore();
  const [hoveringPeek, setHoveringPeek] = useState(false);

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
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle("dark", e.matches);
      };
      root.classList.toggle("dark", mq.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  // Listen for shortcut:chat-focus
  useEffect(() => {
    const unlisten = listen("shortcut:chat-focus", () => {
      if (windowLabel === "pet") {
        pauseAttach();
        setDialogOpen(true);
      }
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
  return (
    <TooltipProvider>
      <div
        className="relative h-screen w-screen overflow-hidden"
        onMouseMove={(e) => {
          // Fullscreen peering: if pet is at top-right and hidden,
          // show it when mouse approaches top-right corner
          if (petState === 'peering' && e.clientX > window.innerWidth - 200 && e.clientY < 120) {
            setHoveringPeek(true);
          }
        }}
        onMouseLeave={() => setHoveringPeek(false)}
      >
        <PetWindow
          settings={settings}
          dialogOpen={dialogOpen}
          position={position}
          hoveringPeek={hoveringPeek}
          petState={petState}
        />
      </div>
    </TooltipProvider>
  );
}

function PetWindow({
  settings,
  dialogOpen,
  position,
  hoveringPeek,
  petState,
}: {
  settings: ReturnType<typeof useSettingsStore.getState>["settings"];
  dialogOpen: boolean;
  position: { x: number; y: number };
  hoveringPeek: boolean;
  petState: string;
}) {
  // Start attach engine
  useEffect(() => {
    startAttachEngine();
    return () => stopAttachEngine();
  }, []);

  // Calculate pet visibility
  const isPeeking = petState === 'peering';
  const peekShow = isPeeking && hoveringPeek;

  const petStyle: React.CSSProperties = isPeeking
    ? {
        position: 'absolute',
        right: 20,
        top: peekShow ? 10 : -80,
        transition: 'top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }
    : {
        position: 'absolute',
        left: position.x || 20,
        top: position.y || undefined,
        bottom: position.y ? undefined : 20,
        right: position.x ? undefined : 20,
        transition: 'left 0.5s ease, top 0.5s ease',
      };

  return (
    <>
      {/* Pet */}
      <div style={petStyle} className="z-10">
        <PetAvatar
          opacity={settings.petOpacity}
          scale={settings.petScale}
        />
      </div>

      {/* Invisible hover zone for peeking pet */}
      {isPeeking && !hoveringPeek && (
        <div
          className="fixed top-0 right-0 w-48 h-28 z-20"
          onMouseEnter={() => {}}
        />
      )}

      {/* Chat dialog */}
      {dialogOpen && (
        <div
          className="absolute bottom-4 left-4 z-30"
          style={{ width: `${settings.dialogWidth}px`, maxWidth: "calc(100% - 32px)" }}
        >
          <ChatDialog />
        </div>
      )}
    </>
  );
}

export default App;
