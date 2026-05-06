export type PetState =
  | 'idle'
  | 'yawn'
  | 'happy'
  | 'sleeping'
  | 'running'
  | 'thinking';

export interface PetStateMediaConfig {
  frames: string[];
  frameInterval: number;
  animatedPath: string | null;
  animatedType: 'gif' | 'video' | null;
}

export type PetMediaConfig = Record<PetState, PetStateMediaConfig>;

export const DEFAULT_MEDIA_CONFIG: PetMediaConfig = {
  idle:     { frames: ['assets/pet-images/cat15-front.png'],    frameInterval: 150, animatedPath: null, animatedType: null },
  yawn:     { frames: ['assets/pet-images/cat15-wondering.png'], frameInterval: 150, animatedPath: null, animatedType: null },
  happy:    { frames: ['assets/pet-images/cat15-front.png'],    frameInterval: 150, animatedPath: null, animatedType: null },
  sleeping: { frames: ['assets/pet-images/cat15-sleeping.png'], frameInterval: 150, animatedPath: null, animatedType: null },
  running:  { frames: ['assets/pet-images/cat15-side.png'],     frameInterval: 150, animatedPath: null, animatedType: null },
  thinking: { frames: ['assets/pet-images/cat15-wondering.png'], frameInterval: 150, animatedPath: null, animatedType: null },
};

export function needsFrameAnimation(config: PetStateMediaConfig): boolean {
  return config.animatedPath === null && config.frames.length > 1;
}

export function isBuiltinAsset(path: string): boolean {
  return path.startsWith('assets/');
}
