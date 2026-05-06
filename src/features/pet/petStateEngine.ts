import { usePetStore } from './petStore';

const YAWN_IDLE_TIMEOUT = 5 * 60 * 1000;
const HAPPY_DURATION = 3000;
const YAWN_DISPLAY_DURATION = 2000;

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let stateTimer: ReturnType<typeof setTimeout> | null = null;

export function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const { petState } = usePetStore.getState();
    if (petState === 'idle') triggerYawn();
  }, YAWN_IDLE_TIMEOUT);
}

export function triggerYawn() {
  const { setPetState, mediaConfig } = usePetStore.getState();
  setPetState('yawn');
  const config = mediaConfig['yawn'];
  const dur = config.userAnimatedPath
    ? YAWN_DISPLAY_DURATION
    : config.userFrames.length > 1
      ? config.userFrames.length * config.frameInterval
      : YAWN_DISPLAY_DURATION;
  if (stateTimer) clearTimeout(stateTimer);
  stateTimer = setTimeout(() => {
    usePetStore.getState().setPetState('sleeping');
  }, dur);
}

export function triggerHappy() {
  usePetStore.getState().setPetState('happy');
  if (stateTimer) clearTimeout(stateTimer);
  stateTimer = setTimeout(() => {
    usePetStore.getState().setPetState('idle');
    resetIdleTimer();
  }, HAPPY_DURATION);
}

export function stopPetStateEngine() {
  if (idleTimer) clearTimeout(idleTimer);
  if (stateTimer) clearTimeout(stateTimer);
  idleTimer = null;
  stateTimer = null;
}
