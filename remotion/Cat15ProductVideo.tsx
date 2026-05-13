import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {
  Bot,
  BrainCircuit,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Gamepad2,
  Image as ImageIcon,
  KeyRound,
  MessageSquareText,
  Mic,
  Monitor,
  Music2,
  Palette,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';

type Scene = { from: number; duration: number };
type Vec = { x: number; y: number };

const fps = 30;
const scenes = {
  hero: { from: 0, duration: 210 },
  settings: { from: 180, duration: 360 },
  timeline: { from: 510, duration: 360 },
  chat: { from: 840, duration: 330 },
  focus: { from: 1140, duration: 330 },
  privacy: { from: 1440, duration: 270 },
  finale: { from: 1680, duration: 240 },
};

const c = {
  black: '#050506',
  panel: 'rgba(255,255,255,0.075)',
  panelStrong: 'rgba(255,255,255,0.13)',
  line: 'rgba(255,255,255,0.13)',
  text: 'rgba(255,255,255,0.94)',
  muted: 'rgba(255,255,255,0.54)',
  faint: 'rgba(255,255,255,0.30)',
  blue: '#5bb8ff',
  pink: '#ff8fcb',
  green: '#75e0aa',
  amber: '#ffd37a',
  orange: '#ffb078',
  warm: '#f2b36d',
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function local(frame: number, scene: Scene) {
  return frame - scene.from;
}

function sceneOpacity(frame: number, scene: Scene) {
  return interpolate(
    frame,
    [scene.from, scene.from + 24, scene.from + scene.duration - 30, scene.from + scene.duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease },
  );
}

function enter(frame: number, start: number, duration = 36) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
}

function SceneLayer({ scene, children }: { scene: Scene; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scene);
  const y = interpolate(frame, [scene.from, scene.from + 42], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>
      {children}
    </AbsoluteFill>
  );
}

function Backdrop() {
  const frame = useCurrentFrame();
  const drift = frame / (fps * 22);
  return (
    <AbsoluteFill style={{ background: c.black, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: -220,
          background:
            'radial-gradient(circle at 50% -8%, rgba(255,255,255,0.16), transparent 31%), radial-gradient(circle at 22% 78%, rgba(255,255,255,0.055), transparent 24%), radial-gradient(circle at 82% 64%, rgba(90,125,160,0.08), transparent 28%)',
          filter: 'blur(6px)',
          transform: `translate(${Math.sin(drift * Math.PI * 2) * 18}px, ${Math.cos(drift * Math.PI * 2) * 14}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 34,
          borderRadius: 42,
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(255,255,255,0.04)',
        }}
      />
    </AbsoluteFill>
  );
}

function Glass({
  children,
  style,
  strong = false,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  strong?: boolean;
}) {
  const frame = useCurrentFrame();
  const sheen = interpolate(frame % 180, [0, 180], [-42, 142], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  return (
    <div
      style={{
        borderRadius: 28,
        background: strong ? 'rgba(255,255,255,0.115)' : 'rgba(255,255,255,0.064)',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow:
          '0 28px 90px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(255,255,255,0.045)',
        backdropFilter: 'blur(32px) saturate(1.42)',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.12) 44%, transparent 63%)',
          opacity: strong ? 0.26 : 0.16,
          transform: `translateX(${sheen}%)`,
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}

function SceneBadge({
  index,
  zh,
  en,
  color = c.text,
}: {
  index: string;
  zh: string;
  en: string;
  color?: string;
}) {
  return (
    <div style={{ position: 'absolute', left: 118, top: 86, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ color: c.faint, fontSize: 15, fontWeight: 760, letterSpacing: 1.4 }}>{index}</div>
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.18)' }} />
      <div>
        <div style={{ color, fontSize: 20, lineHeight: '26px', fontWeight: 760 }}>
        {zh}
      </div>
        <div style={{ color: c.muted, fontSize: 13, lineHeight: '19px', fontWeight: 560 }}>
        {en}
      </div>
      </div>
    </div>
  );
}

function Cat({ asset = 'assets/pet-images/cat15-peering.png', width, at }: { asset?: string; width: number; at: Vec }) {
  const frame = useCurrentFrame();
  const y = Math.sin(frame / 34) * 7;
  return (
    <Img
      src={staticFile(asset)}
      style={{
        position: 'absolute',
        left: at.x,
        top: at.y + y,
        width,
        objectFit: 'contain',
        filter: 'drop-shadow(0 42px 38px rgba(0,0,0,0.42))',
      }}
    />
  );
}

function ButtonPill({
  icon,
  label,
  sub,
  color,
  style,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  color: string;
  style?: React.CSSProperties;
  active?: boolean;
}) {
  return (
    <Glass
      strong={active}
      style={{
        height: 66,
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderRadius: 18,
        ...style,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', color, background: 'rgba(255,255,255,0.08)' }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: c.text, fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</div>
        {sub ? <div style={{ color: c.muted, fontSize: 13, fontWeight: 520, marginTop: 2, whiteSpace: 'nowrap' }}>{sub}</div> : null}
      </div>
    </Glass>
  );
}

function HeroScene() {
  const frame = useCurrentFrame();
  const scene = scenes.hero;
  const l = local(frame, scene);
  const logo = spring({ frame: l - 12, fps, config: { damping: 18, stiffness: 90 } });
  const cat = spring({ frame: l - 28, fps, config: { damping: 18, stiffness: 80 } });
  return (
    <SceneLayer scene={scene}>
      <div style={{ position: 'absolute', left: 118, top: 94, color: c.faint, fontSize: 15, fontWeight: 760, letterSpacing: 1.8 }}>
        DESKTOP COMPANION
      </div>
      <div
        style={{
          position: 'absolute',
          left: 118,
          top: 226,
          color: c.text,
          fontSize: 142,
          lineHeight: '136px',
          fontWeight: 820,
          letterSpacing: -5,
          transform: `scale(${0.94 + logo * 0.06})`,
          transformOrigin: 'left center',
        }}
      >
        cat15
      </div>
      <div style={{ position: 'absolute', left: 126, top: 382, color: c.text, fontSize: 36, fontWeight: 680, letterSpacing: 1.4 }}>
        猫十五
      </div>
      <div style={{ position: 'absolute', left: 126, top: 454, color: c.muted, fontSize: 22, fontWeight: 540 }}>
        quiet AI for the desktop
      </div>
      <div
        style={{
          position: 'absolute',
          left: 126,
          top: 632,
          display: 'flex',
          gap: 14,
          opacity: enter(l, 78),
        }}
      >
        <ButtonPill icon={<MessageSquareText size={21} />} label="Chat" sub="对话" color={c.blue} />
        <ButtonPill icon={<CalendarDays size={21} />} label="Timeline" sub="时间线" color={c.green} />
        <ButtonPill icon={<Palette size={21} />} label="Orb / Pet" sub="形象" color={c.pink} />
      </div>
      <div style={{ transform: `translateX(${(1 - cat) * 50}px) scale(${0.92 + cat * 0.08})`, transformOrigin: 'right center' }}>
        <Cat width={590} at={{ x: 1114, y: 166 }} />
      </div>
      <LiquidHalo x={1160} y={150} w={585} h={674} opacity={0.66} />
    </SceneLayer>
  );
}

function LiquidHalo({ x, y, w, h, opacity }: { x: number; y: number; w: number; h: number; opacity: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 44,
        background: 'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.14), transparent 36%), radial-gradient(circle at 50% 82%, rgba(255,255,255,0.07), transparent 34%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
        opacity,
        zIndex: -1,
      }}
    />
  );
}

function SettingsScene() {
  const frame = useCurrentFrame();
  const scene = scenes.settings;
  const l = local(frame, scene);
  return (
    <SceneLayer scene={scene}>
      <SceneBadge index="01" zh="设置成为界面" en="Settings as the product surface" />
      <CaptureStack
        l={l}
        shots={[
          ['settings-appearance.png', 20, 150],
          ['settings-blocked.png', 138, 150],
          ['settings-chatmodel.png', 256, 150],
        ]}
      />
      <Cat asset="assets/pet-images/cat15-back.png" width={270} at={{ x: 1478, y: 665 }} />
    </SceneLayer>
  );
}

function CaptureShot({
  src,
  opacity = 1,
  left = 170,
  top = 150,
  width = 1180,
  height = 770,
  scale = 1,
}: {
  src: string;
  opacity?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scale?: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        borderRadius: 26,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',
        boxShadow: '0 34px 120px rgba(0,0,0,0.58), 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      <Img
        src={staticFile(`remotion-captures/${src}`)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(120deg, rgba(255,255,255,0.16), transparent 28%, transparent 72%, rgba(255,255,255,0.08))',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function CaptureStack({ l, shots }: { l: number; shots: Array<[string, number, number]> }) {
  return (
    <>
      {shots.map(([src, start, hold], index) => {
        const opacity = interpolate(l, [start - 22, start, start + hold, start + hold + 24], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: ease,
        });
        const scale = interpolate(l, [start - 22, start + hold], [0.985, 1.01], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: ease,
        });
        return <CaptureShot key={`${src}-${index}`} src={src} opacity={opacity} scale={scale} />;
      })}
    </>
  );
}

function SettingsPanelMock({ l }: { l: number }) {
  const tabs = [
    [<Monitor size={22} />, '个人档案', 'Profile', c.blue],
    [<Palette size={22} />, '显示', 'Appearance', c.pink],
    [<Clock3 size={22} />, 'Timeline', 'Timeline', c.green],
    [<Gamepad2 size={22} />, '游戏识别', 'Games', c.amber],
    [<Music2 size={22} />, '音乐识别', 'Music', c.pink],
    [<Bot size={22} />, 'Chat 模型', 'Models', c.blue],
  ] as const;
  return (
    <Glass strong style={{ position: 'absolute', left: 118, top: 184, width: 1292, height: 720, display: 'grid', gridTemplateColumns: '318px 1fr' }}>
      <div style={{ padding: 28, borderRight: `1px solid ${c.line}` }}>
        <div style={{ color: c.faint, fontSize: 14, fontWeight: 780, letterSpacing: 1.4, margin: '4px 0 22px 10px' }}>CAT15</div>
        {tabs.map(([icon, zh, en, color], i) => {
          const a = enter(l, 20 + i * 8);
          return (
            <div
              key={zh}
              style={{
                opacity: a,
                transform: `translateX(${(1 - a) * -18}px)`,
                marginBottom: 10,
              }}
            >
              <ButtonPill icon={icon} label={zh} sub={en} color={color} active={i === 1} style={{ height: 64, borderRadius: 18 }} />
            </div>
          );
        })}
      </div>
      <div style={{ padding: 38 }}>
        <div style={{ color: c.text, fontSize: 28, fontWeight: 760, marginBottom: 26 }}>显示 / Appearance</div>
        <SegmentedControl l={l} />
        <SettingRow l={l} delay={80} label="形象模式" sub="Pet / Orb" value="Orb" />
        <SettingSlider l={l} delay={98} label="透明度" sub="Opacity" value="1.0" progress={1} />
        <SettingSlider l={l} delay={116} label="对话框宽度" sub="Chat width" value="330px" progress={0.46} />
        <SettingRow l={l} delay={134} label="始终置顶显示" sub="Always on top" value="On" check />
      </div>
    </Glass>
  );
}

function SegmentedControl({ l }: { l: number }) {
  const a = enter(l, 62);
  return (
    <div style={{ opacity: a, display: 'inline-flex', padding: 6, borderRadius: 18, background: 'rgba(255,255,255,0.08)', border: `1px solid ${c.line}`, marginBottom: 22 }}>
      {['Pet', 'Orb'].map((item, i) => (
        <div key={item} style={{ height: 42, minWidth: 92, borderRadius: 14, display: 'grid', placeItems: 'center', color: c.text, background: i === 1 ? 'rgba(255,255,255,0.15)' : 'transparent', fontSize: 17, fontWeight: 700 }}>
          {item}
        </div>
      ))}
    </div>
  );
}

function SettingRow({ l, delay, label, sub, value, check = false }: { l: number; delay: number; label: string; sub: string; value: string; check?: boolean }) {
  const a = enter(l, delay);
  return (
    <div style={{ opacity: a, transform: `translateY(${(1 - a) * 14}px)`, height: 76, borderRadius: 20, background: 'rgba(255,255,255,0.068)', border: `1px solid ${c.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', marginBottom: 12 }}>
      <div>
        <div style={{ color: c.text, fontSize: 20, fontWeight: 720 }}>{label}</div>
        <div style={{ color: c.muted, fontSize: 14, fontWeight: 520, marginTop: 3 }}>{sub}</div>
      </div>
      <div style={{ color: check ? c.green : c.text, fontSize: 19, fontWeight: 720, display: 'flex', alignItems: 'center', gap: 10 }}>
        {value}
        {check ? <Check size={20} /> : <ChevronRight size={20} color={c.faint} />}
      </div>
    </div>
  );
}

function SettingSlider({ l, delay, label, sub, value, progress }: { l: number; delay: number; label: string; sub: string; value: string; progress: number }) {
  const a = enter(l, delay);
  return (
    <div style={{ opacity: a, transform: `translateY(${(1 - a) * 14}px)`, height: 76, borderRadius: 20, background: 'rgba(255,255,255,0.068)', border: `1px solid ${c.line}`, display: 'grid', gridTemplateColumns: '1fr 350px 70px', alignItems: 'center', gap: 20, padding: '0 24px', marginBottom: 12 }}>
      <div>
        <div style={{ color: c.text, fontSize: 20, fontWeight: 720 }}>{label}</div>
        <div style={{ color: c.muted, fontSize: 14, fontWeight: 520, marginTop: 3 }}>{sub}</div>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.12)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, right: `${(1 - progress) * 100}%`, borderRadius: 99, background: 'linear-gradient(90deg, rgba(255,255,255,0.94), rgba(122,176,226,0.84))' }} />
        <div style={{ position: 'absolute', left: `${progress * 100}%`, top: '50%', width: 22, height: 22, borderRadius: 99, background: '#fff', transform: 'translate(-50%, -50%)', boxShadow: '0 7px 18px rgba(0,0,0,0.25)' }} />
      </div>
      <div style={{ color: c.muted, fontSize: 18, fontWeight: 680, textAlign: 'right' }}>{value}</div>
    </div>
  );
}

function TimelineScene() {
  const frame = useCurrentFrame();
  const scene = scenes.timeline;
  const l = local(frame, scene);
  return (
    <SceneLayer scene={scene}>
      <SceneBadge index="02" zh="一天，压成一条线" en="A day, compressed into one line" />
      <CaptureShot src="settings-profile.png" left={210} top={142} width={1180} height={770} scale={interpolate(l, [0, 260], [1.02, 1.08], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })} />
      <div style={{ position: 'absolute', left: 1320, top: 222, display: 'grid', gap: 14, opacity: enter(l, 90) }}>
        <ButtonPill icon={<Terminal size={21} />} label="Coding" sub="色块统计" color={c.blue} />
        <ButtonPill icon={<Music2 size={21} />} label="Music" sub="后台播放" color={c.pink} />
        <ButtonPill icon={<BrainCircuit size={21} />} label="Short visits" sub="短暂切换" color={c.green} />
      </div>
    </SceneLayer>
  );
}

function TimelineRail({ l }: { l: number }) {
  const blocks = [
    { x: 0.02, w: 0.24, color: c.blue },
    { x: 0.30, w: 0.13, color: c.warm },
    { x: 0.48, w: 0.20, color: c.green },
    { x: 0.74, w: 0.18, color: c.pink },
  ];
  return (
    <div style={{ height: 230, borderRadius: 24, background: 'rgba(0,0,0,0.26)', border: `1px solid ${c.line}`, position: 'relative', overflow: 'hidden' }}>
      {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((hour) => (
        <div key={hour} style={{ position: 'absolute', left: `${(hour / 24) * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.075)' }}>
          <span style={{ position: 'absolute', top: 16, left: 10, color: c.faint, fontSize: 15, fontWeight: 650 }}>{String(hour).padStart(2, '0')}</span>
        </div>
      ))}
      {blocks.map((block, i) => {
        const a = enter(l, 46 + i * 22, 52);
        return (
          <div key={i} style={{ position: 'absolute', left: `${block.x * 100}%`, top: 92, width: `${block.w * 100 * a}%`, height: 64, borderRadius: 20, background: block.color, boxShadow: `0 0 38px ${block.color}38` }} />
        );
      })}
    </div>
  );
}

function MiniMetric({ l, delay, icon, label, value, color }: { l: number; delay: number; icon: React.ReactNode; label: string; value: string; color: string }) {
  const a = enter(l, delay);
  return (
    <div style={{ opacity: a, height: 80, borderRadius: 20, background: 'rgba(255,255,255,0.064)', border: `1px solid ${c.line}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14 }}>
      <div style={{ color }}>{icon}</div>
      <div>
        <div style={{ color: c.text, fontSize: 19, fontWeight: 730 }}>{label}</div>
        <div style={{ color: c.muted, fontSize: 15, fontWeight: 560, marginTop: 3 }}>{value}</div>
      </div>
    </div>
  );
}

function ChatScene() {
  const frame = useCurrentFrame();
  const scene = scenes.chat;
  const l = local(frame, scene);
  return (
    <SceneLayer scene={scene}>
      <SceneBadge index="03" zh="入口，不必打扰" en="Appears only when needed" />
      <CaptureShot src="chat.png" left={460} top={150} width={860} height={730} scale={interpolate(l, [0, 260], [0.98, 1.04], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })} />
      <Cat asset="assets/pet-images/thinking/thinking.png" width={330} at={{ x: 210, y: 440 }} />
    </SceneLayer>
  );
}

function FloatingInput({ l }: { l: number }) {
  const a = enter(l, 52);
  return (
    <Glass strong style={{ position: 'absolute', left: 440, top: 442, width: 520, height: 78, display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', opacity: a, transform: `translateY(${(1 - a) * 14}px)` }}>
      <ImageIcon size={24} color={c.faint} />
      <Mic size={24} color={c.faint} />
      <div style={{ flex: 1, color: c.muted, fontSize: 18, fontWeight: 550 }}>Ask cat15...</div>
      <Sparkles size={25} color={c.blue} />
    </Glass>
  );
}

function ChatThread({ l }: { l: number }) {
  const rows = [
    ['user', '这张截图有什么问题？'],
    ['ai', '按钮层级太重。建议减少边框，使用空间和高度差。'],
    ['ai', 'Reduce borders. Let spacing and elevation carry hierarchy.'],
  ];
  return (
    <>
      <div style={{ color: c.text, fontSize: 24, fontWeight: 760, marginBottom: 28 }}>AI Chat</div>
      {rows.map(([role, text], i) => {
        const a = enter(l, 82 + i * 28);
        const mine = role === 'user';
        return (
          <div key={text} style={{ opacity: a, display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 18, transform: `translateY(${(1 - a) * 18}px)` }}>
            <div style={{ maxWidth: mine ? 430 : 550, padding: '17px 20px', borderRadius: 20, color: mine ? '#071019' : c.text, background: mine ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.08)', border: `1px solid ${mine ? 'rgba(255,255,255,0.5)' : c.line}`, fontSize: 20, lineHeight: '31px', fontWeight: 570 }}>
              {text}
            </div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 30, right: 30, bottom: 30, display: 'flex', gap: 12 }}>
        <ButtonPill icon={<Camera size={21} />} label="Screenshot" sub="截图" color={c.green} style={{ flex: 1 }} />
        <ButtonPill icon={<Code2 size={21} />} label="Coding" sub="连接 Codex / Claude" color={c.blue} style={{ flex: 1 }} />
      </div>
    </>
  );
}

function FocusScene() {
  const frame = useCurrentFrame();
  const scene = scenes.focus;
  const l = local(frame, scene);
  return (
    <SceneLayer scene={scene}>
      <SceneBadge index="04" zh="专注时，降低存在感" en="Quiet by design" />
      <CaptureShot src="settings-blocked.png" left={170} top={150} width={1180} height={770} scale={interpolate(l, [0, 260], [1.02, 1.06], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })} />
      <Glass strong style={{ position: 'absolute', right: 142, top: 326, width: 312, height: 156, padding: 22, opacity: enter(l, 86) }}>
        <div style={{ color: c.muted, fontSize: 14, fontWeight: 680 }}>Focus</div>
        <div style={{ color: c.text, fontSize: 42, fontWeight: 780, marginTop: 10 }}>60:00</div>
      </Glass>
      <Cat asset="assets/pet-images/sleeping/sleeping1.png" width={330} at={{ x: 1330, y: 655 }} />
    </SceneLayer>
  );
}

function BlockedList({ l }: { l: number }) {
  const items = [
    ['bilibili', c.pink],
    ['zhihu', c.orange],
    ['WeChat', c.blue],
    ['Steam', c.amber],
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
      {items.map(([name, color], i) => {
        const a = enter(l, 70 + i * 14);
        return (
          <div key={name} style={{ opacity: a, transform: `scale(${0.94 + a * 0.06})`, padding: '13px 17px', borderRadius: 17, background: 'rgba(255,255,255,0.074)', border: `1px solid ${c.line}`, color, fontSize: 19, fontWeight: 760 }}>
            {name}
          </div>
        );
      })}
    </div>
  );
}

function FocusBars({ l }: { l: number }) {
  const heights = [42, 74, 36, 116, 88, 54, 132, 84, 58, 144, 96, 68, 110, 152];
  return (
    <div style={{ height: 278, display: 'flex', alignItems: 'end', gap: 14 }}>
      {heights.map((height, i) => {
        const a = enter(l, 62 + i * 5, 38);
        return <div key={i} style={{ flex: 1, height: height * a, borderRadius: 99, background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(122,176,226,0.80))', boxShadow: '0 0 28px rgba(91,184,255,0.12)' }} />;
      })}
    </div>
  );
}

function PrivacyScene() {
  const frame = useCurrentFrame();
  const scene = scenes.privacy;
  const l = local(frame, scene);
  return (
    <SceneLayer scene={scene}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 148, textAlign: 'center' }}>
        <div style={{ color: c.text, fontSize: 52, lineHeight: '62px', fontWeight: 780, letterSpacing: -1.2 }}>本机优先</div>
        <div style={{ color: c.muted, fontSize: 18, fontWeight: 560, marginTop: 10 }}>Local first. Private by default.</div>
      </div>
      <CaptureShot src="settings-chatmodel.png" left={240} top={288} width={910} height={600} scale={1.0} />
      <div style={{ position: 'absolute', left: 1180, top: 390, width: 520, display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
        <PrivacyTile l={l} delay={50} icon={<KeyRound size={28} />} zh="Keychain" en="API keys stay local" color={c.green} />
        <PrivacyTile l={l} delay={76} icon={<ShieldCheck size={28} />} zh="No relay" en="Direct model calls" color={c.blue} />
      </div>
    </SceneLayer>
  );
}

function PrivacyTile({ l, delay, icon, zh, en, color }: { l: number; delay: number; icon: React.ReactNode; zh: string; en: string; color: string }) {
  const a = enter(l, delay);
  return (
    <Glass strong style={{ height: 214, padding: 28, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
      <div style={{ color, marginBottom: 34 }}>{icon}</div>
      <div style={{ color: c.text, fontSize: 26, fontWeight: 780 }}>{zh}</div>
      <div style={{ color: c.muted, fontSize: 18, fontWeight: 540, marginTop: 8 }}>{en}</div>
    </Glass>
  );
}

function FinaleScene() {
  const frame = useCurrentFrame();
  const scene = scenes.finale;
  const l = local(frame, scene);
  const cat = spring({ frame: l - 30, fps, config: { damping: 18, stiffness: 90 } });
  return (
    <SceneLayer scene={scene}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center' }}>
        <div style={{ color: c.text, fontSize: 96, fontWeight: 820, letterSpacing: -3 }}>cat15</div>
        <div style={{ color: c.text, fontSize: 38, fontWeight: 680, marginTop: 10 }}>猫十五</div>
        <div style={{ color: c.muted, fontSize: 22, fontWeight: 520, marginTop: 24 }}>quiet AI for the desktop / 安静地进入工作现场</div>
      </div>
      <div style={{ transform: `scale(${0.88 + cat * 0.12})`, transformOrigin: 'center center' }}>
        <Cat width={420} at={{ x: 750, y: 468 }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 126, display: 'flex', justifyContent: 'center', gap: 14, opacity: enter(l, 118) }}>
        <ButtonPill icon={<MessageSquareText size={21} />} label="Chat" color={c.blue} />
        <ButtonPill icon={<CalendarDays size={21} />} label="Timeline" color={c.green} />
        <ButtonPill icon={<ShieldCheck size={21} />} label="Local-first" color={c.pink} />
      </div>
    </SceneLayer>
  );
}

export const Cat15ProductVideo = () => {
  return (
    <AbsoluteFill style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}>
      <Backdrop />
      <HeroScene />
      <SettingsScene />
      <TimelineScene />
      <ChatScene />
      <FocusScene />
      <PrivacyScene />
      <FinaleScene />
    </AbsoluteFill>
  );
};
