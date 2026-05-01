import { invoke } from '@tauri-apps/api/core';
import { usePetStore } from './petStore';
import { useSettingsStore } from '@/features/settings/settingsStore';

interface DesktopBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  dock_visible: boolean;
  dock_rect: { x: number; y: number; width: number; height: number } | null;
  fullscreen_active: boolean;
}

export type AttachMode = 'dock_sleep' | 'fullscreen_hide' | 'desktop_float' | 'none';

const POLL_INTERVAL = 2000;
const RESUME_DELAY = 5000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let currentMode: AttachMode = 'none';
let isPaused = false;

export function startAttachEngine() {
  stopAttachEngine();
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL);
}

export function stopAttachEngine() {
  if (pollTimer) clearInterval(pollTimer);
  if (resumeTimer) clearTimeout(resumeTimer);
  pollTimer = null;
  resumeTimer = null;
  currentMode = 'none';
  isPaused = false;
}

export function pauseAttach() {
  isPaused = true;
  scheduleResume();
}

function scheduleResume() {
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    isPaused = false;
    poll();
  }, RESUME_DELAY);
}

async function poll() {
  const { settings } = useSettingsStore.getState();
  if (!settings.smartAttach || isPaused) return;

  try {
    const bounds = await invoke<DesktopBounds>('get_desktop_bounds');

    let newMode: AttachMode;
    if (bounds.fullscreen_active) {
      newMode = 'fullscreen_hide';
    } else if (bounds.dock_visible) {
      newMode = 'dock_sleep';
    } else {
      newMode = 'desktop_float';
    }

    if (newMode !== currentMode) {
      currentMode = newMode;
      applyMode(currentMode, bounds);
    }
  } catch {
    // Silently ignore
  }
}

function applyMode(mode: AttachMode, bounds: DesktopBounds) {
  const store = usePetStore.getState();

  switch (mode) {
    case 'dock_sleep': {
      // Position pet just above the dock
      store.setPetState('sleeping');
      if (bounds.dock_rect) {
        store.setPosition({
          x: bounds.dock_rect.x + bounds.dock_rect.width / 2 - 60,
          y: bounds.dock_rect.y - 160,
        });
      }
      break;
    }
    case 'fullscreen_hide': {
      // Hide at top-right corner, peek on hover
      store.setPetState('peering');
      store.setPosition({
        x: bounds.width - 130,
        y: -80, // mostly hidden, only ears visible
      });
      break;
    }
    case 'desktop_float': {
      // Float somewhere visible
      store.setPetState('idle');
      store.setPosition({
        x: bounds.width - 200,
        y: bounds.height - 250,
      });
      break;
    }
    case 'none': {
      store.setPetState('idle');
      break;
    }
  }
}
