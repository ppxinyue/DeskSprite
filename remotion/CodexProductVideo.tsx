import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  Boxes,
  Check,
  CircleDot,
  Code2,
  FileCode2,
  GitBranch,
  Play,
  ScanLine,
  Sparkles,
  Terminal,
  Wand2,
} from 'lucide-react';

type Scene = { from: number; duration: number };

const fps = 30;
const scenes = {
  hero: { from: 0, duration: 132 },
  command: { from: 102, duration: 150 },
  build: { from: 222, duration: 150 },
  finale: { from: 342, duration: 108 },
};

const c = {
  ink: '#08090b',
  paper: '#f3efe5',
  line: 'rgba(255,255,255,0.13)',
  text: 'rgba(255,255,255,0.92)',
  muted: 'rgba(255,255,255,0.58)',
  faint: 'rgba(255,255,255,0.28)',
  mint: '#7ee6b1',
  blue: '#78c7ff',
  coral: '#ff977d',
  amber: '#ffd481',
  violet: '#b9a3ff',
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

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
    [scene.from, scene.from + 18, scene.from + scene.duration - 24, scene.from + scene.duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease },
  );
}

function Background() {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame % 240, [0, 240], [-20, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  const drift = Math.sin(frame / 58) * 18;

  return (
    <AbsoluteFill style={{ background: c.ink, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: -180,
          background:
            'radial-gradient(circle at 14% 24%, rgba(126,230,177,0.18), transparent 25%), radial-gradient(circle at 82% 18%, rgba(255,151,125,0.13), transparent 26%), radial-gradient(circle at 50% 86%, rgba(120,199,255,0.16), transparent 31%)',
          transform: `translate(${drift}px, ${-drift * 0.5}px)`,
          filter: 'blur(3px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.34,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          transform: `translateX(${sweep * -0.16}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${sweep}%`,
          top: -120,
          width: 260,
          height: 1320,
          transform: 'rotate(18deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
          filter: 'blur(22px)',
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
  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.16)',
        background: strong ? 'rgba(255,255,255,0.115)' : 'rgba(255,255,255,0.07)',
        boxShadow:
          '0 38px 110px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(28px) saturate(1.35)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CodexMark({ size = 92 }: { size?: number }) {
  const frame = useCurrentFrame();
  const spin = interpolate(frame, [0, 450], [0, 42]);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        display: 'grid',
        placeItems: 'center',
        color: c.paper,
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.20), rgba(255,255,255,0.05)), linear-gradient(145deg, rgba(126,230,177,0.38), rgba(120,199,255,0.20) 48%, rgba(255,151,125,0.28))',
        border: '1px solid rgba(255,255,255,0.24)',
        boxShadow: '0 26px 70px rgba(0,0,0,0.36)',
        transform: `rotate(${spin}deg)`,
      }}
    >
      <Sparkles size={size * 0.46} strokeWidth={1.8} />
    </div>
  );
}

function Label({ children, color = c.muted }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ color, fontSize: 18, fontWeight: 650, lineHeight: '26px' }}>
      {children}
    </div>
  );
}

function HeroScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.hero);
  const logo = spring({ frame, fps, config: { damping: 18, stiffness: 86 } });
  const title = enter(frame, 16, 34);
  const camera = interpolate(frame, [0, 118], [1.04, 0.98], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${camera})`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ transform: `scale(${0.72 + logo * 0.28})`, marginBottom: 34 }}>
        <CodexMark />
      </div>
      <div
        style={{
          fontSize: 116,
          lineHeight: '116px',
          fontWeight: 820,
          color: c.text,
          letterSpacing: 0,
          opacity: title,
          transform: `translateY(${(1 - title) * 24}px)`,
        }}
      >
        Codex
      </div>
      <div
        style={{
          marginTop: 22,
          width: 760,
          textAlign: 'center',
          color: c.muted,
          fontSize: 30,
          lineHeight: '40px',
          fontWeight: 560,
          opacity: enter(frame, 34, 30),
        }}
      >
        A calm coding agent for turning product intent into working software.
      </div>
      <div
        style={{
          marginTop: 54,
          display: 'flex',
          gap: 16,
          opacity: enter(frame, 60, 30),
        }}
      >
        {['read', 'edit', 'verify', 'ship'].map((item, index) => (
          <Glass
            key={item}
            style={{
              borderRadius: 999,
              padding: '13px 22px',
              color: index === 2 ? c.mint : c.paper,
              fontSize: 18,
              fontWeight: 720,
              textTransform: 'uppercase',
            }}
          >
            {item}
          </Glass>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function PromptCard() {
  const frame = useCurrentFrame();
  const cursor = Math.floor(frame / 15) % 2;
  const lines = [
    'Build the settings panel',
    'Match existing patterns',
    'Run the focused tests',
  ];

  return (
    <Glass
      strong
      style={{
        position: 'absolute',
        left: 122,
        top: 156,
        width: 630,
        height: 440,
        borderRadius: 28,
        padding: 34,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: c.mint }}>
        <Terminal size={28} />
        <Label color={c.text}>Ask Codex</Label>
      </div>
      <div style={{ marginTop: 32, display: 'grid', gap: 18 }}>
        {lines.map((line, index) => {
          const on = enter(frame, scenes.command.from + 20 + index * 14, 24);
          return (
            <div
              key={line}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                color: c.text,
                fontSize: 28,
                lineHeight: '36px',
                fontWeight: 650,
                opacity: on,
                transform: `translateX(${(1 - on) * -28}px)`,
              }}
            >
              <CircleDot size={18} color={index === 0 ? c.blue : index === 1 ? c.amber : c.mint} />
              {line}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 34,
          bottom: 34,
          right: 34,
          height: 58,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          color: c.muted,
          fontSize: 20,
          fontWeight: 560,
          background: 'rgba(0,0,0,0.28)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        product rendering video{cursor ? '_' : ''}
      </div>
    </Glass>
  );
}

function CodeWindow() {
  const frame = useCurrentFrame();
  const rows = [
    ['+', 'const frame = useCurrentFrame();', c.mint],
    ['+', 'const reveal = interpolate(frame, [0, 24], [0, 1]);', c.mint],
    [' ', 'return <ProductShot progress={reveal} />;', c.blue],
    ['+', 'await renderMedia({ composition, codec: "h264" });', c.mint],
  ];

  return (
    <Glass
      strong
      style={{
        position: 'absolute',
        right: 126,
        top: 112,
        width: 760,
        height: 600,
        borderRadius: 30,
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          color: c.text,
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        <FileCode2 size={22} color={c.blue} />
        CodexProductVideo.tsx
      </div>
      <div style={{ padding: 28, display: 'grid', gap: 18, fontFamily: 'Menlo, Monaco, monospace' }}>
        {rows.map(([sign, line, color], index) => {
          const on = enter(frame, scenes.command.from + 42 + index * 16, 22);
          return (
            <div
              key={line}
              style={{
                display: 'grid',
                gridTemplateColumns: '34px 1fr',
                alignItems: 'center',
                color,
                fontSize: 21,
                lineHeight: '28px',
                opacity: on,
                transform: `translateY(${(1 - on) * 18}px)`,
              }}
            >
              <span style={{ color: sign === '+' ? c.mint : c.faint }}>{sign}</span>
              <span>{line}</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 28,
          right: 28,
          bottom: 28,
          height: 120,
          borderRadius: 22,
          background: 'rgba(0,0,0,0.24)',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {[
          [GitBranch, 'branch', c.violet],
          [Code2, 'patch', c.blue],
          [Play, 'test', c.amber],
          [Check, 'ready', c.mint],
        ].map(([Icon, label, color], index) => {
          const on = enter(frame, scenes.command.from + 72 + index * 13, 20);
          const TypedIcon = Icon as typeof Code2;
          return (
            <div key={String(label)} style={{ textAlign: 'center', opacity: on }}>
              <TypedIcon size={32} color={String(color)} />
              <div style={{ color: c.muted, fontSize: 15, fontWeight: 700, marginTop: 10 }}>{String(label)}</div>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

function CommandScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.command);
  return (
    <AbsoluteFill style={{ opacity }}>
      <PromptCard />
      <CodeWindow />
    </AbsoluteFill>
  );
}

function PipelineScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.build);
  const progress = interpolate(frame, [scenes.build.from + 28, scenes.build.from + 118], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', padding: '0 118px' }}>
      <div style={{ color: c.text, fontSize: 66, lineHeight: '74px', fontWeight: 800, marginBottom: 54 }}>
        Product work, rendered as a flow.
      </div>
      <div
        style={{
          position: 'relative',
          height: 260,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 88,
            right: 88,
            top: 74,
            height: 5,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 88,
            top: 74,
            width: `${progress * 78}%`,
            height: 5,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${c.mint}, ${c.blue}, ${c.coral})`,
            boxShadow: '0 0 34px rgba(126,230,177,0.38)',
          }}
        />
        {[
          [ScanLine, 'Read the app', 'Find the real shape of the system.', c.blue],
          [Wand2, 'Make the change', 'Edit only what the story needs.', c.coral],
          [Boxes, 'Compose scenes', 'Layer UI, motion, and timing.', c.amber],
          [Check, 'Render proof', 'Export an artifact you can inspect.', c.mint],
        ].map(([Icon, title, copy, color], index) => {
          const on = enter(frame, scenes.build.from + 18 + index * 18, 26);
          const pulse = spring({ frame: frame - scenes.build.from - 28 - index * 18, fps, config: { damping: 15 } });
          const TypedIcon = Icon as typeof Code2;
          return (
            <Glass
              key={String(title)}
              strong={index <= Math.floor(progress * 4)}
              style={{
                borderRadius: 28,
                padding: 28,
                height: 238,
                opacity: on,
                transform: `translateY(${(1 - on) * 34}px) scale(${1 + pulse * 0.018})`,
              }}
            >
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 20,
                  display: 'grid',
                  placeItems: 'center',
                  color: String(color),
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.13)',
                }}
              >
                <TypedIcon size={34} />
              </div>
              <div style={{ marginTop: 28, color: c.text, fontSize: 28, lineHeight: '34px', fontWeight: 760 }}>
                {String(title)}
              </div>
              <div style={{ marginTop: 12, color: c.muted, fontSize: 18, lineHeight: '27px', fontWeight: 540 }}>
                {String(copy)}
              </div>
            </Glass>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function FinaleScene() {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scenes.finale);
  const lift = enter(frame, scenes.finale.from + 8, 34);

  return (
    <AbsoluteFill style={{ opacity, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: `translateY(${(1 - lift) * 30}px)`, display: 'grid', placeItems: 'center' }}>
        <CodexMark size={118} />
        <div
          style={{
            marginTop: 38,
            color: c.text,
            fontSize: 84,
            lineHeight: '92px',
            fontWeight: 820,
            letterSpacing: 0,
          }}
        >
          Codex turns intent into shipped code.
        </div>
        <div
          style={{
            marginTop: 24,
            color: c.muted,
            fontSize: 28,
            lineHeight: '38px',
            fontWeight: 560,
            width: 850,
            textAlign: 'center',
          }}
        >
          Read the room. Touch the right files. Verify the outcome.
        </div>
      </div>
    </AbsoluteFill>
  );
}

function FrameChrome() {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const progress = frame / (durationInFrames - 1);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: 38,
          top: 38,
          right: 38,
          bottom: 38,
          borderRadius: 42,
          border: '1px solid rgba(255,255,255,0.13)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 88,
          right: 88,
          bottom: 76,
          height: 3,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.12)',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${c.mint}, ${c.blue}, ${c.coral})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

export function CodexProductVideo() {
  return (
    <AbsoluteFill style={{ fontFamily: 'Inter, Avenir Next, Helvetica Neue, Arial, sans-serif' }}>
      <Background />
      <Sequence from={0}>
        <HeroScene />
      </Sequence>
      <Sequence from={0}>
        <CommandScene />
      </Sequence>
      <Sequence from={0}>
        <PipelineScene />
      </Sequence>
      <Sequence from={0}>
        <FinaleScene />
      </Sequence>
      <FrameChrome />
    </AbsoluteFill>
  );
}
