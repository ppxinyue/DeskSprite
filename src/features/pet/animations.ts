export type PetState =
  | 'idle'
  | 'rest'
  | 'work'
  | 'drinking'
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
      'assets/idle/png/idle.png',
      'assets/idle/png/idle2.png',
      'assets/idle/png/idle3.png',
      'assets/idle/png/sleeping.png',
      'assets/idle/png/sleeping1.png',
    ],
    defaultGifAssets: [
      'assets/idle/gif/blink.GIF',
      'assets/idle/gif/grooming.GIF',
      'assets/idle/gif/idle_clean_1.GIF',
      'assets/idle/gif/sleeping_raw_2.GIF',
    ],
    userFrames: [],
    userGifs: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
  rest: {
    mediaMode: 'gif',
    defaultAssets: ['assets/idle/png/sleeping.png'],
    defaultGifAssets: [
      'assets/rest/gif/idle_raw_1.GIF',
      'assets/rest/gif/drinking_raw.GIF',
      'assets/rest/gif/IMG_3452.GIF',
      'assets/rest/gif/IMG_3453.GIF',
      'assets/rest/gif/IMG_3454.GIF',
      'assets/rest/gif/IMG_3455.GIF',
      'assets/rest/gif/IMG_3456.GIF',
      'assets/rest/gif/IMG_3457.GIF',
      'assets/rest/gif/IMG_3458.GIF',
    ],
    userFrames: [],
    userGifs: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
  work: {
    mediaMode: 'gif',
    defaultAssets: ['assets/idle/png/idle.png'],
    defaultGifAssets: ['assets/work/gif/working_clean.GIF'],
    userFrames: [],
    userGifs: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
  drinking: {
    mediaMode: 'gif',
    defaultAssets: ['assets/idle/png/idle2.png'],
    defaultGifAssets: ['assets/rest/gif/drinking_raw.GIF'],
    userFrames: [],
    userGifs: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
  thinking: {
    mediaMode: 'gif',
    defaultAssets: ['assets/idle/png/idle.png'],
    defaultGifAssets: ['assets/idle/gif/grooming.GIF'],
    userFrames: [],
    userGifs: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
  sleeping: {
    mediaMode: 'gif',
    defaultAssets: ['assets/idle/png/sleeping.png', 'assets/idle/png/sleeping1.png'],
    defaultGifAssets: ['assets/idle/gif/sleeping_raw_2.GIF'],
    userFrames: [],
    userGifs: [],
    frameInterval: 150,
    userAnimatedPath: null,
    userAnimatedType: null,
  },
};

export const ALL_PET_STATES: PetState[] = ['idle', 'rest', 'work'];

export const STATE_META: Record<PetState, { label: string; desc: string }> = {
  idle:     { label: '待机',   desc: '默认状态；会在多张PNG之间随机切换' },
  rest:     { label: '休息',   desc: '休息/喝水倒计时状态；会随机显示休息或喝水 GIF' },
  work:     { label: '专注',   desc: '专注模式状态' },
  drinking: { label: '喝水',   desc: '旧版兼容状态；当前已合并到休息' },
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
  const defaultGifAssets = raw.defaultGifAssets?.length
    ? raw.defaultGifAssets.filter((path) => !path.startsWith('assets/GIF/'))
    : defaults.defaultGifAssets;
  const mergedDefaultGifAssets = state === 'rest'
    ? Array.from(new Set([
      ...defaultGifAssets.filter((path) => ![
        'assets/rest/gif/playing_clean_3.GIF',
        'assets/rest/gif/rest.GIF',
        'assets/rest/gif/IMG_3448.GIF',
        'assets/rest/gif/IMG_3449.GIF',
      ].includes(path)),
      'assets/rest/gif/idle_raw_1.GIF',
      'assets/rest/gif/drinking_raw.GIF',
      'assets/rest/gif/IMG_3452.GIF',
      'assets/rest/gif/IMG_3453.GIF',
      'assets/rest/gif/IMG_3454.GIF',
      'assets/rest/gif/IMG_3455.GIF',
      'assets/rest/gif/IMG_3456.GIF',
      'assets/rest/gif/IMG_3457.GIF',
      'assets/rest/gif/IMG_3458.GIF',
    ]))
    : defaultGifAssets;
  const defaultAssets = raw.defaultAssets?.length
    ? raw.defaultAssets.filter((path) => !/^assets\/(idle|thinking|sleeping)\//.test(path))
    : defaults.defaultAssets;
  return {
    ...defaults,
    ...raw,
    mediaMode: hasExplicitMode ? raw.mediaMode! : defaults.mediaMode,
    defaultAssets: defaultAssets.length ? defaultAssets : defaults.defaultAssets,
    defaultGifAssets: mergedDefaultGifAssets.length ? mergedDefaultGifAssets : defaults.defaultGifAssets,
    userFrames: raw.userFrames ?? defaults.userFrames,
    userGifs: raw.userGifs ?? defaults.userGifs,
    disabledFrames: (raw.disabledFrames ?? defaults.disabledFrames)?.filter((path) => !/^assets\/(idle|thinking|sleeping)\//.test(path)),
    disabledGifs: (raw.disabledGifs ?? defaults.disabledGifs)?.filter((path) => !path.startsWith('assets/GIF/')),
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
