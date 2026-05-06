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
    if (petState === 'idle') {
      triggerYawn();
    }
  }, YAWN_IDLE_TIMEOUT);
}

export function triggerYawn() {
  const { setPetState, mediaConfig } = usePetStore.getState();
  setPetState('yawn');

  const config = mediaConfig['yawn'];
  let yawnDuration: number;
  if (config.animatedPath) {
    yawnDuration = YAWN_DISPLAY_DURATION;
  } else {
    yawnDuration = config.frames.length > 1
      ? config.frames.length * config.frameInterval
      : YAWN_DISPLAY_DURATION;
  }

  if (stateTimer) clearTimeout(stateTimer);
  stateTimer = setTimeout(() => {
    usePetStore.getState().setPetState('sleeping');
  }, yawnDuration);
}

export function triggerHappy() {
  const { setPetState } = usePetStore.getState();
  setPetState('happy');
  if (stateTimer) clearTimeout(stateTimer);
  stateTimer = setTimeout(() => {
    usePetStore.getState().setPetState('idle');
  }, HAPPY_DURATION);
}

export function stopPetStateEngine() {
  if (idleTimer) clearTimeout(idleTimer);
  if (stateTimer) clearTimeout(stateTimer);
  idleTimer = null;
  stateTimer = null;
}
