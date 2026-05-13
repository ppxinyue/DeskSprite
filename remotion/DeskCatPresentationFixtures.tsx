import { Img, Loop, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
import {
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Clock3,
  Gamepad2,
  Keyboard,
  MessageSquareText,
  Mic,
  Music2,
  Palette,
  PawPrint,
  Settings2,
  ShieldAlert,
  Sparkles,
  Terminal,
  UserRound,
} from 'lucide-react';

export type ThemeMode = 'light' | 'dark';
export type PetState = 'idle' | 'rest' | 'work';

export const light = {
  bg: '#f4f5f7',
  bg2: '#ffffff',
  text: '#20201d',
  muted: '#77736c',
  card: 'rgba(255,255,255,0.68)',
  cardStrong: 'rgba(255,255,255,0.84)',
  line: 'rgba(54,50,43,0.12)',
  subtle: 'rgba(235,239,244,0.72)',
  accent: '#2f8fff',
};

export const dark = {
  bg: '#090909',
  bg2: '#1f1f1f',
  text: '#e7e7e7',
  muted: '#a7a7a7',
  card: 'rgba(44,44,44,0.78)',
  cardStrong: 'rgba(58,58,58,0.82)',
  line: 'rgba(255,255,255,0.12)',
  subtle: 'rgba(255,255,255,0.06)',
  accent: '#c6c6c6',
};

export function theme(mode: ThemeMode) {
  return mode === 'dark' ? dark : light;
}

export const catAssets: Record<PetState, string[]> = {
  idle: [
    'assets/idle/gif/blink.GIF',
    'assets/idle/gif/grooming.GIF',
    'assets/idle/gif/idle_clean_1.GIF',
    'assets/idle/gif/blink.GIF',
  ],
  rest: [
    'assets/rest/gif/idle_raw_1.GIF',
    'assets/rest/gif/drinking_raw.GIF',
    'assets/rest/gif/IMG_3452.GIF',
    'assets/rest/gif/IMG_3455.GIF',
  ],
  work: ['assets/work/gif/working_clean.GIF', 'assets/work/gif/working_clean.GIF'],
};

export const customizableCatAssets = [
  'assets/idle/gif/blink.GIF',
  'assets/idle/gif/grooming.GIF',
  'assets/idle/png/idle3.png',
  'assets/idle/png/idle.png',
  'assets/idle/png/idle2.png',
  'assets/rest/gif/drinking_raw.GIF',
  'assets/rest/gif/IMG_3452.GIF',
  'assets/rest/gif/IMG_3453.GIF',
  'assets/rest/gif/IMG_3454.GIF',
  'assets/rest/gif/IMG_3455.GIF',
  'assets/rest/gif/IMG_3456.GIF',
  'assets/rest/gif/IMG_3457.GIF',
  'assets/rest/gif/IMG_3458.GIF',
  'assets/work/gif/working_clean.GIF',
  'assets/pet-images/cat15-peering.png',
  'assets/pet-images/happy/happy.png',
  'assets/pet-images/sleeping/sleeping.png',
  'assets/pet-images/thinking/thinking.png',
];

export const sidebarGroups = [
  ['个人', [UserRound, '个人档案'], [Clock3, '对话历史']],
  ['外观', [Palette, '显示'], [PawPrint, '自定义形象'], [Sparkles, '灵宠动作']],
  ['专注与提醒', [Bell, '休息提醒'], [BriefcaseBusiness, '专注模式'], [ShieldAlert, '屏蔽列表'], [Gamepad2, '游戏识别'], [Music2, '音乐识别']],
  ['AI', [Bot, '内置额度'], [Terminal, 'Coding 模式'], [MessageSquareText, 'Chat 模型'], [Music2, '语音模型']],
  ['通用', [Settings2, '基础'], [BarChart3, 'Timeline'], [Keyboard, '快捷键']],
] as const;

export const chatMessages = {
  user: '帮我总结这张截图，并提醒我下一步该做什么。',
  assistant:
    '截图显示你正在配置 DeskCat 的专注模式。建议保持分心检测开启，把宽限期设为 8 秒，并在 Timeline 中回看今天的工作节奏。',
};

export const timelineBlocks = [
  { appName: 'Arc', title: 'Radix UI Colors - Usage · Browser', category: 'browser', start: 8, width: 12, color: '#9ed0ff', time: '09:08 - 09:44' },
  { appName: 'Cursor', title: 'DeskCat · SettingsPanel.tsx', category: 'coding', start: 22, width: 15, color: '#0090ff', time: '09:45 - 10:28' },
  { appName: 'WeChat', title: 'WeChat', category: 'chat', start: 39, width: 8, color: '#ffd6a3', time: '10:31 - 10:52' },
  { appName: 'Terminal', title: 'codex-electron-rewrite · pnpm build', category: 'coding', start: 50, width: 13, color: '#0090ff', time: '11:02 - 11:38' },
  { appName: 'Keynote', title: 'DeskSprite Timeline UI Review.key', category: 'office', start: 66, width: 12, color: '#d4d7dc', time: '14:05 - 14:42' },
  { appName: 'Slack', title: 'Slack - design-system', category: 'chat', start: 80, width: 11, color: '#ffd6a3', time: '15:03 - 15:37' },
  { appName: 'VS Code', title: 'timeline-renderer.tsx - DeskSprite', category: 'coding', start: 92, width: 16, color: '#0090ff', time: '17:10 - 18:08' },
];

export const backgroundMarkers = [
  { type: 'music', name: 'Music · Nujabes - Aruarian Dance', start: 10, width: 7 },
  { type: 'music', name: 'Spotify · Tycho - Awake', start: 80, width: 15 },
  { type: 'terminal', name: 'Terminal · pnpm electron:dev', start: 24, width: 38 },
];

export const topApps = [
  ['Cursor', 0.92, '1 小时 41 分钟'],
  ['Arc', 0.76, '1 小时 18 分钟'],
  ['Terminal', 0.58, '54 分钟'],
  ['Slack', 0.36, '34 分钟'],
] as const;

function isGifAsset(src: string) {
  return src.split(/[?#]/)[0]?.toLowerCase().endsWith('.gif') ?? false;
}

export function gifVideoAsset(src: string) {
  return `assets/gif-videos/${src.replace(/\.gif$/i, '.webm')}`;
}

const gifVideoDurations: Record<string, number> = {
  'assets/idle/gif/grooming.GIF': 1.166,
  'assets/idle/gif/blink.GIF': 8.133,
  'assets/idle/gif/idle_clean_1.GIF': 1,
  'assets/idle/gif/sleeping_raw_2.GIF': 4.366,
  'assets/work/gif/working_clean.GIF': 8.233,
  'assets/rest/gif/IMG_3456.GIF': 17.933,
  'assets/rest/gif/IMG_3457.GIF': 17.833,
  'assets/rest/gif/idle_raw_1.GIF': 3.133,
  'assets/rest/gif/IMG_3458.GIF': 9.166,
  'assets/rest/gif/IMG_3454.GIF': 11.966,
  'assets/rest/gif/IMG_3455.GIF': 7.566,
  'assets/rest/gif/IMG_3452.GIF': 10.733,
  'assets/rest/gif/drinking_raw.GIF': 15.066,
  'assets/rest/gif/IMG_3453.GIF': 6,
  'assets/pet-images/GIF/blink.GIF': 8.333,
  'assets/pet-images/yawning.GIF': 1.766,
  'assets/pet-images/IMG_3450.GIF': 10.866,
  'assets/pet-images/idle_raw_1.GIF': 3.133,
  'assets/pet-images/playing_clean.GIF': 2.633,
  'assets/pet-images/idle_raw_2.GIF': 2.733,
  'assets/pet-images/IMG_3422 2.GIF': 8.133,
  'assets/pet-images/idle_raw_3.GIF': 3.966,
  'assets/pet-images/playing_clean_3.GIF': 9.366,
  'assets/pet-images/idle_clean_2.GIF': 1.633,
  'assets/pet-images/sleeping_raw.GIF': 6.733,
  'assets/pet-images/IMG_3448.GIF': 8.133,
  'assets/pet-images/IMG_3449.GIF': 8.133,
  'assets/pet-images/playing_clean_2.GIF': 4,
};

function SpriteMedia({ src, size, style, filter }: { src: string; size: number; style?: React.CSSProperties; filter: string }) {
  const playbackRate = 0.72;
  const commonStyle: React.CSSProperties = {
    width: size,
    height: size * 1.18,
    objectFit: 'contain',
    filter,
    ...style,
  };

  if (isGifAsset(src)) {
    const durationInFrames = Math.max(20, Math.ceil(((gifVideoDurations[src] ?? 4) * 30) / playbackRate));
    return (
      <Loop durationInFrames={durationInFrames}>
        <OffthreadVideo
          src={staticFile(gifVideoAsset(src))}
          muted
          transparent
          playbackRate={playbackRate}
          style={commonStyle}
        />
      </Loop>
    );
  }

  return (
    <Img
      src={staticFile(src)}
      style={commonStyle}
    />
  );
}

export function CatSprite({
  state,
  size = 180,
  index = 0,
  style,
}: {
  state: PetState;
  size?: number;
  index?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const y = Math.sin(frame / 26 + index) * 7;
  const wobble = Math.sin(frame / 38 + index) * 2.2;
  const assets = catAssets[state];
  const src = assets[index % assets.length];
  return (
    <SpriteMedia
      src={src}
      size={size}
      filter="drop-shadow(0 28px 28px rgba(0,0,0,0.24))"
      style={{
        transform: `translateY(${y}px) rotate(${wobble}deg)`,
        ...style,
      }}
    />
  );
}

export function AssetSprite({
  src,
  size = 180,
  wobble = 0,
  style,
}: {
  src: string;
  size?: number;
  wobble?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const y = Math.sin(frame / 28 + wobble) * 5;
  const rotate = Math.sin(frame / 42 + wobble) * 1.6;
  return (
    <SpriteMedia
      src={src}
      size={size}
      filter="drop-shadow(0 22px 24px rgba(0,0,0,0.24))"
      style={{
        transform: `translateY(${y}px) rotate(${rotate}deg)`,
        ...style,
      }}
    />
  );
}
