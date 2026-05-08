export type PetState =
  | 'idle'
  | 'thinking'
  | 'sleeping';

export interface PetStateMediaConfig {
  mediaMode: 'image' | 'gif';
  defaultAssets: string[];
  defaultGifAssets: string[];
  userFrames: string[];
  userGifs: string[];
  disabledFrames?: string[];
  disabledGifs?: string[];
  frameInterval: number;
  userAnimatedPath: string | null;
  userAnimatedType: 'gif' | 'video' | null;
}

export type PetMediaConfig = Record<PetState, PetStateMediaConfig>;

export const DEFAULT_MEDIA_CONFIG: PetMediaConfig = {
  idle: {
    mediaMode: 'gif',
    defaultAssets: [
      'assets/idle/idle.png',
      'assets/idle/idle2.png',
      'assets/idle/idle3.png',
      'assets/idle/idle4.png',
    ],
    defaultGifAssets: ['assets/GIF/blink.GIF'],
    userFrames: [],
    userGifs: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
  thinking: {
    mediaMode: 'gif',
    defaultAssets: ['assets/thinking/thinking.png'],
    defaultGifAssets: ['assets/GIF/blink.GIF'],
    userFrames: [],
    userGifs: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
  sleeping: {
    mediaMode: 'gif',
    defaultAssets: [
      'assets/sleeping/sleeping.png',
      'assets/sleeping/sleeping1.png',
    ],
    defaultGifAssets: ['assets/GIF/blink.GIF'],
    userFrames: [],
    userGifs: [],
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

export function getBuiltinAssetUrl(path: string): string {
  const cleanPath = path.replace(/^\/+/, '');
  return new URL(`/${cleanPath}`, window.location.href).toString();
}

export function isGifAsset(path: string): boolean {
  return path.split(/[?#]/)[0]?.toLowerCase().endsWith('.gif') ?? false;
}

export function normalizePetMediaConfig(state: PetState, raw?: Partial<PetStateMediaConfig> | null): PetStateMediaConfig {
  const defaults = DEFAULT_MEDIA_CONFIG[state];
  if (!raw) return defaults;
  const hasExplicitMode = raw.mediaMode === 'image' || raw.mediaMode === 'gif';
  return {
    ...defaults,
    ...raw,
    mediaMode: hasExplicitMode ? raw.mediaMode! : defaults.mediaMode,
    defaultAssets: raw.defaultAssets?.length ? raw.defaultAssets : defaults.defaultAssets,
    defaultGifAssets: raw.defaultGifAssets?.length ? raw.defaultGifAssets : defaults.defaultGifAssets,
    userFrames: raw.userFrames ?? defaults.userFrames,
    userGifs: raw.userGifs ?? defaults.userGifs,
    disabledFrames: raw.disabledFrames ?? defaults.disabledFrames,
    disabledGifs: raw.disabledGifs ?? defaults.disabledGifs,
  };
}

export function getPetFrameSources(config: PetStateMediaConfig, userFrames?: string[], userGifs?: string[]): string[] {
  if (config.userAnimatedPath) return [config.userAnimatedPath];
  const useGif = config.mediaMode === 'gif';
  const disabled = new Set(useGif ? config.disabledGifs ?? [] : config.disabledFrames ?? []);
  const defaults = useGif ? config.defaultGifAssets : config.defaultAssets;
  const userSources = useGif ? userGifs ?? config.userGifs : userFrames ?? config.userFrames;
  const sources = Array.from(new Set([...defaults, ...userSources]));
  const enabled = sources.filter((source) => !disabled.has(source));
  return enabled.length > 0 ? enabled : defaults;
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
