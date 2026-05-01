import { invoke } from '@tauri-apps/api/core';
import { usePetStore } from './petStore';
import { useSettingsStore } from '@/features/settings/settingsStore';
import type { PetState } from './animations';

interface DesktopBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  dock_visible: boolean;
  dock_rect: { x: number; y: number; width: number; height: number } | null;
  fullscreen_active: boolean;
}

export type AttachMode = 'dock_sleep' | 'window_edge' | 'fullscreen_float' | 'none';

const POLL_INTERVAL = 2000;
const RESUME_DELAY = 5000;
const WALK_INTERVAL_MIN = 8000;
const WALK_INTERVAL_MAX = 15000;
const FLOAT_INTERVAL_MIN = 5000;
const FLOAT_INTERVAL_MAX = 10000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let walkTimer: ReturnType<typeof setTimeout> | null = null;
let floatTimer: ReturnType<typeof setTimeout> | null = null;
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
  if (walkTimer) clearTimeout(walkTimer);
  if (floatTimer) clearTimeout(floatTimer);
  if (resumeTimer) clearTimeout(resumeTimer);
  pollTimer = null;
  walkTimer = null;
  floatTimer = null;
  resumeTimer = null;
  currentMode = 'none';
  isPaused = false;
}

export function pauseAttach() {
  isPaused = true;
  if (walkTimer) clearTimeout(walkTimer);
  if (floatTimer) clearTimeout(floatTimer);
  scheduleResume();
}

function scheduleResume() {
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    isPaused = false;
    applyMode(currentMode);
  }, RESUME_DELAY);
}

async function poll() {
  const { settings } = useSettingsStore.getState();
  if (!settings.smartAttach) return;

  try {
    const bounds = await invoke<DesktopBounds>('get_desktop_bounds');
    if (isPaused) return;

    let newMode: AttachMode;
    if (bounds.fullscreen_active) {
      newMode = 'fullscreen_float';
    } else if (bounds.dock_visible && bounds.dock_rect) {
      newMode = 'dock_sleep';
    } else {
      newMode = 'window_edge';
    }

    if (newMode !== currentMode) {
      currentMode = newMode;
      applyMode(currentMode);
    }
  } catch {
    // Silently ignore polling errors
  }
}

function applyMode(mode: AttachMode) {
  const store = usePetStore.getState();
  const { settings } = useSettingsStore.getState();

  if (walkTimer) clearTimeout(walkTimer);
  if (floatTimer) clearTimeout(floatTimer);

  const activity = settings.attachActivity;
  const walkChance = activity === 'high' ? 0.8 : activity === 'medium' ? 0.5 : 0.2;

  switch (mode) {
    case 'dock_sleep': {
      store.setPetState('sleeping');
      // Position near dock
      break;
    }
    case 'window_edge': {
      store.setPetState('idle');
      // Schedule random walking
      scheduleWalk(walkChance);
      break;
    }
    case 'fullscreen_float': {
      store.setPetState('idle');
      // Schedule random floating
      scheduleFloat();
      break;
    }
    case 'none': {
      store.setPetState('idle');
      break;
    }
  }
}

function scheduleWalk(chance: number) {
  const delay = randomBetween(WALK_INTERVAL_MIN, WALK_INTERVAL_MAX);
  walkTimer = setTimeout(() => {
    if (isPaused || currentMode !== 'window_edge') return;
    if (Math.random() < chance) {
      const store = usePetStore.getState();
      store.setPetState('walking');
      setTimeout(() => {
        if (!isPaused && currentMode === 'window_edge') {
          store.setPetState('idle');
          scheduleWalk(chance);
        }
      }, 2000 + Math.random() * 3000);
    } else {
      scheduleWalk(chance);
    }
  }, delay);
}

function scheduleFloat() {
  const delay = randomBetween(FLOAT_INTERVAL_MIN, FLOAT_INTERVAL_MAX);
  floatTimer = setTimeout(() => {
    if (isPaused || currentMode !== 'fullscreen_float') return;
    const states: PetState[] = ['idle', 'thinking', 'sleeping'];
    const state = states[Math.floor(Math.random() * states.length)];
    usePetStore.getState().setPetState(state);
    scheduleFloat();
  }, delay);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
