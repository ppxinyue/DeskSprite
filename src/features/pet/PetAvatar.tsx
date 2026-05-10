import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { usePetStore } from './petStore';
import { getConversations } from '@/lib/db';
import {
  getNextFrameIndex,
  getPetFrameSources,
  getRandomFrameSwitchDelay,
  getBuiltinAssetUrl,
  isGifAsset,
  isBuiltinAsset,
} from './animations';
import { stopPetStateEngine } from './petStateEngine';
import type { AvatarRenderMode, CodingProvider, CodingSessionMode, PetMotionName, PetMotionSettings } from '@/features/settings/settingsStore';
import type { PetState } from './animations';

function toSrc(path: string): string {
  return isBuiltinAsset(path) ? getBuiltinAssetUrl(path) : convertFileSrc(path);
}

function isCodingConversationTitle(title: string | null | undefined) {
  return /^(Codex|Claude Code)(?::|\s+Coding\b|\b)/i.test((title || '').trim());
}

const MOTION_NAMES: PetMotionName[] = ['petJump', 'petWobble', 'petBreathe'];
const MOTION_BASE_DURATION: Record<PetMotionName, number> = {
  petJump: 4,
  petWobble: 1.6,
  petBreathe: 3.6,
};
const PET_DRAW_PADDING = 2;
const SOURCE_EDGE_INSET_RATIO = 0.004;
const MENU_WIDTH = 136;
const MENU_HEIGHT = 312;
const SUBMENU_WIDTH = 190;
const MENU_MARGIN = 8;
const MENU_LEFT_SIDE_THRESHOLD = 0.62;

function pickNextMotion(motions: PetMotionSettings, current: PetMotionName | null): PetMotionName | null {
  const enabled = MOTION_NAMES.filter((name) => motions[name]?.enabled);
  if (enabled.length === 0) return null;
  if (enabled.length === 1) return enabled[0];
  let next = enabled[Math.floor(Math.random() * enabled.length)];
  if (next === current) next = enabled[(enabled.indexOf(next) + 1) % enabled.length];
  return next;
}

export function PetAvatar({
  opacity = 1,
  scale = 1,
  renderMode = 'pet',
  motions,
  dragging = false,
  restPresentationActive = false,
  focusActive = false,
  focusProgress = 0,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMenuOpenChange,
  onFocusToggle,
  codingModeEnabled = false,
  codingProvider = 'codex',
  codingCodexEnabled = true,
  codingClaudeEnabled = true,
  onCodingModeToggle,
}: {
  opacity?: number;
  scale?: number;
  renderMode?: AvatarRenderMode;
  motions: PetMotionSettings;
  dragging?: boolean;
  restPresentationActive?: boolean;
  focusActive?: boolean;
  focusProgress?: number;
  onDragStart?: (point: { screenX: number; screenY: number }) => void;
  onDragMove?: (point: { screenX: number; screenY: number }) => void;
  onDragEnd?: () => void;
  onMenuOpenChange?: (open: boolean) => void;
  onFocusToggle?: () => void;
  codingModeEnabled?: boolean;
  codingProvider?: CodingProvider;
  codingCodexEnabled?: boolean;
  codingClaudeEnabled?: boolean;
  onCodingModeToggle?: (mode?: CodingSessionMode, provider?: CodingProvider) => void;
}) {
  const { petState, mediaConfig, userFrames, userGifs, openChat, dialogOpen, loadUserFrames } = usePetStore();
  const config = mediaConfig[petState];
  const frameSources = getPetFrameSources(config, userFrames[petState], userGifs[petState]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [submenuSide, setSubmenuSide] = useState<'left' | 'right'>('right');
  const [recentConversations, setRecentConversations] = useState<Array<{ id: number; title: string | null }>>([]);
  const [currentMotion, setCurrentMotion] = useState<PetMotionName | null>(() => pickNextMotion(motions, null));
  const didDrag = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const petRootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const orbMode = renderMode === 'orb';
  const w = Math.round((orbMode ? 150 : 120) * scale);
  const h = Math.round(150 * scale);
  const animationsPaused = dragging;
  const submenuBridgeClass = `pointer-events-auto absolute top-0 z-10 h-40 w-6 ${
    submenuSide === 'left' ? 'right-full -mr-1' : 'left-full -ml-1'
  }`;
  const submenuBridgeStyle: CSSProperties = {
    clipPath: submenuSide === 'left'
      ? 'polygon(100% 0, 0 16%, 0 84%, 100% 100%)'
      : 'polygon(0 0, 100% 16%, 100% 84%, 0 100%)',
  };

  useEffect(() => {
    loadUserFrames();
    return () => stopPetStateEngine();
  }, [loadUserFrames]);

  useEffect(() => {
    if (dialogOpen || config.userAnimatedPath || frameSources.length <= 1) return;
    const t = setTimeout(() => {
      switchFrameAndMotion();
    }, getRandomFrameSwitchDelay());
    return () => clearTimeout(t);
  }, [config.userAnimatedPath, dialogOpen, frameSources.length, currentFrame, currentMotion, motions]);

  useEffect(() => {
    setCurrentFrame(frameSources.length > 1 ? Math.floor(Math.random() * frameSources.length) : 0);
    setCurrentMotion((motion) => pickNextMotion(motions, motion));
  }, [petState, config.userAnimatedPath, frameSources.length, motions]);

  useEffect(() => {
    setCurrentMotion((motion) => {
      if (motion && motions[motion]?.enabled) return motion;
      return pickNextMotion(motions, motion);
    });
  }, [motions]);

  const switchFrameAndMotion = () => {
    setCurrentFrame((f) => getNextFrameIndex(f, frameSources.length));
    if (animationsPaused) return;
    setCurrentMotion((motion) => pickNextMotion(motions, motion));
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => {
      setMenuOpen(false);
      onMenuOpenChange?.(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('wheel', close, true);
    window.addEventListener('blur', close);
    window.addEventListener('keydown', closeOnEscape, true);
    return () => {
      window.removeEventListener('wheel', close, true);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [menuOpen, onMenuOpenChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setMenuOpen(false);
    onMenuOpenChange?.(false);
    didDrag.current = false;
    startPoint.current = { x: e.screenX, y: e.screenY };
    e.currentTarget.setPointerCapture(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      const start = startPoint.current;
      if (dragging || didDrag.current) {
        onDragMove?.({ screenX: ev.screenX, screenY: ev.screenY });
        return;
      }
      if (!start) return;
      const dx = ev.screenX - start.x;
      const dy = ev.screenY - start.y;
      if (Math.hypot(dx, dy) > 4) {
        didDrag.current = true;
        startPoint.current = null;
        onDragStart?.({ screenX: ev.screenX, screenY: ev.screenY });
      }
    };

    const onPointerUp = () => {
      startPoint.current = null;
      if (didDrag.current) onDragEnd?.();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleClick = () => {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    switchFrameAndMotion();
  };

  const handleContextMenu = async (action: string) => {
    setMenuOpen(false);
    onMenuOpenChange?.(false);
    switch (action) {
      case 'new-chat':
        openChat('new');
        emit('pet:force-open-chat', { mode: 'new', conversationId: null }).catch(() => {});
        break;
      case 'history-chat':
        openChat('history');
        emit('pet:force-open-chat', { mode: 'history', conversationId: null }).catch(() => {});
        break;
      case 'settings':
        try { await invoke('show_settings_cmd'); } catch (e) { console.error(e); }
        break;
      case 'focus':
        if (onFocusToggle) onFocusToggle();
        else emit('pet:start-focus', {}).catch(() => {});
        break;
      case 'coding':
        onCodingModeToggle?.();
        break;
      case 'coding-new':
        onCodingModeToggle?.('new', 'codex');
        break;
      case 'coding-inherit':
        onCodingModeToggle?.('inherit', 'codex');
        break;
      case 'coding-claude-inherit':
        onCodingModeToggle?.('inherit', 'claude');
        break;
      case 'coding-claude-new':
        onCodingModeToggle?.('new', 'claude');
        break;
      case 'hide':
        try { await invoke('hide_pet_window'); } catch (e) { console.error(e); }
        break;
      case 'quit':
        try { await invoke('quit_app'); } catch (e) { console.error(e); }
        break;
    }
  };

  const handleContextMenuOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    didDrag.current = true;
    onMenuOpenChange?.(true);
    const clientX = e.clientX;
    const clientY = e.clientY;
    window.setTimeout(() => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const petRect = petRootRef.current?.getBoundingClientRect();
      const shouldOpenLeft = petRect
        ? petRect.right + MENU_WIDTH + MENU_MARGIN > windowWidth || petRect.left > windowWidth * MENU_LEFT_SIDE_THRESHOLD
        : clientX + MENU_WIDTH + MENU_MARGIN > windowWidth || clientX > windowWidth * MENU_LEFT_SIDE_THRESHOLD;
      const rawX = petRect
        ? shouldOpenLeft
          ? petRect.left - MENU_WIDTH - MENU_MARGIN
          : petRect.right + MENU_MARGIN
        : shouldOpenLeft
          ? clientX - MENU_WIDTH - MENU_MARGIN
          : clientX;
      const rawY = petRect ? petRect.top + Math.min(24, petRect.height / 4) : clientY;
      const x = clamp(rawX, MENU_MARGIN, Math.max(MENU_MARGIN, windowWidth - MENU_WIDTH - MENU_MARGIN));
      const y = clamp(rawY, MENU_MARGIN, Math.max(MENU_MARGIN, windowHeight - MENU_HEIGHT - MENU_MARGIN));
      const canOpenRight = x + MENU_WIDTH + SUBMENU_WIDTH + MENU_MARGIN <= windowWidth;
      const canOpenLeft = x - SUBMENU_WIDTH - MENU_MARGIN >= 0;
      setSubmenuSide(canOpenRight || !canOpenLeft ? 'right' : 'left');
      setMenuPos({ x, y });
      setMenuOpen(true);
    }, 40);
    getConversations()
      .then((convos) => setRecentConversations(
        convos
          .filter((c) => !isCodingConversationTitle(c.title))
          .slice(0, 3)
          .map((c) => ({ id: c.id, title: c.title })),
      ))
      .catch(() => setRecentConversations([]));
  };

  let src: string;
  let localImagePath: string | null = null;
  let kind: 'img' | 'gif' | 'video' = 'img';
  if (config.userAnimatedPath) {
    localImagePath = isBuiltinAsset(config.userAnimatedPath) ? null : config.userAnimatedPath;
    src = isBuiltinAsset(config.userAnimatedPath) ? getBuiltinAssetUrl(config.userAnimatedPath) : convertFileSrc(config.userAnimatedPath);
    kind = config.userAnimatedType === 'video' ? 'video' : isGifAsset(config.userAnimatedPath) ? 'gif' : 'img';
  } else {
    const framePath = frameSources[currentFrame % frameSources.length] ?? frameSources[0];
    localImagePath = framePath && !isBuiltinAsset(framePath) ? framePath : null;
    src = toSrc(framePath);
    kind = isGifAsset(framePath) ? 'gif' : 'img';
  }
  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    let cancelled = false;
    if ((kind !== 'img' && kind !== 'gif') || !localImagePath) {
      setResolvedSrc(src);
      return;
    }
    invoke<string>('read_pet_image_data_url', { filePath: localImagePath })
      .then((dataUrl) => {
        if (!cancelled) setResolvedSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setResolvedSrc(src);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, localImagePath, src]);

  useEffect(() => {
    setImgError(false);
  }, [resolvedSrc]);

  useEffect(() => {
    if (kind !== 'video') return;
    const video = videoRef.current;
    if (!video) return;
    if (animationsPaused) {
      video.pause();
      return;
    }
    video.play().catch(() => {});
  }, [animationsPaused, kind, resolvedSrc]);

  useEffect(() => {
    if (kind !== 'img') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clearCanvas = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    };

    clearCanvas();
    let cancelled = false;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (cancelled) return;
      clearCanvas();
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.globalAlpha = opacity;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const sourceInset = Math.max(1, Math.round(Math.min(image.naturalWidth, image.naturalHeight) * SOURCE_EDGE_INSET_RATIO));
      const sourceWidth = Math.max(1, image.naturalWidth - sourceInset * 2);
      const sourceHeight = Math.max(1, image.naturalHeight - sourceInset * 2);
      const maxDrawWidth = Math.max(1, w - PET_DRAW_PADDING * 2);
      const maxDrawHeight = Math.max(1, h - PET_DRAW_PADDING * 2);
      const ratio = Math.min(maxDrawWidth / sourceWidth, maxDrawHeight / sourceHeight);
      const drawWidth = sourceWidth * ratio;
      const drawHeight = sourceHeight * ratio;

      ctx.drawImage(
        image,
        sourceInset,
        sourceInset,
        sourceWidth,
        sourceHeight,
        (w - drawWidth) / 2,
        (h - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      ctx.restore();
    };
    image.onerror = () => {
      if (!cancelled) setImgError(true);
    };
    image.src = resolvedSrc;

    return () => {
      cancelled = true;
      clearCanvas();
    };
  }, [h, kind, opacity, resolvedSrc, w]);

  const interactiveProps = {
    onPointerDown: handlePointerDown,
    onClick: handleClick,
    onContextMenu: handleContextMenuOpen,
  };

  const menu = menuOpen && (
    <>
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onPointerDown={(event) => {
          event.stopPropagation();
          setMenuOpen(false);
          onMenuOpenChange?.(false);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen(false);
          onMenuOpenChange?.(false);
        }}
      />
      <div
        className="fixed z-50 w-[136px] rounded-md border border-border/70 bg-[#fbfaf8] px-1 py-1 text-popover-foreground shadow-xl dark:bg-[#1c1b18]"
        style={{ left: menuPos.x, top: menuPos.y }}
        onPointerDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">对话</div>
        <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('new-chat')}>新对话</button>
        <div className="group/history relative">
          <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent">历史对话</button>
          <div className={submenuBridgeClass} style={submenuBridgeStyle} />
          <div
              className={`absolute top-0 hidden w-[190px] rounded-md border border-border/70 bg-[#fbfaf8] px-1 py-1 shadow-xl group-hover/history:block dark:bg-[#1c1b18] ${
              submenuSide === 'left' ? 'right-full mr-1' : 'left-full ml-1'
            }`}
        >
          {recentConversations.length === 0 ? (
            <div className="px-2 py-1 text-xs text-muted-foreground">暂无历史</div>
          ) : recentConversations.map((item) => (
            <button
              key={item.id}
              className="block w-full max-w-44 truncate rounded px-2 py-1 text-left text-xs hover:bg-accent"
              onClick={() => {
                setMenuOpen(false);
                onMenuOpenChange?.(false);
                openChat('history', item.id);
                emit('pet:force-open-chat', { mode: 'history', conversationId: item.id }).catch(() => {});
              }}
            >
              {item.title || `对话 ${item.id}`}
            </button>
          ))}
          </div>
        </div>
        <div className="my-1 h-px bg-border/60" />
        <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('focus')}>
          {focusActive ? '退出专注' : '专注模式'}
        </button>
        {codingModeEnabled ? (
          <button className="block w-full whitespace-nowrap rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('coding')}>
            退出 Coding 模式
          </button>
        ) : (codingCodexEnabled || codingClaudeEnabled) ? (
          <div className="group/coding relative">
            <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent">Coding 模式</button>
            <div className={submenuBridgeClass} style={{ ...submenuBridgeStyle, height: 190 }} />
            <div
              className={`absolute top-0 hidden w-[190px] rounded-md border border-border/70 bg-[#fbfaf8] px-1 py-1 shadow-xl group-hover/coding:block dark:bg-[#1c1b18] ${
                submenuSide === 'left' ? 'right-full mr-1' : 'left-full ml-1'
              }`}
            >
              {codingCodexEnabled && (
                <>
                  <div className="px-2 pb-0.5 pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Codex{codingProvider === 'codex' ? ' · 当前' : ''}
                  </div>
                  <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('coding-inherit')}>继承当前 session</button>
                  <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('coding-new')}>开启新 session</button>
                </>
              )}
              {codingCodexEnabled && codingClaudeEnabled && <div className="my-1 h-px bg-border/60" />}
              {codingClaudeEnabled && (
                <>
                  <div className="px-2 pb-0.5 pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Claude Code{codingProvider === 'claude' ? ' · 当前' : ''}
                  </div>
                  <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('coding-claude-inherit')}>继承当前 session</button>
                  <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('coding-claude-new')}>开启新 session</button>
                </>
              )}
            </div>
          </div>
        ) : null}
        <div className="my-1 h-px bg-border/60" />
        <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('settings')}>设置</button>
        <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('hide')}>隐藏</button>
        <button className="block w-full rounded px-2 py-1 text-left text-xs text-destructive hover:bg-destructive/10" onClick={() => handleContextMenu('quit')}>退出</button>
      </div>
    </>
  );

  if (orbMode) {
    return (
      <>
        <div
          ref={petRootRef}
          className="cursor-pointer select-none"
          style={{
            width: w,
            height: h,
            background: 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 0,
            transition: 'width 120ms linear, height 120ms linear',
          }}
          {...interactiveProps}
        >
          <OrbAvatar
            state={petState}
            opacity={opacity}
            size={Math.min(w, h)}
            dragging={dragging}
            restPresentationActive={restPresentationActive}
            focusProgress={focusProgress}
          />
        </div>
        {menu}
      </>
    );
  }

  if (imgError) {
    return (
      <>
        <div
          ref={petRootRef}
          className="cursor-pointer select-none flex items-center justify-center"
          style={{ width: w, height: h, fontSize: Math.round(80 * scale), opacity, background: 'transparent', transition: 'width 120ms linear, height 120ms linear, font-size 120ms linear' }}
          {...interactiveProps}
        >🐱</div>
        {menu}
      </>
    );
  }

  const motionStyle = kind === 'img' && !animationsPaused && currentMotion && motions[currentMotion]
    ? {
        animation: `${currentMotion} ${MOTION_BASE_DURATION[currentMotion] / motions[currentMotion].speed}s ease-in-out infinite`,
        '--pet-motion-amplitude': String(motions[currentMotion].amplitude),
        '--pet-motion-y': `${-motions[currentMotion].amplitude}px`,
        '--pet-motion-rotate': `${motions[currentMotion].amplitude}deg`,
        '--pet-motion-rotate-negative': `${-motions[currentMotion].amplitude}deg`,
        '--pet-motion-scale': String(1 + motions[currentMotion].amplitude / 100),
      } as CSSProperties & Record<string, string>
    : undefined;

  return (
    <>
      <div
        ref={petRootRef}
        className="cursor-pointer select-none"
        style={{
          width: w,
          height: h,
          background: 'transparent',
          display: 'inline-block',
          lineHeight: 0,
          transition: 'width 120ms linear, height 120ms linear',
        }}
        {...interactiveProps}
      >
        {kind === 'video' ? (
          <video ref={videoRef} key={resolvedSrc} src={resolvedSrc} autoPlay={!animationsPaused} loop={!animationsPaused} muted playsInline draggable={false} width={w} height={h}
            style={{ width: w, height: h, objectFit: 'contain', opacity, display: 'block', pointerEvents: 'none', ...motionStyle }}
            onError={() => setImgError(true)} />
        ) : kind === 'gif' ? (
          <img
            key={resolvedSrc}
            src={resolvedSrc}
            alt="灵宠"
            draggable={false}
            width={w}
            height={h}
            className="block"
            style={{
              width: w,
              height: h,
              objectFit: 'contain',
              opacity,
              pointerEvents: 'none',
              ...motionStyle,
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <canvas
            key={resolvedSrc}
            ref={canvasRef}
            aria-label="灵宠"
            className="block"
            style={{
              width: w,
              height: h,
              background: 'transparent',
              pointerEvents: 'none',
              ...motionStyle,
            }}
          />
        )}
      </div>
      {menu}
    </>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const ORB_STATE_META: Record<Extract<PetState, 'idle' | 'work' | 'rest'>, { label: string }> = {
  idle: { label: 'idle' },
  work: { label: 'work' },
  rest: { label: 'rest' },
};

function OrbAvatar({
  state,
  opacity,
  size,
  dragging,
  restPresentationActive,
  focusProgress,
}: {
  state: PetState;
  opacity: number;
  size: number;
  dragging: boolean;
  restPresentationActive: boolean;
  focusProgress: number;
}) {
  const orbState = state === 'work' || state === 'rest' ? state : 'idle';
  const meta = ORB_STATE_META[orbState];
  const [hovering, setHovering] = useState(false);
  const fontSize = Math.max(10, Math.round(size * 0.062));
  const letters = meta.label.toUpperCase().split('');
  const restLetters = Array.from({ length: 28 }, (_, index) => 'REST'[index % 4]);
  const fallEase = (value: number) => value * value * (3 - 2 * value);

  return (
    <div
      className={`orb-avatar orb-avatar--${orbState} ${hovering ? 'is-hovering' : ''} ${dragging ? 'is-dragging' : ''} ${restPresentationActive ? 'is-rest-presentation' : ''}`}
      style={{
        '--orb-size': `${size}px`,
        '--orb-opacity': String(opacity),
        '--orb-font-size': `${fontSize}px`,
      } as CSSProperties & Record<string, string>}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      <div className="orb-avatar__shell">
        {orbState === 'idle' && (
          <div className="orb-avatar__idle-ring" aria-label={meta.label}>
            {letters.map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="orb-avatar__idle-letter"
                style={{
                  '--letter-index': String(index),
                  '--letter-count': String(letters.length),
                } as CSSProperties & Record<string, string>}
              >
                {letter}
              </span>
            ))}
          </div>
        )}
        {orbState === 'work' && (
          <div className="orb-avatar__work-field" aria-label={meta.label}>
            {letters.map((letter, index) => {
              const startPoints = [
                { x: -0.30, y: -0.30, rotate: -150 },
                { x: 0.30, y: -0.30, rotate: 150 },
                { x: 0.30, y: 0.30, rotate: -210 },
                { x: -0.30, y: 0.30, rotate: 210 },
              ];
              const startPoint = startPoints[index] ?? startPoints[0];
              const localProgress = fallEase(clamp(focusProgress * letters.length - index, 0, 1));
              const remaining = 1 - localProgress;
              return (
                <span
                  key={`${letter}-${index}`}
                  className="orb-avatar__work-letter"
                  style={{
                    '--attract-progress': String(localProgress),
                    '--work-x': `${startPoint.x * size * remaining}px`,
                    '--work-y': `${startPoint.y * size * remaining}px`,
                    '--work-rotate': `${startPoint.rotate * remaining}deg`,
                    '--work-scale': String(0.92 + localProgress * 0.16),
                    '--stack-index': String(index),
                  } as CSSProperties & Record<string, string>}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        )}
        {orbState === 'rest' && (
          <div className="orb-avatar__rest-ring" aria-label={meta.label}>
            {restLetters.map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="orb-avatar__rest-letter"
                style={{
                  '--letter-index': String(index),
                  '--letter-count': String(restLetters.length),
                  '--grid-col': String((index % 7) - 3),
                  '--grid-row': String(Math.floor(index / 7) - 1.5),
                } as CSSProperties & Record<string, string>}
              >
                {letter}
              </span>
            ))}
          </div>
        )}
        <div className="orb-avatar__hover-text">{meta.label}</div>
      </div>
    </div>
  );
}
