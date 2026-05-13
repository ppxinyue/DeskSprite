import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  FileCode2,
  ImagePlus,
  MessageCircle,
  MessageSquareText,
  Mic,
  Music2,
  Palette,
  PawPrint,
  Plus,
  Sparkles,
  Terminal,
  Volume2,
  X,
} from 'lucide-react';
import {
  AssetSprite,
  CatSprite,
  backgroundMarkers,
  chatMessages,
  customizableCatAssets,
  dark,
  light,
  sidebarGroups,
  theme,
  timelineBlocks,
  topApps,
  type PetState,
  type ThemeMode,
} from './DeskCatPresentationFixtures';

type Scene = { from: number; duration: number };

const fps = 30;
const durationInFrames = 1920;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const scenes = {
  hero: { from: 0, duration: 210 },
  appearance: { from: 210, duration: 240 },
  chat: { from: 450, duration: 390 },
  states: { from: 840, duration: 210 },
  modes: { from: 1020, duration: 270 },
  timeline: { from: 1260, duration: 330 },
  finale: { from: 1560, duration: 360 },
};

const voiceTracks = [
  { from: 18, src: 'audio/deskcat-tts-vo/01-intro.wav' },
  { from: scenes.appearance.from + 18, src: 'audio/deskcat-tts-vo/03-appearance.wav' },
  { from: scenes.appearance.from + 124, src: 'audio/deskcat-tts-vo/04-resize.wav' },
  { from: scenes.chat.from + 24, src: 'audio/deskcat-tts-vo/05-chat.wav' },
  { from: scenes.chat.from + 224, src: 'audio/deskcat-tts-vo/06-models.wav' },
  { from: scenes.states.from + 18, src: 'audio/deskcat-tts-vo/07-states.wav' },
  { from: scenes.modes.from + 18, src: 'audio/deskcat-tts-vo/08-modes.wav' },
  { from: scenes.timeline.from + 18, src: 'audio/deskcat-tts-vo/09-timeline.wav' },
  { from: scenes.finale.from + 168, src: 'audio/deskcat-tts-vo/10-finale.wav' },
] as const;

const timelineCategoryMeta: Record<string, { label: string; color: string; fill: string; soft: string }> = {
  coding: { label: 'Coding', color: '#0090ff', fill: '#9ed0ff', soft: 'rgba(0,144,255,0.12)' },
  chat: { label: 'Chat', color: '#218358', fill: '#a8ddb8', soft: 'rgba(33,131,88,0.11)' },
  browser: { label: '浏览器', color: '#c2410c', fill: '#fdba74', soft: 'rgba(194,65,12,0.11)' },
  office: { label: '办公', color: '#ad5700', fill: '#f2c36b', soft: 'rgba(173,87,0,0.11)' },
  entertainment: { label: '娱乐', color: '#cd1d8d', fill: '#f5b4df', soft: 'rgba(205,29,141,0.11)' },
  other: { label: '其他', color: '#60646c', fill: '#c5c7d0', soft: 'rgba(96,100,108,0.11)' },
  music: { label: '音乐', color: '#c5c7d0', fill: '#c5c7d0', soft: 'rgba(255,255,255,0.055)' },
  terminal: { label: 'Terminal', color: '#60646c', fill: '#c5c7d0', soft: 'rgba(96,100,108,0.11)' },
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clickOnce(frame: number, at: number, duration = 20) {
  return interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });
}

function enter(frame: number, at: number, duration = 28) {
  return interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
}

function sceneOpacity(frame: number, scene: Scene) {
  return interpolate(
    frame,
    [scene.from, scene.from + 24, scene.from + scene.duration - 30, scene.from + scene.duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease },
  );
}

function lerpColor(a: string, b: string, p: number) {
  const aa = a.match(/\w\w/g)?.map((x) => parseInt(x, 16)) ?? [0, 0, 0];
  const bb = b.match(/\w\w/g)?.map((x) => parseInt(x, 16)) ?? [0, 0, 0];
  const cc = aa.map((x, i) => Math.round(x + (bb[i] - x) * p));
  return `rgb(${cc[0]}, ${cc[1]}, ${cc[2]})`;
}

function currentDarkness(frame: number) {
  if (frame >= scenes.appearance.from && frame < scenes.appearance.from + scenes.appearance.duration) {
    return 1;
  }
  if (frame >= scenes.chat.from && frame < scenes.chat.from + scenes.chat.duration) {
    return 1;
  }
  const appearanceToChat = interpolate(frame, [scenes.appearance.from + 118, scenes.chat.from + 30], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const afterChat = interpolate(frame, [scenes.chat.from + 160, scenes.states.from + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  return frame < scenes.chat.from + 60 ? appearanceToChat : afterChat;
}

function Background() {
  const frame = useCurrentFrame();
  const darkness = currentDarkness(frame);
  const bg = lerpColor(light.bg, dark.bg, darkness);
  const bg2 = lerpColor(light.bg2, dark.bg2, darkness);
  const sweep = interpolate(frame % 280, [0, 280], [-24, 124], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });

  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: -130,
          background: `radial-gradient(circle at 50% -8%, ${bg2}, transparent 34%), radial-gradient(circle at 12% 82%, rgba(255,255,255,${0.18 - darkness * 0.12}), transparent 30%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.17 + darkness * 0.12,
          backgroundImage:
            'linear-gradient(rgba(128,128,128,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.12) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          transform: `translateX(${-sweep * 0.12}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${sweep}%`,
          top: -160,
          width: 280,
          height: 1400,
          transform: 'rotate(18deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)',
          filter: 'blur(24px)',
          opacity: 0.26,
        }}
      />
    </AbsoluteFill>
  );
}

function Glass({
  children,
  mode = 'dark',
  style,
  strong = false,
}: {
  children: React.ReactNode;
  mode?: ThemeMode;
  style?: React.CSSProperties;
  strong?: boolean;
}) {
  const colors = theme(mode);
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${colors.line}`,
        background: strong ? colors.cardStrong : colors.card,
        color: colors.text,
        boxShadow:
          mode === 'dark'
            ? '0 28px 80px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.07)'
            : '0 28px 80px rgba(52,64,84,0.12), inset 0 1px 0 rgba(255,255,255,0.82)',
        backdropFilter: 'blur(30px) saturate(1.28)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MacDots({ mode }: { mode: ThemeMode }) {
  const colors = mode === 'dark' ? ['#555', '#4b4b4b', '#444'] : ['#ff5f57', '#febc2e', '#28c840'];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {colors.map((color) => (
        <span key={color} style={{ width: 12, height: 12, borderRadius: 999, background: color }} />
      ))}
    </div>
  );
}

function Cursor({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 0,
        height: 0,
        borderLeft: `${18 * scale}px solid white`,
        borderTop: `${13 * scale}px solid transparent`,
        borderBottom: `${13 * scale}px solid transparent`,
        filter: 'drop-shadow(0 4px 7px rgba(0,0,0,0.38))',
        transform: 'rotate(-22deg)',
      }}
    />
  );
}

function CursorSpotlight({
  x,
  y,
  progress,
  mode,
}: {
  x: number;
  y: number;
  progress: number;
  mode: ThemeMode;
}) {
  const p = clamp01(progress);
  const color = mode === 'dark' ? '255,255,255' : '47,143,255';
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 34,
        top: y - 34,
        width: 68,
        height: 68,
        borderRadius: 999,
        border: `4px solid rgba(${color},${0.68 * (1 - p)})`,
        background: `rgba(${color},${0.16 * (1 - p)})`,
        transform: `scale(${0.46 + p * 1.22})`,
        boxShadow: `0 0 0 ${10 + p * 24}px rgba(${color},${0.12 * (1 - p)}), 0 0 38px rgba(${color},0.34)`,
        opacity: p > 0 && p < 1 ? 1 : 0,
      }}
    />
  );
}

function DesktopPet({ state = 'idle', scale = 1, mode = 'dark' }: { state?: PetState; scale?: number; mode?: ThemeMode }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 104,
        bottom: 88,
        width: 190 * scale,
        height: 220 * scale,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <CatSprite state={state} size={165 * scale} />
    </div>
  );
}

function FeatureCaption({ children, mode = 'dark', opacity = 1 }: { children: React.ReactNode; mode?: ThemeMode; opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 112,
        textAlign: 'center',
        color: mode === 'dark' ? 'rgba(255,255,255,0.66)' : 'rgba(22,24,28,0.58)',
        fontSize: 25,
        lineHeight: '34px',
        fontWeight: 650,
        letterSpacing: 0,
        opacity,
        textShadow: mode === 'dark' ? '0 12px 34px rgba(0,0,0,0.45)' : '0 10px 26px rgba(255,255,255,0.48)',
      }}
    >
      {children}
    </div>
  );
}

function HeroScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.hero);
  const logo = spring({ frame, fps, config: { damping: 18, stiffness: 82 } });
  const title = enter(frame, 16, 34);
  const ringReveal = enter(frame, 102, 46);
  const textSwap = enter(frame, 100, 34);
  const ringSpin = Math.max(0, frame - 102) * 0.48;
  const ringCenterX = 590;
  const ringCenterY = 365;
  const ringRadius = 345;
  const soloX = 896;
  const soloY = 250;
  const activeSoloCat = 'assets/idle/gif/blink.GIF';
  const plusPulse = 0.5 + Math.sin(frame / 14) * 0.5;

  return (
    <AbsoluteFill style={{ opacity, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 1180, height: 720 }}>
        {ringReveal > 0.01 ? customizableCatAssets.map((src, i) => {
          const slotCount = customizableCatAssets.length + 1;
          const a = (((i / slotCount) * 360 + ringSpin - 96) * Math.PI) / 180;
          const reveal = ringReveal * enter(frame, 108 + i * 1.7, 18);
          const travel = ringReveal * enter(frame, 100 + i * 1.2, 28);
          const size = i % 4 === 0 ? 58 : 50;
          const targetLeft = ringCenterX + Math.cos(a) * ringRadius - size / 2;
          const targetTop = ringCenterY + Math.sin(a) * ringRadius - size / 2;
          return (
            <AssetSprite
              key={`${src}-${i}`}
              src={src}
              size={size}
              wobble={i}
              style={{
                position: 'absolute',
                left: soloX + (targetLeft - soloX) * travel,
                top: soloY + (targetTop - soloY) * travel,
                opacity: reveal,
                transform: `translateY(${Math.sin(frame / 28 + i) * 5}px) rotate(${Math.sin(frame / 42 + i) * 1.6}deg) scale(${0.82 + reveal * 0.18})`,
              }}
            />
          );
        }) : null}
        <div
          style={{
            position: 'absolute',
            left: ringCenterX + Math.cos(((customizableCatAssets.length / (customizableCatAssets.length + 1)) * Math.PI * 2) + (ringSpin - 96) * Math.PI / 180) * ringRadius - 32,
            top: ringCenterY + Math.sin(((customizableCatAssets.length / (customizableCatAssets.length + 1)) * Math.PI * 2) + (ringSpin - 96) * Math.PI / 180) * ringRadius - 32,
            width: 64,
            height: 64,
            borderRadius: 18,
            border: '2px dashed rgba(255,255,255,0.38)',
            display: 'grid',
            placeItems: 'center',
            color: `rgba(255,255,255,${0.62 + plusPulse * 0.24})`,
            fontSize: 34,
            fontWeight: 420,
            opacity: ringReveal,
            transform: `scale(${0.76 + ringReveal * 0.24})`,
            boxShadow: '0 18px 38px rgba(0,0,0,0.22), inset 0 1px rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.035)',
          }}
        >
          +
        </div>
        <div
          style={{
            position: 'absolute',
            left: soloX,
            top: soloY,
            opacity: enter(frame, 34, 28) * (1 - ringReveal),
            transform: `translateY(${(1 - enter(frame, 34, 28)) * 18}px)`,
            transformOrigin: '50% 50%',
          }}
        >
          <AssetSprite src={activeSoloCat} size={106} style={{ transform: 'none' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 218,
            width: '100%',
            textAlign: 'center',
            transform: `scale(${0.92 + logo * 0.08})`,
          }}
        >
          <div
            style={{
              fontSize: 128,
              lineHeight: '134px',
              fontWeight: 840,
              color: '#f8f8f6',
              letterSpacing: 0,
              opacity: title,
              textShadow: '0 28px 90px rgba(0,0,0,0.34)',
            }}
          >
            DeskCat
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 450,
            width: '100%',
            height: 52,
            overflow: 'hidden',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.62)',
            fontSize: 25,
            lineHeight: '34px',
            fontWeight: 560,
            opacity: enter(frame, 54, 28),
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translateY(${-44 * textSwap}px)`,
              opacity: 1 - textSwap,
            }}
          >
            a tiny desktop companion for focus, chat, and flow
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              color: 'rgba(255,255,255,0.72)',
              transform: `translateY(${44 - 44 * textSwap}px)`,
              opacity: textSwap,
            }}
          >
            Custom desktop pet appearances
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function SettingsShell({ mode, active, children, width = 980, height = 640 }: { mode: ThemeMode; active: string; children: React.ReactNode; width?: number; height?: number }) {
  const colors = theme(mode);
  return (
    <Glass mode={mode} strong style={{ width, height, borderRadius: 30 }}>
      <div style={{ display: 'flex', height: '100%' }}>
        <aside style={{ width: 210, background: mode === 'dark' ? '#252525' : 'rgba(255,255,255,0.30)', padding: '56px 10px 20px', borderRight: `1px solid ${colors.line}` }}>
          {sidebarGroups.map(([label, ...items], groupIndex) => (
            <div key={label} style={{ marginTop: groupIndex === 0 ? 0 : 18 }}>
              <div style={{ color: colors.muted, opacity: 0.58, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.1, padding: '0 10px 7px' }}>{label}</div>
              {items.map(([Icon, item]) => {
                const isActive = item === active;
                return (
                  <div key={item} style={{ height: 32, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '0 10px', color: isActive ? colors.text : colors.muted, background: isActive ? (mode === 'dark' ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.64)') : 'transparent', fontSize: 12, fontWeight: 560 }}>
                    <Icon size={16} />
                    {item}
                  </div>
                );
              })}
            </div>
          ))}
        </aside>
        <main style={{ flex: 1, padding: '72px 30px 30px', color: colors.text }}>{children}</main>
      </div>
    </Glass>
  );
}

function Segment({ mode, labels, active }: { mode: ThemeMode; labels: string[]; active: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: theme(mode).subtle }}>
      {labels.map((label, index) => (
        <div key={label} style={{ height: 28, minWidth: 54, padding: '0 12px', borderRadius: 8, display: 'grid', placeItems: 'center', background: active === index ? theme(mode).cardStrong : 'transparent', color: active === index ? theme(mode).text : theme(mode).muted, fontSize: 12, fontWeight: 650 }}>
          {label}
        </div>
      ))}
    </div>
  );
}

function SwitchPill({ on, mode }: { on: boolean; mode: ThemeMode }) {
  return (
    <div style={{ width: 42, height: 24, borderRadius: 999, background: on ? '#2f8fff' : theme(mode).subtle, padding: 3 }}>
      <div style={{ width: 18, height: 18, borderRadius: 999, background: '#fff', transform: `translateX(${on ? 18 : 0}px)`, boxShadow: '0 2px 7px rgba(0,0,0,0.18)' }} />
    </div>
  );
}

function SliderLine({ value, mode, width = 210 }: { value: number; mode: ThemeMode; width?: number }) {
  return (
    <div style={{ width, height: 6, borderRadius: 999, background: theme(mode).subtle, overflow: 'hidden' }}>
      <div style={{ width: `${value * 100}%`, height: '100%', borderRadius: 999, background: mode === 'dark' ? '#c6c6c6' : '#22221f' }} />
    </div>
  );
}

function SettingRow({ mode, label, hint, right }: { mode: ThemeMode; label: string; hint?: string; right: React.ReactNode }) {
  const colors = theme(mode);
  return (
    <div style={{ minHeight: 55, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '10px 16px', borderBottom: `1px solid ${colors.line}` }}>
      <div>
        <div style={{ color: colors.text, fontSize: 14, fontWeight: 620 }}>{label}</div>
        {hint ? <div style={{ color: colors.muted, fontSize: 11, lineHeight: '17px', marginTop: 3 }}>{hint}</div> : null}
      </div>
      {right}
    </div>
  );
}

function DogPhoto({ size = 138, rounded = 22 }: { size?: number; rounded?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: rounded,
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #d7cab7 0%, #efe6d8 46%, #b99a72 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.70)',
      }}
    >
      <div style={{ position: 'absolute', left: size * 0.12, top: size * 0.12, width: size * 0.76, height: size * 0.58, borderRadius: '46% 46% 42% 42%', background: '#d9a15d', boxShadow: 'inset 0 -14px 18px rgba(124,78,36,0.16)' }} />
      <div style={{ position: 'absolute', left: size * 0.19, top: size * 0.06, width: size * 0.22, height: size * 0.34, borderRadius: '70% 30% 60% 40%', background: '#b6793f', transform: 'rotate(-22deg)' }} />
      <div style={{ position: 'absolute', right: size * 0.19, top: size * 0.06, width: size * 0.22, height: size * 0.34, borderRadius: '30% 70% 40% 60%', background: '#b6793f', transform: 'rotate(22deg)' }} />
      <div style={{ position: 'absolute', left: size * 0.24, top: size * 0.28, width: size * 0.52, height: size * 0.42, borderRadius: '48% 48% 54% 54%', background: '#f2d1a8' }} />
      <div style={{ position: 'absolute', left: size * 0.32, top: size * 0.37, width: size * 0.075, height: size * 0.075, borderRadius: 999, background: '#1d1b18' }} />
      <div style={{ position: 'absolute', right: size * 0.32, top: size * 0.37, width: size * 0.075, height: size * 0.075, borderRadius: 999, background: '#1d1b18' }} />
      <div style={{ position: 'absolute', left: size * 0.45, top: size * 0.47, width: size * 0.10, height: size * 0.075, borderRadius: '60% 60% 70% 70%', background: '#2d211b' }} />
      <div style={{ position: 'absolute', left: size * 0.34, top: size * 0.58, width: size * 0.32, height: size * 0.10, borderRadius: '0 0 999px 999px', borderBottom: `${Math.max(2, size * 0.018)}px solid rgba(91,58,38,0.55)` }} />
      <div style={{ position: 'absolute', left: size * 0.25, bottom: size * 0.07, width: size * 0.5, height: size * 0.22, borderRadius: '50% 50% 20% 20%', background: '#f6ead8' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.30), transparent 45%, rgba(0,0,0,0.08))' }} />
    </div>
  );
}

function DogCompanion({ progress = 1, scale = 1 }: { progress?: number; scale?: number }) {
  const p = clamp01(progress);
  return (
    <div style={{ position: 'relative', width: 220 * scale, height: 218 * scale, opacity: p, transform: `scale(${0.78 + p * 0.22})`, filter: 'drop-shadow(0 26px 24px rgba(0,0,0,0.30))' }}>
      <div style={{ position: 'absolute', left: 43 * scale, top: 76 * scale, width: 134 * scale, height: 98 * scale, borderRadius: '46% 46% 32% 32%', background: '#c9894a', boxShadow: 'inset 0 -18px 22px rgba(91,53,29,0.14)' }} />
      <div style={{ position: 'absolute', left: 58 * scale, top: 40 * scale, width: 104 * scale, height: 92 * scale, borderRadius: '48% 48% 42% 42%', background: '#d99b58' }} />
      <div style={{ position: 'absolute', left: 48 * scale, top: 34 * scale, width: 35 * scale, height: 58 * scale, borderRadius: '70% 30% 58% 42%', background: '#a96b36', transform: 'rotate(-26deg)' }} />
      <div style={{ position: 'absolute', right: 48 * scale, top: 34 * scale, width: 35 * scale, height: 58 * scale, borderRadius: '30% 70% 42% 58%', background: '#a96b36', transform: 'rotate(26deg)' }} />
      <div style={{ position: 'absolute', left: 79 * scale, top: 76 * scale, width: 10 * scale, height: 10 * scale, borderRadius: 999, background: '#171512' }} />
      <div style={{ position: 'absolute', right: 79 * scale, top: 76 * scale, width: 10 * scale, height: 10 * scale, borderRadius: 999, background: '#171512' }} />
      <div style={{ position: 'absolute', left: 98 * scale, top: 90 * scale, width: 22 * scale, height: 16 * scale, borderRadius: '50% 50% 64% 64%', background: '#2d211b' }} />
      <div style={{ position: 'absolute', left: 78 * scale, top: 108 * scale, width: 64 * scale, height: 46 * scale, borderRadius: '50% 50% 42% 42%', background: '#f4dec4' }} />
      <div style={{ position: 'absolute', left: 38 * scale, top: 156 * scale, width: 38 * scale, height: 34 * scale, borderRadius: '45% 45% 34% 34%', background: '#f4dec4' }} />
      <div style={{ position: 'absolute', right: 38 * scale, top: 156 * scale, width: 38 * scale, height: 34 * scale, borderRadius: '45% 45% 34% 34%', background: '#f4dec4' }} />
      <div style={{ position: 'absolute', left: 162 * scale, top: 100 * scale, width: 54 * scale, height: 24 * scale, borderRadius: '999px 999px 999px 0', borderTop: `${12 * scale}px solid #d99b58`, transform: 'rotate(32deg)' }} />
    </div>
  );
}

function TomJerryPhoto({ size = 138, rounded = 22 }: { size?: number; rounded?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: rounded,
        overflow: 'hidden',
        background:
          'linear-gradient(45deg, rgba(255,255,255,0.18) 25%, transparent 25% 50%, rgba(255,255,255,0.18) 50% 75%, transparent 75%), #d8d8d8',
        backgroundSize: `${Math.max(8, size * 0.13)}px ${Math.max(8, size * 0.13)}px`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42)',
      }}
    >
      <Img src={staticFile('assets/remotion/tom-jerry-upload.svg')} style={{ width: size, height: size, objectFit: 'cover' }} />
    </div>
  );
}

function TomJerryCompanion({ progress = 1, scale = 1 }: { progress?: number; scale?: number }) {
  return (
    <div style={{ width: 230 * scale, height: 250 * scale, opacity: progress, transform: `scale(${0.76 + progress * 0.24})`, filter: 'drop-shadow(0 28px 28px rgba(0,0,0,0.32))' }}>
      <TomJerryPhoto size={210 * scale} rounded={36 * scale} />
    </div>
  );
}

function AvatarAssetTile({
  children,
  label = '默认',
  active = true,
  progress = 1,
  mode = 'light',
}: {
  children?: React.ReactNode;
  label?: string;
  active?: boolean;
  progress?: number;
  mode?: ThemeMode;
}) {
  const isDark = mode === 'dark';
  return (
    <div style={{ position: 'relative', width: 154, height: 154, borderRadius: 13, background: active ? (isDark ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.44)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.24)'), border: `1px solid ${isDark ? 'rgba(255,255,255,0.095)' : 'rgba(255,255,255,0.50)'}`, boxShadow: isDark ? '0 16px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 8px 20px rgba(52,64,84,0.045), inset 0 1px 0 rgba(255,255,255,0.62)', display: 'grid', placeItems: 'center', opacity: progress }}>
      {label ? <span style={{ position: 'absolute', left: 8, top: 8, borderRadius: 7, background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.82)', padding: '3px 8px', color: isDark ? 'rgba(255,255,255,0.62)' : '#747b86', fontSize: 12, boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.07)' }}>{label}</span> : null}
      {children}
    </div>
  );
}

function CustomAvatarPanel({ uploadProgress }: { uploadProgress: number }) {
  const characterInTile = enter(uploadProgress, 0.54, 0.2);
  const loading = uploadProgress > 0.36 && uploadProgress < 0.72;
  return (
    <SettingsShell mode="dark" active="自定义形象" width={1060} height={680}>
      <div style={{ fontSize: 28, fontWeight: 760, marginBottom: 18 }}>自定义形象</div>
      <Glass mode="dark" style={{ borderRadius: 14, background: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.095)' }}>
        <div style={{ display: 'flex', gap: 6, borderRadius: 10, background: 'rgba(255,255,255,0.045)', padding: 6, marginBottom: 18 }}>
          {['待机（4）', '休息（9）', '专注（1）'].map((label, index) => (
            <div key={label} style={{ height: 42, minWidth: 104, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 650, color: index === 0 ? dark.text : dark.muted, background: index === 0 ? 'rgba(255,255,255,0.095)' : 'transparent', boxShadow: index === 0 ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none' }}>{label}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderRadius: 11, background: 'rgba(255,255,255,0.04)', padding: 5, marginBottom: 18 }}>
          <div style={{ height: 42, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.09)', color: dark.text, fontSize: 15, fontWeight: 700 }}>GIF 动图（4 个）</div>
          <div style={{ height: 42, borderRadius: 9, display: 'grid', placeItems: 'center', color: dark.muted, fontSize: 15, fontWeight: 650 }}>图片（5 张）</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 154px)', gap: 16 }}>
          <AvatarAssetTile mode="dark"><CatSprite state="idle" size={126} /></AvatarAssetTile>
          <AvatarAssetTile mode="dark"><CatSprite state="rest" size={126} index={1} /></AvatarAssetTile>
          <AvatarAssetTile mode="dark"><CatSprite state="work" size={126} /></AvatarAssetTile>
          <div style={{ position: 'relative' }}>
            <AvatarAssetTile mode="dark" label="上传" progress={characterInTile}>
              <TomJerryCompanion progress={characterInTile} scale={0.62} />
            </AvatarAssetTile>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - characterInTile }}>
              <AvatarAssetTile mode="dark" label="">
                {loading ? (
                  <div style={{ display: 'grid', justifyItems: 'center', gap: 10, color: 'rgba(255,255,255,0.56)' }}>
                    <PawPrint size={28} />
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[0, 1, 2].map((i) => <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: '#d6d6d6', opacity: 0.35 + 0.4 * Math.sin((uploadProgress * 18) + i) }} />)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 650 }}>渲染中</div>
                  </div>
                ) : (
                  <Plus size={36} color="rgba(255,255,255,0.55)" />
                )}
              </AvatarAssetTile>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 18, color: dark.muted, fontSize: 13 }}>当前使用 {characterInTile > 0.6 ? '5 / 5 个 GIF' : '4 / 4 个 GIF'}</div>
        <button style={{ marginTop: 18, height: 38, borderRadius: 9, border: '1px solid rgba(255,255,255,0.13)', background: 'rgba(255,255,255,0.055)', color: dark.text, padding: '0 18px', fontSize: 14, fontWeight: 720 }}>恢复全部默认</button>
      </Glass>
    </SettingsShell>
  );
}

function AppearanceScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.appearance);
  const local = frame - scenes.appearance.from;
  const uploadProgress = enter(local, 92, 92);
  const clickUpload = local >= 48 && local <= 68 ? clickOnce(local, 48, 20) : 0;
  const clickChoose = local >= 112 && local <= 132 ? clickOnce(local, 112, 20) : 0;
  const picker = enter(local, 58, 18) * (1 - enter(local, 132, 18));
  const uploadToast = enter(local, 128, 18) * (1 - enter(local, 176, 18));
  const characterReveal = enter(local, 156, 34);
  const cursorX = interpolate(local, [0, 46, 82, 112, 146, 188], [1258, 972, 860, 1048, 1318, 1440], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const cursorY = interpolate(local, [0, 46, 82, 112, 146, 188], [792, 746, 540, 680, 726, 760], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: 'absolute', left: 430, top: 150, transform: 'scale(0.92)', transformOrigin: 'top left' }}>
        <CustomAvatarPanel uploadProgress={uploadProgress} />
      </div>
      <div style={{ position: 'absolute', right: 150, bottom: 104, opacity: 1 - characterReveal, transform: `translateY(${-16 * characterReveal}px) scale(${1 - characterReveal * 0.08})` }}>
        <CatSprite state="idle" size={178} />
      </div>
      <div style={{ position: 'absolute', right: 190, bottom: 128, opacity: characterReveal, transform: `translateY(${(1 - characterReveal) * 34}px)` }}>
        <TomJerryCompanion progress={characterReveal} scale={1.08} />
      </div>
      {picker > 0 ? (
        <Glass mode="dark" strong style={{ position: 'absolute', left: 760, top: 384, width: 380, height: 310, borderRadius: 22, padding: 18, opacity: picker, transform: `translateY(${(1 - picker) * 20}px) scale(${0.96 + picker * 0.04})`, background: 'rgba(38,38,38,0.94)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ color: dark.text, fontSize: 17, fontWeight: 760 }}>选择图片</div>
            <X size={18} color="rgba(255,255,255,0.46)" />
          </div>
          <div style={{ height: 158, borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '92px 1fr', alignItems: 'center', gap: 15, padding: 14, boxShadow: clickChoose ? '0 0 0 4px rgba(255,255,255,0.12)' : 'none' }}>
            <TomJerryPhoto size={92} rounded={16} />
            <div>
              <div style={{ color: dark.text, fontSize: 16, fontWeight: 760 }}>tom-jerry.png</div>
              <div style={{ color: dark.muted, fontSize: 12, marginTop: 7 }}>PNG · transparent artwork</div>
              <div style={{ marginTop: 18, width: 150, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, uploadProgress * 100)}%`, height: '100%', borderRadius: 999, background: '#d8d8d8' }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button style={{ height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: dark.muted, padding: '0 18px', fontSize: 13, fontWeight: 700 }}>取消</button>
            <button style={{ height: 38, borderRadius: 10, border: 0, background: '#f1f1f1', color: '#202020', padding: '0 20px', fontSize: 13, fontWeight: 760, transform: `scale(${1 - clickChoose * 0.05})` }}>打开</button>
          </div>
        </Glass>
      ) : null}
      {uploadToast > 0 ? (
        <Glass mode="dark" strong style={{ position: 'absolute', left: 1104, top: 430, width: 250, height: 88, borderRadius: 18, padding: 14, display: 'flex', gap: 12, alignItems: 'center', opacity: uploadToast, transform: `translateY(${(1 - uploadToast) * 18}px)`, background: 'rgba(38,38,38,0.92)' }}>
          <TomJerryPhoto size={56} rounded={12} />
          <div>
            <div style={{ color: dark.text, fontSize: 14, fontWeight: 760 }}>上传完成</div>
            <div style={{ color: dark.muted, fontSize: 12, marginTop: 5 }}>正在渲染新形象</div>
          </div>
        </Glass>
      ) : null}
      <CursorSpotlight x={968} y={742} progress={clickUpload} mode="dark" />
      <CursorSpotlight x={1048} y={680} progress={clickChoose} mode="dark" />
      <Cursor x={cursorX} y={cursorY} scale={1.24} />
      <FeatureCaption mode="dark" opacity={enter(local, 12, 22)}>
        Upload any image and render it as a custom desktop companion
      </FeatureCaption>
    </AbsoluteFill>
  );
}

function IconButton({ icon, active = false }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <div style={{ width: 31, height: 31, borderRadius: 7, display: 'grid', placeItems: 'center', color: active ? '#2f8fff' : light.muted, background: active ? 'rgba(47,143,255,0.10)' : 'transparent' }}>
      {icon}
    </div>
  );
}

function ChatBubble({ role, children, width = 400 }: { role: 'user' | 'assistant'; children: React.ReactNode; width?: number }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: width, borderRadius: 9, border: `1px solid ${light.line}`, background: isUser ? 'rgba(255,255,255,0.82)' : 'transparent', padding: isUser ? '9px 12px' : '6px 0', color: light.text, fontSize: 15, lineHeight: '24px', boxShadow: isUser ? 'inset 0 1px 0 rgba(255,255,255,0.55)' : 'none' }}>{children}</div>
    </div>
  );
}

function CompactChatBubble({ role, children, width = 300 }: { role: 'user' | 'assistant'; children: React.ReactNode; width?: number }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: width,
          borderRadius: 9,
          border: '1px solid rgba(255,255,255,0.10)',
          background: isUser ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.085)',
          color: '#ece9e3',
          padding: '8px 10px',
          fontSize: 13,
          lineHeight: '20px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ComposerBar({ mode, darkMode = false, imageAttached = false, sendPulse = 0 }: { mode: 'text' | 'voice' | 'image'; darkMode?: boolean; imageAttached?: boolean; sendPulse?: number }) {
  const frame = useCurrentFrame();
  const line = darkMode ? 'rgba(255,255,255,0.10)' : light.line;
  const muted = darkMode ? 'rgba(236,233,227,0.56)' : light.muted;
  const text = darkMode ? '#ece9e3' : '#20201d';
  const surface = darkMode ? '#343434' : 'rgba(255,255,255,0.74)';
  return (
    <div style={{ padding: 10 }}>
      {imageAttached && (
        <div style={{ marginBottom: 7, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 7, border: `1px solid ${line}`, background: darkMode ? 'rgba(255,255,255,0.05)' : '#fff', padding: '6px 9px', fontSize: 12, color: muted }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #3c4652, #806b58)' }} />
          screenshot-focus-settings.png
        </div>
      )}
      <div style={{ minHeight: 50, display: 'flex', alignItems: 'flex-end', gap: 5, border: `1px solid ${line}`, background: surface, borderRadius: 9, padding: 5, boxShadow: darkMode ? '0 0 0 2px rgba(47,143,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.58), 0 6px 18px rgba(42,38,31,0.06)' }}>
        <IconButton icon={<ImagePlus size={16} />} active={mode === 'image'} />
        <IconButton icon={<Mic size={16} />} active={mode === 'voice'} />
        {mode === 'voice' ? (
          <div style={{ flex: 1, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
            {Array.from({ length: 48 }, (_, i) => {
              const v = Math.max(0, Math.sin(frame / 5 + i * 0.58));
              return <span key={i} style={{ width: 2, height: 7 + v * 20, borderRadius: 999, background: text, opacity: 0.36 + v * 0.4 }} />;
            })}
          </div>
        ) : (
          <div style={{ flex: 1, color: muted, fontSize: 15, padding: '9px 8px' }}>{mode === 'image' ? '请分析这张截图...' : '输入消息...'}</div>
        )}
        <button style={{ height: 31, border: 0, borderRadius: 7, padding: '0 13px', background: '#22221f', color: '#fafafa', fontSize: 12, fontWeight: 650, transform: `scale(${1 - sendPulse * 0.05})`, boxShadow: sendPulse ? '0 0 0 5px rgba(255,255,255,0.08)' : 'none' }}>发送</button>
      </div>
    </div>
  );
}

function ModelConfigPanel() {
  const frame = useCurrentFrame();
  const local = frame - scenes.chat.from;
  const hover = enter(local, 250, 20) * (1 - enter(local, 308, 18));
  return (
    <SettingsShell mode="dark" active="Chat 模型" width={660} height={500}>
      <div style={{ fontSize: 23, fontWeight: 760, marginBottom: 14 }}>Chat 模型</div>
      <Glass mode="dark" style={{ borderRadius: 14, background: 'rgba(255,255,255,0.045)' }}>
        <SettingRow mode="dark" label="模型" hint="自定义：OpenAI · gpt-5.1-mini" right={<Segment mode="dark" labels={['默认', '自定义']} active={1} />} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.065)' }}>
          <div>
            <div style={{ color: dark.text, fontSize: 13, fontWeight: 620, lineHeight: '20px' }}>自定义配置</div>
            <div style={{ color: dark.muted, fontSize: 11, lineHeight: '18px', marginTop: 2 }}>Base URL、Model、API Key；默认配置用于 Chat</div>
          </div>
          <button style={{ height: 34, minWidth: 132, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, padding: '0 13px', background: hover ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.075)', color: dark.text, fontSize: 12, fontWeight: 760, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: hover ? '0 0 0 5px rgba(255,255,255,0.065), 0 12px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.10)' : 'inset 0 1px 0 rgba(255,255,255,0.04)', transform: `translateY(${-2 * hover}px) scale(${1 + hover * 0.035})` }}>
            <Plus size={14} /> 添加 API Key
          </button>
        </div>
        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.04)', padding: 13, boxShadow: '0 10px 26px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <span style={{ color: dark.text, fontSize: 13, fontWeight: 650 }}>OpenAI</span>
              <span style={{ borderRadius: 4, background: 'rgba(47,143,255,0.18)', color: '#9ed0ff', padding: '2px 7px', fontSize: 11 }}>默认</span>
            </div>
            <div style={{ color: dark.muted, fontSize: 11, lineHeight: '18px' }}>Model: gpt-5.1-mini</div>
            <div style={{ color: dark.muted, fontSize: 11, lineHeight: '18px' }}>Base URL: https://api.openai.com/v1</div>
            <div style={{ color: dark.muted, fontSize: 11, lineHeight: '18px' }}>API Key: sk-••••••••</div>
          </div>
          <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.04)', padding: 13, color: dark.muted, fontSize: 13 }}>
            暂无其他 API 配置
          </div>
        </div>
      </Glass>
    </SettingsShell>
  );
}

function FloatingChatButton({ opacity, scale }: { opacity: number; scale: number }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.16)',
        background: 'rgba(28,27,24,0.96)',
        color: 'rgba(236,233,227,0.72)',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 5px 14px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <MessageCircle size={14} strokeWidth={2.2} />
    </div>
  );
}

function CompactHoverChat({ mode, answerChars, progress, imageAttached, sent, sendPulse }: { mode: 'text' | 'voice' | 'image'; answerChars: number; progress: number; imageAttached: boolean; sent: boolean; sendPulse: number }) {
  const pop = spring({ frame: progress * 30, fps, config: { damping: 16, stiffness: 120 } });
  return (
    <Glass
      mode="dark"
      strong
      style={{
        width: 500,
        borderRadius: 18,
        background: 'rgba(44,44,44,0.86)',
        opacity: progress,
        transform: `translateY(${(1 - progress) * 18}px) scale(${0.94 + pop * 0.06})`,
        transformOrigin: 'top center',
      }}
    >
      <div style={{ minHeight: imageAttached ? 272 : 302, padding: '18px 18px 6px', display: 'grid', alignContent: 'end', gap: 12 }}>
        {sent ? <CompactChatBubble role="user" width={330}>{chatMessages.user}</CompactChatBubble> : null}
        {answerChars > 0 ? (
          <CompactChatBubble role="assistant" width={382}>
            {chatMessages.assistant.slice(0, answerChars)}
            {answerChars < chatMessages.assistant.length ? <span style={{ opacity: Math.floor(progress * 30 / 10) % 2 ? 1 : 0 }}>_</span> : null}
          </CompactChatBubble>
        ) : null}
      </div>
      <ComposerBar mode={mode} darkMode imageAttached={imageAttached} sendPulse={sendPulse} />
    </Glass>
  );
}

function ChatScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.chat);
  const local = frame - scenes.chat.from;
  const mode = local < 142 ? 'image' : local < 182 ? 'voice' : 'text';
  const chatOpen = enter(local, 82, 30);
  const modelSwap = enter(local, 224, 38);
  const imageAttached = local >= 114;
  const sent = local >= 178;
  const sendPulse = local >= 170 && local <= 190 ? clickOnce(local, 170, 20) : 0;
  const answerChars = Math.floor(interpolate(local, [194, 224], [0, chatMessages.assistant.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const petMove = interpolate(local, [0, 72], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  const petX = interpolate(petMove, [0, 1], [1606, 650], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const petY = interpolate(petMove, [0, 1], [790, 396], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hoverPulse = enter(local, 48, 24) * (1 - enter(local, 84, 18));
  const buttonVisible = enter(local, 42, 18) * (1 - modelSwap);
  const clickPulse = local >= 72 && local <= 94 ? clickOnce(local, 72, 22) : 0;
  const captionChat = enter(local, 20, 22) * (1 - modelSwap);
  const captionModel = modelSwap;

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: 'absolute',
          left: petX,
          top: petY,
          width: 238,
          height: 246,
          display: 'grid',
          placeItems: 'center',
          transform: 'translate(-50%, -50%)',
          opacity: 1,
        }}
      >
        <CatSprite state="idle" size={188} />
        {hoverPulse > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 14,
              borderRadius: 999,
              border: `3px solid rgba(255,255,255,${0.34 * hoverPulse})`,
              boxShadow: `0 0 0 ${18 * hoverPulse}px rgba(255,255,255,${0.055 * hoverPulse})`,
            }}
          />
        ) : null}
        <div style={{ position: 'absolute', right: 38, bottom: 58 }}>
          <FloatingChatButton opacity={buttonVisible} scale={0.86 + buttonVisible * 0.14} />
        </div>
      </div>
      <div style={{ opacity: 1 - modelSwap }}>
        <CursorSpotlight x={petX + 58} y={petY + 84} progress={clickPulse} mode="dark" />
        <Cursor x={local < 70 ? petX + 8 : petX + 58} y={local < 70 ? petY + 12 : petY + 84} scale={1.16} />
      </div>
      <div style={{ position: 'absolute', left: 820, top: 286, opacity: 1 - modelSwap, transform: `translateY(${-10 * modelSwap}px)` }}>
        <CompactHoverChat mode={mode} answerChars={answerChars} progress={chatOpen * (1 - modelSwap)} imageAttached={imageAttached} sent={sent} sendPulse={sendPulse} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 820,
          top: 246,
          opacity: modelSwap,
          transform: `translateY(${(1 - modelSwap) * 28}px) scale(${0.96 + modelSwap * 0.04})`,
        }}
      >
        <ModelConfigPanel />
      </div>
      <div style={{ opacity: modelSwap }}>
        <Cursor x={1342} y={428} scale={1.12} />
      </div>
      <FeatureCaption mode="dark" opacity={captionChat}>
        Hover DeskCat to open compact chat with text, voice, and images
      </FeatureCaption>
      <FeatureCaption mode="dark" opacity={captionModel}>
        Customize model providers, Base URL, Model, and API keys
      </FeatureCaption>
    </AbsoluteFill>
  );
}

function OrbAvatarFixture({ state, progress = 0, size = 186, hovered = true }: { state: PetState; progress?: number; size?: number; hovered?: boolean }) {
  const frame = useCurrentFrame();
  const label = state === 'idle' ? 'idle' : state === 'work' ? 'work' : 'rest';
  const letters = label.toUpperCase().split('');
  const restLetters = Array.from({ length: 28 }, (_, index) => 'REST'[index % 4]);
  const colors = state === 'work'
    ? {
        stateCore: 'rgba(91,181,255,0.52)',
        stateMid: 'rgba(91,181,255,0.32)',
        stateEdge: 'rgba(91,181,255,0.13)',
        baseCore: 'rgba(39,54,68,0.94)',
        baseMid: 'rgba(31,45,58,0.78)',
        baseSoft: 'rgba(24,34,44,0.50)',
        baseEdge: 'rgba(183,220,248,0.12)',
        waveStrong: 'rgba(91,181,255,0.18)',
        waveSoft: 'rgba(143,207,255,0.09)',
      }
    : state === 'rest'
      ? {
          stateCore: 'rgba(255,166,214,0.50)',
          stateMid: 'rgba(255,166,214,0.30)',
          stateEdge: 'rgba(255,166,214,0.12)',
          baseCore: 'rgba(65,44,56,0.94)',
          baseMid: 'rgba(55,36,48,0.78)',
          baseSoft: 'rgba(42,28,38,0.50)',
          baseEdge: 'rgba(255,204,232,0.11)',
          waveStrong: 'rgba(255,166,214,0.155)',
          waveSoft: 'rgba(255,197,228,0.075)',
        }
      : {
          stateCore: 'rgba(182,187,194,0.40)',
          stateMid: 'rgba(154,160,168,0.24)',
          stateEdge: 'rgba(126,132,140,0.10)',
          baseCore: 'rgba(54,56,60,0.94)',
          baseMid: 'rgba(43,45,49,0.78)',
          baseSoft: 'rgba(34,36,40,0.50)',
          baseEdge: 'rgba(226,230,235,0.10)',
          waveStrong: 'rgba(196,202,210,0.105)',
          waveSoft: 'rgba(150,156,164,0.05)',
        };
  const hover = hovered ? 1 : 0;
  const breathing = Math.sin(frame / 34) * 0.018;
  const waveScale = 0.72 + ((frame % 108) / 108) * 0.46;
  const workStarts = [
    { x: -0.3, y: -0.3, rotate: -150 },
    { x: 0.3, y: -0.3, rotate: 150 },
    { x: 0.3, y: 0.3, rotate: -210 },
    { x: -0.3, y: 0.3, rotate: 210 },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 999,
        display: 'grid',
        placeItems: 'center',
        overflow: 'visible',
        transform: `scale(${1 + breathing + hover * 0.015})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          background:
            state === 'rest' && hovered
              ? `radial-gradient(circle at 50% 50%, ${colors.stateCore} 0%, ${colors.stateMid} 42%, ${colors.stateEdge} 72%, transparent 100%), radial-gradient(circle at 50% 50%, rgba(55,36,48,0.98) 0%, rgba(55,36,48,0.98) 100%)`
              : `radial-gradient(circle at 50% 50%, ${colors.stateCore} 0%, ${colors.stateMid} 38%, ${colors.stateEdge} 68%, transparent 100%), radial-gradient(circle at 50% 50%, ${colors.baseCore} 0%, ${colors.baseMid} 34%, ${colors.baseSoft} 62%, ${colors.baseEdge} 82%, rgba(226,230,235,0) 100%)`,
          boxShadow: 'inset 0 0 42px rgba(20,20,20,0.065)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          background: `repeating-radial-gradient(circle at 50% 50%, ${colors.waveStrong} 0%, rgba(18,18,18,0.038) 7%, ${colors.waveSoft} 12%, rgba(190,190,190,0) 19%)`,
          opacity: 0.72,
          transform: `scale(${waveScale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -1,
          border: '0.8px solid rgba(245,245,245,0.30)',
          borderRadius: 999,
          opacity: hovered ? 1 : 0,
          transform: `scale(${hovered ? 1 : 0.985})`,
        }}
      />
      {state === 'idle' && letters.map((letter, index) => {
        const angle = (index / letters.length) * Math.PI * 2 - Math.PI / 2;
        const radius = size * (hovered ? 0.55 : 0.64);
        return (
          <span
            key={`${letter}-${index}`}
            style={{
              position: 'absolute',
              left: size / 2 + Math.cos(angle) * radius - 6,
              top: size / 2 + Math.sin(angle) * radius - 7,
              color: hovered ? 'rgba(255,255,255,0.82)' : 'rgba(245,245,245,0.66)',
              fontSize: size * 0.048,
              fontWeight: 700,
              letterSpacing: 1.2,
            }}
          >
            {letter}
          </span>
        );
      })}
      {state === 'work' && letters.map((letter, index) => {
        const start = workStarts[index] ?? workStarts[0];
        const localProgress = clamp01(progress * letters.length - index);
        const eased = localProgress * localProgress * (3 - 2 * localProgress);
        const remaining = 1 - eased;
        return (
          <span
            key={`${letter}-${index}`}
            style={{
              position: 'absolute',
              left: size / 2 - 7,
              top: size / 2 - 9,
              color: 'rgba(245,245,245,0.72)',
              fontSize: size * 0.065,
              fontWeight: 520,
              opacity: 0.34 + eased * 0.48,
              transform: `translate(${start.x * size * remaining}px, ${start.y * size * remaining}px) rotate(${start.rotate * remaining}deg) scale(${0.92 + eased * 0.16})`,
            }}
          >
            {letter}
          </span>
        );
      })}
      {state === 'rest' && restLetters.map((letter, index) => {
        const col = (index % 7) - 3;
        const row = Math.floor(index / 7) - 1.5;
        const angle = (index / restLetters.length) * Math.PI * 2 + frame / 24;
        const x = hovered ? col * size * 0.105 : Math.cos(angle) * size * 0.54;
        const y = hovered ? row * size * 0.15 : Math.sin(angle) * size * 0.54;
        return (
          <span
            key={`${letter}-${index}`}
            style={{
              position: 'absolute',
              left: size / 2 + x - 5,
              top: size / 2 + y - 6,
              color: 'rgba(245,245,245,0.66)',
              fontSize: size * 0.046,
              fontWeight: 700,
              opacity: hovered ? 0.54 : 0.34,
            }}
          >
            {letter}
          </span>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateY(${hovered ? -1 : 2}px)`,
          color: 'rgba(245,245,245,0.88)',
          fontSize: Math.max(10, size * 0.062),
          fontWeight: 500,
          letterSpacing: '0.04em',
          lineHeight: 1,
          opacity: hovered ? 0.84 : 0,
          textTransform: 'lowercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function StatesScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.states);
  const local = frame - scenes.states.from;
  const stateIndex = Math.floor(interpolate(local, [10, 168], [0, 2.99], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const state: PetState = stateIndex === 0 ? 'idle' : stateIndex === 1 ? 'work' : 'rest';
  const progress = interpolate(local, [50, 166], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const orbProgress = interpolate(local, [22, 142], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

  return (
    <AbsoluteFill style={{ opacity, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 76, color: dark.text, fontSize: 60, fontWeight: 820 }}>Two bodies. One companion.</div>
      <div style={{ position: 'absolute', top: 150, color: 'rgba(255,255,255,0.60)', fontSize: 24, lineHeight: '34px', fontWeight: 560, textAlign: 'center' }}>
        DeskCat can appear as a pet sprite or as a live Orb, with every state reacting on hover.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '430px 660px', gap: 64, alignItems: 'center', marginTop: 84 }}>
        <Glass mode="dark" strong style={{ width: 430, height: 430, borderRadius: 30, display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'absolute', left: 28, top: 24, color: dark.muted, fontSize: 16, fontWeight: 700 }}>Pet mode · {state}</div>
          <CatSprite state={state} index={state === 'rest' ? 1 : stateIndex} size={236} />
        </Glass>
        <Glass mode="dark" strong style={{ width: 660, height: 430, borderRadius: 30, padding: '72px 34px 34px' }}>
          <div style={{ position: 'absolute', left: 28, top: 24, color: dark.muted, fontSize: 16, fontWeight: 700 }}>Orb mode · hover states</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', height: '100%', alignItems: 'center', gap: 26 }}>
            {(['idle', 'work', 'rest'] as PetState[]).map((orbState, index) => (
              <div key={orbState} style={{ display: 'grid', justifyItems: 'center', gap: 22, opacity: enter(local, 0, 16) }}>
                <OrbAvatarFixture state={orbState} progress={orbState === 'work' ? orbProgress : progress} size={158} hovered />
                <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: 15, fontWeight: 700 }}>{orbState}</div>
              </div>
            ))}
          </div>
        </Glass>
      </div>
      <FeatureCaption mode="dark" opacity={enter(local, 16, 22)}>
        Switch between pet sprites and interactive Orb states
      </FeatureCaption>
    </AbsoluteFill>
  );
}

function ContextMenu({ active = 'coding' }: { active?: 'coding' | 'focus' }) {
  const frame = useCurrentFrame();
  const pop = spring({ frame: frame - scenes.modes.from - 96, fps, config: { damping: 17, stiffness: 120 } });
  const items = ['个人档案', '新对话', '历史对话', '专注模式', 'Coding 模式', '设置', '隐藏', '退出'];

  return (
    <div style={{ position: 'absolute', right: 252, bottom: 282, display: 'flex', gap: 8, opacity: pop }}>
      <Glass mode="light" strong style={{ width: 136, borderRadius: 8, padding: '6px 4px', transform: `scale(${0.86 + pop * 0.14})`, transformOrigin: 'top right' }}>
        {items.map((item, index) => {
          const hot = (active === 'coding' && item === 'Coding 模式') || (active === 'focus' && item === '专注模式');
          return (
            <div key={item}>
              {[1, 4, 6].includes(index) && <div style={{ height: 1, background: 'rgba(54,50,43,0.10)', margin: '5px 4px' }} />}
              <div style={{ height: 25, borderRadius: 5, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: item === '退出' ? '#c43d3d' : '#20201d', background: hot ? 'rgba(47,143,255,0.12)' : 'transparent', fontWeight: hot ? 680 : 520 }}>
                {item}
                {item === 'Coding 模式' && <ChevronRight size={12} />}
              </div>
            </div>
          );
        })}
      </Glass>
      {active === 'coding' && (
        <Glass mode="light" strong style={{ width: 190, borderRadius: 8, padding: '8px 4px' }}>
          {['Codex · 当前', '继承当前 session', '开启新 session', 'Claude Code', '继承当前 session', '开启新 session'].map((item, index) => (
            <div key={`${item}-${index}`} style={{ height: index === 0 || index === 3 ? 22 : 25, borderRadius: 5, padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: index === 0 || index === 3 ? 10 : 12, textTransform: index === 0 || index === 3 ? 'uppercase' : undefined, letterSpacing: index === 0 || index === 3 ? 0.8 : 0, color: index === 0 || index === 3 ? '#77736c' : '#20201d', background: index === 2 || index === 4 ? 'rgba(47,143,255,0.12)' : 'transparent', fontWeight: index === 2 || index === 4 ? 680 : 520 }}>
              {item}
            </div>
          ))}
        </Glass>
      )}
    </div>
  );
}

type CodingDemoStatus = 'needs-input' | 'done' | 'working';

function codingDemoColor(status: CodingDemoStatus) {
  if (status === 'working') return '#ffbd2e';
  if (status === 'needs-input') return '#ff5f57';
  return '#28c840';
}

function CodingStatusToolButton({ status, visible = 1 }: { status: CodingDemoStatus; visible?: number }) {
  const color = codingDemoColor(status);
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        border: '1px solid rgba(0,0,0,0.14)',
        background: color,
        color: 'rgba(32,28,22,0.62)',
        display: 'grid',
        placeItems: 'center',
        opacity: visible,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.45) inset, 0 5px 14px ${color}40`,
      }}
    >
      <MessageCircle size={14} strokeWidth={2.2} />
    </div>
  );
}

function CodexGlyph() {
  return (
    <div style={{ width: 82, height: 82, borderRadius: 22, border: '1px solid rgba(255,255,255,0.18)', background: '#181818', display: 'grid', placeItems: 'center', boxShadow: '0 18px 42px rgba(0,0,0,0.25)' }}>
      <svg width="52" height="52" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fill="#d7d7d7"
          d="M11.248 18.25q-.825 0-1.568-.314a4.3 4.3 0 0 1-1.32-.874 4 4 0 0 1-1.304.214 4 4 0 0 1-2.046-.544 4.27 4.27 0 0 1-1.518-1.485 4 4 0 0 1-.56-2.095q0-.48.131-1.04A4.4 4.4 0 0 1 2.04 10.71a4.07 4.07 0 0 1 .017-3.4 4.2 4.2 0 0 1 1.056-1.418 3.8 3.8 0 0 1 1.6-.842 3.9 3.9 0 0 1 .76-1.683q.593-.759 1.451-1.188a4.04 4.04 0 0 1 1.832-.429q.825 0 1.567.313.742.314 1.32.875a4 4 0 0 1 1.304-.215q1.106 0 2.046.545a4.14 4.14 0 0 1 1.501 1.485q.578.941.578 2.095 0 .48-.132 1.04.66.61 1.023 1.419.363.792.363 1.666 0 .892-.38 1.717a4.3 4.3 0 0 1-1.072 1.435 3.8 3.8 0 0 1-1.584.825 3.8 3.8 0 0 1-.775 1.683 4.06 4.06 0 0 1-1.436 1.188 4.04 4.04 0 0 1-1.832.429m-4.076-2.062q.825 0 1.435-.347l3.103-1.782a.36.36 0 0 0 .164-.313v-1.42L7.881 14.62a.67.67 0 0 1-.726 0l-3.118-1.798a.5.5 0 0 1-.017.115v.198q0 .841.396 1.551.413.693 1.139 1.089a3.2 3.2 0 0 0 1.617.412m.165-2.69a.4.4 0 0 0 .181.05q.083 0 .165-.05l1.238-.71-3.977-2.31a.7.7 0 0 1-.363-.643v-3.58q-.825.362-1.32 1.122a2.9 2.9 0 0 0-.495 1.65q0 .809.413 1.55.412.743 1.072 1.123zm3.91 3.663q.875 0 1.585-.396a2.96 2.96 0 0 0 1.534-2.64v-3.564a.32.32 0 0 0-.165-.297l-1.254-.726v4.604a.7.7 0 0 1-.363.643l-3.119 1.799a3 3 0 0 0 1.783.577m.627-6.039V8.878L10.01 7.822 8.129 8.878v2.244l1.881 1.056zM7.057 5.859a.7.7 0 0 1 .363-.644l3.119-1.798a3 3 0 0 0-1.782-.578q-.874 0-1.584.396A2.96 2.96 0 0 0 6.05 4.324a3.07 3.07 0 0 0-.396 1.551v3.547q0 .199.165.314l1.237.726zm8.383 7.887q.825-.364 1.303-1.123.495-.758.495-1.65a3.15 3.15 0 0 0-.412-1.55q-.413-.743-1.073-1.123l-3.086-1.782q-.099-.065-.181-.049a.3.3 0 0 0-.165.05l-1.238.692 3.993 2.327a.6.6 0 0 1 .264.264.64.64 0 0 1 .1.363zm-3.317-8.382a.63.63 0 0 1 .726 0l3.135 1.831v-.297q0-.792-.396-1.501a2.86 2.86 0 0 0-1.105-1.155q-.71-.43-1.65-.43-.825 0-1.436.347L8.294 5.941a.36.36 0 0 0-.165.314v1.418z"
        />
      </svg>
    </div>
  );
}

function ClaudeCodeTerminal({ status, progress }: { status: CodingDemoStatus; progress: number }) {
  const color = codingDemoColor(status);
  const statusText =
    status === 'needs-input'
      ? 'needs input'
      : status === 'done'
        ? 'ready'
        : 'working';
  const line =
    status === 'needs-input'
      ? 'waiting for permission'
      : status === 'done'
        ? 'session ready'
        : 'reading project context';

  return (
    <div style={{ width: 650 }}>
      <div
        style={{
          height: 370,
          borderRadius: 18,
          background: '#111',
          color: '#d7d7d7',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 32px 90px rgba(0,0,0,0.38)',
          fontFamily: 'Menlo, Monaco, Consolas, monospace',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.10)', background: '#171717' }}>
          {['#ff5f57', '#ffbd2e', '#28c840'].map((dot) => (
            <span key={dot} style={{ width: 12, height: 12, borderRadius: 999, background: dot }} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: 44, top: 82, color: '#9ca3af', fontSize: 17 }}>
          <span style={{ color: '#e5e7eb' }}>$</span> claude
        </div>
        <div style={{ position: 'absolute', inset: '118px 52px 34px', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#e5e7eb', fontSize: 27, fontWeight: 760, marginBottom: 20 }}>Claude Code + Codex</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, marginBottom: 20 }}>
              <div style={{ width: 92, height: 72, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 17, top: 8, width: 58, height: 32, background: '#cfcfcf', borderTop: '8px solid #f5f5f5' }} />
                <div style={{ position: 'absolute', left: 4, top: 38, width: 84, height: 14, background: '#cfcfcf' }} />
                <div style={{ position: 'absolute', left: 27, top: 19, width: 9, height: 9, background: '#111' }} />
                <div style={{ position: 'absolute', right: 27, top: 19, width: 9, height: 9, background: '#111' }} />
                {[20, 42, 64].map((left) => <div key={left} style={{ position: 'absolute', left, top: 58, width: 7, height: 14, background: '#cfcfcf' }} />)}
              </div>
              <CodexGlyph />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: '#d1d5db', fontSize: 16, fontWeight: 700 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: color, boxShadow: `0 0 20px ${color}` }} />
              {statusText}
            </div>
            <div style={{ marginTop: 22, color: '#8e8e93', fontSize: 15, opacity: 0.48 + progress * 0.52 }}>
              {line}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModesScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.modes);
  const local = frame - scenes.modes.from;
  const statusIndex = Math.min(2, Math.floor(interpolate(local, [30, 176], [0, 2.99], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const statuses: CodingDemoStatus[] = ['needs-input', 'done', 'working'];
  const status = statuses[statusIndex];
  const statusColor = codingDemoColor(status);
  const pulse = 0.45 + Math.sin(frame / 8) * 0.55;
  const terminalProgress = interpolate(local, [36 + statusIndex * 34, 92 + statusIndex * 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ opacity, alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 72, color: dark.text, fontSize: 60, fontWeight: 820 }}>coding mode & focus mode</div>
      <div style={{ position: 'absolute', left: 420, top: 342, width: 330, height: 330 }}>
        <div style={{ position: 'absolute', left: 36, top: 40, width: 250, height: 260, display: 'grid', placeItems: 'center' }}>
          <CatSprite state="work" size={210} />
          <div
            style={{
              position: 'absolute',
              right: -12,
              bottom: 62,
              filter: `drop-shadow(0 0 ${10 + pulse * 18}px ${statusColor})`,
              transform: `scale(${1 + pulse * 0.08})`,
            }}
          >
            <CodingStatusToolButton status={status} visible={1} />
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 690,
          top: 518,
          width: 200,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
          opacity: 0.28 + pulse * 0.48,
          boxShadow: `0 0 ${20 + pulse * 22}px ${statusColor}`,
          transform: `translateX(${pulse * 18}px)`,
        }}
      />
      <div style={{ position: 'absolute', left: 860, top: 314 }}>
        <ClaudeCodeTerminal status={status} progress={terminalProgress} />
      </div>
      <FeatureCaption mode="dark" opacity={enter(local, 16, 22)}>
        Focus mode keeps DeskCat quiet while Coding mode mirrors Claude Code and Codex status
      </FeatureCaption>
    </AbsoluteFill>
  );
}

function TimelineScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.timeline);
  const local = frame - scenes.timeline.from;
  const progress = interpolate(local, [34, 178], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const selected = Math.min(timelineBlocks.length - 1, Math.floor(interpolate(local, [96, 230], [0, timelineBlocks.length - 0.01], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const visibleCategories = ['browser', 'coding', 'chat', 'office', 'music', 'terminal'];

  return (
    <AbsoluteFill style={{ opacity, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', left: 116, top: 78, color: dark.text, fontSize: 64, lineHeight: '72px', fontWeight: 820 }}>Timeline remembers<br />the shape of your day.</div>
      <div style={{ position: 'absolute', right: 126, top: 96, color: dark.muted, fontSize: 22, lineHeight: '32px', width: 520 }}>
        Built from the app's mock Timeline dataset: foreground windows, background music, terminal activity, top apps, and hourly rhythm.
      </div>
      <Glass mode="dark" strong style={{ width: 1540, height: 650, borderRadius: 32, padding: 34, marginTop: 116, background: 'rgba(54,54,54,0.76)', borderColor: 'rgba(255,255,255,0.105)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dark.text, fontSize: 22, fontWeight: 760 }}><Clock3 size={25} /> Timeline <span style={{ color: dark.muted, fontSize: 13 }}>昨日示例</span></div>
          <div style={{ color: dark.muted, fontSize: 14 }}>7 段 · 6 小时 28 分钟</div>
        </div>
        <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
          {visibleCategories.map((category) => {
            const meta = timelineCategoryMeta[category];
            return (
            <div key={category} style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, background: meta.soft, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color }} />
              </span>
              {meta.label}
            </div>
            );
          })}
        </div>
        <div style={{ position: 'relative', height: 124, borderRadius: 18, background: 'rgba(255,255,255,0.035)', overflow: 'hidden', boxShadow: '0 14px 34px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.045)' }}>
          {Array.from({ length: 13 }, (_, i) => i * 2).map((hour) => (
            <div key={hour} style={{ position: 'absolute', left: `${(hour / 24) * 100}%`, top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', color: '#8b8d98', fontSize: 11, paddingLeft: 5, paddingTop: 8 }}>{String(hour).padStart(2, '0')}:00</div>
          ))}
          {timelineBlocks.map((block, index) => {
            const meta = timelineCategoryMeta[block.category] ?? timelineCategoryMeta.other;
            const isSelected = index === selected;
            return (
              <div key={block.title} style={{ position: 'absolute', left: `${block.start}%`, top: 48, width: `${block.width * progress}%`, height: 56, background: isSelected ? meta.color : meta.fill, opacity: isSelected ? 1 : 0.74, filter: isSelected ? 'saturate(1.35) brightness(0.72)' : 'none', boxShadow: isSelected ? `inset 0 0 0 4px rgba(255,255,255,0.74), 0 0 0 2px ${meta.color}, 0 16px 32px rgba(0,0,0,0.34)` : 'inset 1px 0 rgba(255,255,255,0.50), inset -1px 0 rgba(255,255,255,0.40)' }} />
            );
          })}
        </div>
        <div style={{ marginTop: 13, display: 'grid', gap: 8 }}>
          {backgroundMarkers.map((marker) => {
            const trackLeft = 206;
            const trackWidth = 1196;
            const meta = timelineCategoryMeta[marker.type] ?? timelineCategoryMeta.other;
            return (
            <div key={marker.name} style={{ position: 'relative', height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.018)' }}>
              <div style={{ position: 'absolute', left: trackLeft + (marker.start / 100) * trackWidth, top: 9, width: (marker.width * progress / 100) * trackWidth, height: 12, borderRadius: 999, background: meta.soft, border: `1px solid ${meta.color}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'absolute', left: 10, top: 7, color: dark.muted, fontSize: 12 }}>{marker.name}</div>
            </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 18 }}>
          <Glass mode="dark" style={{ borderRadius: 18, padding: 18, height: 224, background: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.10)' }}>
            <div style={{ color: dark.text, fontSize: 17, fontWeight: 760, marginBottom: 12 }}>{timelineBlocks[selected].appName}</div>
            <div style={{ color: dark.muted, fontSize: 14, lineHeight: '23px' }}>{timelineBlocks[selected].title}</div>
            <div style={{ marginTop: 12, color: timelineCategoryMeta[timelineBlocks[selected].category]?.color ?? timelineCategoryMeta.other.color, fontSize: 13 }}>{timelineBlocks[selected].time}</div>
            <div style={{ marginTop: 22, display: 'grid', gap: 8 }}>
              {['SettingsPanel.tsx', 'timelineView.ts', 'pnpm test:timeline'].map((row) => (
                <div key={row} style={{ height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.045)', color: 'rgba(255,255,255,0.54)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 12 }}>{row}</div>
              ))}
            </div>
          </Glass>
          <Glass mode="dark" style={{ borderRadius: 18, padding: 18, height: 224, background: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.10)' }}>
            <div style={{ color: dark.text, fontSize: 17, fontWeight: 760, marginBottom: 14 }}>Top 软件</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {topApps.map(([app, value, detail]) => (
                <div key={app} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 92px', gap: 8, alignItems: 'center', color: dark.muted, fontSize: 12 }}>
                  <span>{app}</span>
                  <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.055)' }}><div style={{ width: `${value * progress * 100}%`, height: '100%', borderRadius: 999, background: '#60646c' }} /></div>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </Glass>
          <Glass mode="dark" style={{ borderRadius: 18, padding: 18, height: 224, background: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.10)' }}>
            <div style={{ color: dark.text, fontSize: 17, fontWeight: 760, marginBottom: 14 }}>全天活跃度</div>
            <div style={{ height: 136, display: 'flex', alignItems: 'flex-end', gap: 7 }}>
              {[18, 48, 32, 66, 44, 24, 58, 86, 36, 52, 28, 64].map((height, index) => (
                <div key={index} style={{ flex: 1, height: Math.max(3, height * progress), borderRadius: '6px 6px 0 0', background: '#60646c' }} />
              ))}
            </div>
          </Glass>
        </div>
      </Glass>
    </AbsoluteFill>
  );
}

function FinaleScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.finale);
  const local = frame - scenes.finale.from;
  const burst = enter(local, 8, 42);
  const gather = enter(local, 86, 70);
  const lock = enter(local, 136, 46);
  const title = enter(local, 128, 42);
  const subtitle = enter(local, 154, 34);
  const breathe = Math.sin(frame / 18) * 0.5 + 0.5;
  const panels = [
    [Palette, 'Appearance'],
    [MessageSquareText, 'Chat'],
    [PawPrint, 'Pet + Orb'],
    [BriefcaseBusiness, 'Focus'],
    [Terminal, 'Coding'],
    [BarChart3, 'Timeline'],
  ] as const;
  const scanX = interpolate(local, [0, scenes.finale.duration], [-18, 118], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 46%, rgba(255,255,255,${0.11 + breathe * 0.04}), transparent 34%), radial-gradient(circle at 50% 58%, rgba(0,144,255,${0.06 * (1 - lock)}), transparent 42%)` }} />
      <div
        style={{
          position: 'absolute',
          left: `${scanX}%`,
          top: -120,
          width: 250,
          height: 1320,
          transform: 'rotate(18deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
          filter: 'blur(22px)',
          opacity: 0.22 * (1 - lock),
        }}
      />
      <div style={{ position: 'relative', width: 1280, height: 680, display: 'grid', placeItems: 'center' }}>
        {Array.from({ length: 18 }, (_, index) => {
          const angle = index * 0.82 + frame / 26;
          const radius = interpolate(gather, [0, 1], [560 + (index % 3) * 42, 142 + (index % 2) * 26], { easing: ease });
          const x = 640 + Math.cos(angle) * radius;
          const y = 318 + Math.sin(angle * 0.82) * radius * 0.38;
          const w = 42 + (index % 4) * 18;
          const alpha = (0.12 + (index % 5) * 0.035) * burst * (1 - lock * 0.72);
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: x - w / 2,
                top: y,
                width: w,
                height: 2,
                borderRadius: 999,
                background: index % 3 === 0 ? '#9ed0ff' : index % 3 === 1 ? '#f2c36b' : '#a8ddb8',
                opacity: alpha,
                boxShadow: '0 0 18px currentColor',
                transform: `rotate(${angle}rad)`,
              }}
            />
          );
        })}
        {panels.map(([Icon, label], index) => {
          const angle = (index / panels.length) * Math.PI * 2 + frame / 54;
          const ringX = Math.cos(angle) * interpolate(gather, [0, 1], [560, 285], { easing: ease });
          const ringY = Math.sin(angle) * interpolate(gather, [0, 1], [250, 126], { easing: ease });
          const finalX = (index - (panels.length - 1) / 2) * 132;
          const finalY = 210;
          const x = interpolate(lock, [0, 1], [ringX, finalX], { easing: ease });
          const y = interpolate(lock, [0, 1], [ringY, finalY], { easing: ease });
          const scale = interpolate(lock, [0, 1], [0.94 + burst * 0.1, 0.82], { easing: ease });
          return (
            <Glass key={label} mode="dark" style={{ position: 'absolute', left: 640 + x - 90, top: 318 + y - 58, width: 180, height: 116, borderRadius: 18, display: 'grid', placeItems: 'center', opacity: burst * (1 - title), transform: `scale(${scale}) rotate(${(1 - lock) * Math.sin(frame / 18 + index) * 5}deg)`, background: 'rgba(54,54,54,0.88)', borderColor: 'rgba(255,255,255,0.18)', boxShadow: '0 24px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              <Icon size={34} color={index === 4 ? '#9ed0ff' : 'rgba(255,255,255,0.90)'} />
              <div style={{ color: 'rgba(255,255,255,0.70)', fontSize: 15, fontWeight: 760 }}>{label}</div>
            </Glass>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: 640 - 124,
            top: 318 - 150,
            transform: `translateY(${interpolate(lock, [0, 1], [0, -44], { easing: ease })}px) scale(${0.86 + gather * 0.1 + lock * 0.06})`,
            filter: `drop-shadow(0 ${28 + breathe * 10}px ${28 + breathe * 8}px rgba(0,0,0,0.36))`,
          }}
        >
          <CatSprite state="idle" size={220} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 374,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#fff',
            fontSize: 116,
            lineHeight: '120px',
            fontWeight: 850,
            letterSpacing: 0,
            opacity: title,
            transform: `translateY(${interpolate(title, [0, 1], [34, 0], { easing: ease })}px) scale(${0.96 + title * 0.04})`,
            textShadow: '0 28px 80px rgba(0,0,0,0.44)',
          }}
        >
          DeskCat
        </div>
        <div
          style={{
            position: 'absolute',
            top: 505,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: dark.muted,
            fontSize: 27,
            fontWeight: 560,
            opacity: subtitle,
            transform: `translateY(${interpolate(subtitle, [0, 1], [18, 0], { easing: ease })}px)`,
          }}
        >
          the tiny desktop companion that keeps up with your day
        </div>
        <div
          style={{
            position: 'absolute',
            top: 562,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.52)',
            fontSize: 21,
            fontWeight: 560,
            opacity: subtitle,
            transform: `translateY(${interpolate(subtitle, [0, 1], [18, 0], { easing: ease })}px)`,
          }}
        >
          github.com/ppxinyue/DeskCat
        </div>
      </div>
    </AbsoluteFill>
  );
}

function FrameChrome() {
  const frame = useCurrentFrame();
  const { durationInFrames: total } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 38, borderRadius: 42, border: '1px solid rgba(128,128,128,0.20)' }} />
      <div style={{ position: 'absolute', left: 92, right: 92, bottom: 74, height: 3, borderRadius: 999, background: 'rgba(128,128,128,0.20)' }}>
        <div style={{ width: `${(frame / (total - 1)) * 100}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #f4f5f7, #8e8e8e, #1f1f1f)' }} />
      </div>
    </AbsoluteFill>
  );
}

function DeskCatAudio() {
  return (
    <>
      <Audio src={staticFile('audio/deskcat-bgm.wav')} volume={0.2} />
      {voiceTracks.map((track) => (
        <Sequence key={track.src} from={track.from} layout="none">
          <Audio src={staticFile(track.src)} volume={1} />
        </Sequence>
      ))}
    </>
  );
}

function SceneGate({ scene, children }: { scene: Scene; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  if (frame < scene.from - 36 || frame > scene.from + scene.duration + 36) {
    return null;
  }
  return <>{children}</>;
}

export function DeskCatProductVideo() {
  return (
    <AbsoluteFill style={{ fontFamily: 'Inter, Avenir Next, Helvetica Neue, Arial, sans-serif' }}>
      <Background />
      <SceneGate scene={scenes.hero}><HeroScene /></SceneGate>
      <SceneGate scene={scenes.appearance}><AppearanceScene /></SceneGate>
      <SceneGate scene={scenes.chat}><ChatScene /></SceneGate>
      <SceneGate scene={scenes.states}><StatesScene /></SceneGate>
      <SceneGate scene={scenes.modes}><ModesScene /></SceneGate>
      <SceneGate scene={scenes.timeline}><TimelineScene /></SceneGate>
      <SceneGate scene={scenes.finale}><FinaleScene /></SceneGate>
      <DeskCatAudio />
      <FrameChrome />
    </AbsoluteFill>
  );
}

export const DESKCAT_PRODUCT_VIDEO_DURATION = durationInFrames;
