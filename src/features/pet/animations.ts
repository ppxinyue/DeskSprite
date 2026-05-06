export type PetState =
  | 'idle'
  | 'yawn'
  | 'happy'
  | 'sleeping'
  | 'running'
  | 'thinking';

export interface PetStateMediaConfig {
  defaultAsset: string;
  userFrames: string[];
  frameInterval: number;
  userAnimatedPath: string | null;
  userAnimatedType: 'gif' | 'video' | null;
}

export type PetMediaConfig = Record<PetState, PetStateMediaConfig>;

export const DEFAULT_MEDIA_CONFIG: PetMediaConfig = {
  idle:     { defaultAsset: 'assets/idle/idle.png',             userFrames: [], frameInterval: 150, userAnimatedPath: null, userAnimatedType: null },
  yawn:     { defaultAsset: 'assets/yawn/yawn.png',             userFrames: [], frameInterval: 150, userAnimatedPath: null, userAnimatedType: null },
  happy:    { defaultAsset: 'assets/happy/happy.png',           userFrames: [], frameInterval: 150, userAnimatedPath: null, userAnimatedType: null },
  sleeping: { defaultAsset: 'assets/sleeping/sleeping.png',     userFrames: [], frameInterval: 150, userAnimatedPath: null, userAnimatedType: null },
  running:  { defaultAsset: 'assets/running/running.png',       userFrames: [], frameInterval: 150, userAnimatedPath: null, userAnimatedType: null },
  thinking: { defaultAsset: 'assets/thinking/thinking.png',     userFrames: [], frameInterval: 150, userAnimatedPath: null, userAnimatedType: null },
};

export const ALL_PET_STATES: PetState[] = ['idle', 'yawn', 'happy', 'sleeping', 'running', 'thinking'];

export const STATE_META: Record<PetState, { label: string; desc: string }> = {
  idle:     { label: '待机',   desc: '默认状态，无操作时显示' },
  yawn:     { label: '哈欠',   desc: '5分钟无交互后自动触发，结束后进入睡眠' },
  happy:    { label: '高兴',   desc: 'AI回复完成后触发，持续3秒' },
  sleeping: { label: '睡眠',   desc: '哈欠结束后自动进入，点击灵宠唤醒' },
  running:  { label: '奔跑',   desc: '拖拽灵宠时播放' },
  thinking: { label: '思考中', desc: '等待AI回复期间显示' },
};

export function isBuiltinAsset(path: string): boolean {
  return path.startsWith('assets/');
}

export function needsFrameAnimation(config: PetStateMediaConfig): boolean {
  return config.userAnimatedPath === null && config.userFrames.length > 1;
}
