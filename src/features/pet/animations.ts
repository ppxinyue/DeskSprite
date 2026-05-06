export type PetState =
  | 'idle'
  | 'thinking'
  | 'sleeping';

export interface PetStateMediaConfig {
  defaultAssets: string[];
  userFrames: string[];
  frameInterval: number;
  userAnimatedPath: string | null;
  userAnimatedType: 'gif' | 'video' | null;
}

export type PetMediaConfig = Record<PetState, PetStateMediaConfig>;

export const DEFAULT_MEDIA_CONFIG: PetMediaConfig = {
  idle: {
    defaultAssets: [
      'assets/idle/idle.png',
      'assets/idle/idle2.png',
      'assets/idle/idle3.png',
      'assets/idle/idle4.png',
    ],
    userFrames: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
  thinking: {
    defaultAssets: ['assets/thinking/thinking.png'],
    userFrames: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
  sleeping: {
    defaultAssets: [
      'assets/sleeping/sleeping.png',
      'assets/sleeping/sleeping1.png',
    ],
    userFrames: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
};

export const ALL_PET_STATES: PetState[] = ['idle', 'thinking', 'sleeping'];

export const STATE_META: Record<PetState, { label: string; desc: string }> = {
  idle:     { label: '待机',   desc: '默认状态；会在多张PNG之间随机切换' },
  thinking: { label: '思考中', desc: '等待AI回复期间显示；会在多张PNG之间随机切换' },
  sleeping: { label: '睡眠',   desc: '智能附着等场景显示；会在多张PNG之间随机切换' },
};

export function isBuiltinAsset(path: string): boolean {
  return path.startsWith('assets/');
}

export function getPetFrameSources(config: PetStateMediaConfig): string[] {
  if (config.userAnimatedPath) return [config.userAnimatedPath];
  return config.userFrames.length > 0 ? config.userFrames : config.defaultAssets;
}

export function getRandomFrameSwitchDelay(): number {
  const min = 60_000;
  const max = 300_000;
  return Math.floor(min + Math.random() * (max - min));
}

export function getNextFrameIndex(current: number, frameCount: number): number {
  if (frameCount <= 1) return 0;
  let next = Math.floor(Math.random() * frameCount);
  if (next === current) next = (next + 1) % frameCount;
  return next;
}
