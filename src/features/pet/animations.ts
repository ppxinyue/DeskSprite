import type { TargetAndTransition } from 'framer-motion';

export type PetState =
  | 'idle'
  | 'thinking'
  | 'speaking'
  | 'listening'
  | 'happy'
  | 'walking'
  | 'running'
  | 'sleeping'
  | 'dragging';

const IMAGE_MAP: Record<PetState, string> = {
  idle: '/assets/pet-images/cat15-front.svg',
  thinking: '/assets/pet-images/cat15-front.svg',
  speaking: '/assets/pet-images/cat15-front.svg',
  listening: '/assets/pet-images/cat15-front.svg',
  happy: '/assets/pet-images/cat15-front.svg',
  walking: '/assets/pet-images/cat15-side.svg',
  running: '/assets/pet-images/cat15-side.svg',
  sleeping: '/assets/pet-images/cat15-sleep.svg',
  dragging: '/assets/pet-images/cat15-front.svg',
};

export function getImageSrc(state: PetState): string {
  return IMAGE_MAP[state] ?? IMAGE_MAP.idle;
}

export interface AnimationConfig {
  animate: TargetAndTransition;
}

const ANIMATIONS: Record<PetState, AnimationConfig> = {
  idle: {
    animate: {
      scale: [1, 1.02, 1],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  thinking: {
    animate: {
      rotate: [-1, 1, -1],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  speaking: {
    animate: {
      y: [-2, 2, -2],
      transition: { duration: 0.3, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  listening: {
    animate: {
      boxShadow: [
        '0 0 0px rgba(59,130,246,0)',
        '0 0 12px rgba(59,130,246,0.5)',
        '0 0 0px rgba(59,130,246,0)',
      ],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  happy: {
    animate: {
      y: [0, -10, 0],
      transition: { duration: 0.5, repeat: 1, ease: 'easeOut' },
    },
  },
  walking: {
    animate: {
      x: [0, 4, 0, -4, 0],
      transition: { duration: 0.3, repeat: Infinity, ease: 'linear' },
    },
  },
  running: {
    animate: {
      x: [0, 8, 0, -8, 0],
      transition: { duration: 0.2, repeat: Infinity, ease: 'linear' },
    },
  },
  sleeping: {
    animate: {
      scale: [1, 1.01, 1],
      transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
    },
  },
  dragging: {
    animate: {
      scale: 1.05,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    },
  },
};

export function getAnimationConfig(state: PetState): AnimationConfig {
  return ANIMATIONS[state] ?? ANIMATIONS.idle;
}
