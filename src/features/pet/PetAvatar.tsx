import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { usePetStore } from './petStore';
import { getConversations } from '@/lib/db';
import {
  getNextFrameIndex,
  getPetFrameSources,
  getRandomFrameSwitchDelay,
  isBuiltinAsset,
} from './animations';
import { stopPetStateEngine } from './petStateEngine';
import type { PetMotionName, PetMotionSettings } from '@/features/settings/settingsStore';

function toSrc(path: string): string {
  return isBuiltinAsset(path) ? path : convertFileSrc(path);
}

const MOTION_NAMES: PetMotionName[] = ['petJump', 'petWobble', 'petBreathe'];
const MOTION_BASE_DURATION: Record<PetMotionName, number> = {
  petJump: 4,
  petWobble: 1.6,
  petBreathe: 3.6,
};
const PET_DRAW_PADDING = 2;
const SOURCE_EDGE_INSET_RATIO = 0.004;
const MENU_WIDTH = 112;
const MENU_HEIGHT = 172;
const SUBMENU_WIDTH = 170;
const MENU_MARGIN = 8;

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
  motions,
  dragging = false,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMenuOpenChange,
}: {
  opacity?: number;
  scale?: number;
  motions: PetMotionSettings;
  dragging?: boolean;
  onDragStart?: (point: { screenX: number; screenY: number }) => void;
  onDragMove?: (point: { screenX: number; screenY: number }) => void;
  onDragEnd?: () => void;
  onMenuOpenChange?: (open: boolean) => void;
}) {
  const { petState, mediaConfig, userFrames, openChat, dialogOpen, loadUserFrames } = usePetStore();
  const config = mediaConfig[petState];
  const frameSources = getPetFrameSources(config, userFrames[petState]);
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
  const w = Math.round(120 * scale);
  const h = Math.round(150 * scale);
  const animationsPaused = dragging;

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
    setCurrentFrame(0);
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
    window.addEventListener('mousedown', close);
    window.addEventListener('wheel', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('wheel', close);
      window.removeEventListener('blur', close);
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
        break;
      case 'history-chat':
        openChat('history');
        break;
      case 'settings':
        try { await invoke('show_settings_cmd'); } catch (e) { console.error(e); }
        break;
      case 'hide':
        try { await invoke('hide_pet_window'); } catch (e) { console.error(e); }
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
      const x = clamp(clientX, MENU_MARGIN, Math.max(MENU_MARGIN, windowWidth - MENU_WIDTH - MENU_MARGIN));
      const y = clamp(clientY, MENU_MARGIN, Math.max(MENU_MARGIN, windowHeight - MENU_HEIGHT - MENU_MARGIN));
      const canOpenRight = x + MENU_WIDTH + SUBMENU_WIDTH + MENU_MARGIN <= windowWidth;
      const canOpenLeft = x - SUBMENU_WIDTH - MENU_MARGIN >= 0;
      setSubmenuSide(canOpenRight || !canOpenLeft ? 'right' : 'left');
      setMenuPos({ x, y });
      setMenuOpen(true);
    }, 40);
    getConversations()
      .then((convos) => setRecentConversations(convos.slice(0, 3).map((c) => ({ id: c.id, title: c.title }))))
      .catch(() => setRecentConversations([]));
  };

  let src: string;
  let kind: 'img' | 'video' = 'img';
  if (config.userAnimatedPath) {
    src = isBuiltinAsset(config.userAnimatedPath) ? config.userAnimatedPath : convertFileSrc(config.userAnimatedPath);
    kind = config.userAnimatedType === 'video' ? 'video' : 'img';
  } else {
    src = toSrc(frameSources[currentFrame % frameSources.length] ?? frameSources[0]);
  }

  useEffect(() => {
    setImgError(false);
  }, [src]);

  useEffect(() => {
    if (kind !== 'video') return;
    const video = videoRef.current;
    if (!video) return;
    if (animationsPaused) {
      video.pause();
      return;
    }
    video.play().catch(() => {});
  }, [animationsPaused, kind, src]);

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
    image.src = src;

    return () => {
      cancelled = true;
      clearCanvas();
    };
  }, [h, kind, opacity, src, w]);

  const interactiveProps = {
    onPointerDown: handlePointerDown,
    onClick: handleClick,
    onContextMenu: handleContextMenuOpen,
  };

  const menu = menuOpen && (
    <div
      className="fixed z-50 w-[112px] rounded-md border border-border/60 bg-popover/80 px-1 py-1 text-popover-foreground shadow-xl backdrop-blur-xl"
      style={{ left: menuPos.x, top: menuPos.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">对话</div>
      <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('new-chat')}>新对话</button>
      <div className="group relative">
        <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('history-chat')}>历史对话</button>
        <div
          className={`absolute top-0 hidden w-[170px] rounded-md border border-border/60 bg-popover/90 px-1 py-1 shadow-xl backdrop-blur-xl group-hover:block ${
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
              }}
            >
              {item.title || `对话 ${item.id}`}
            </button>
          ))}
        </div>
      </div>
      <div className="my-1 h-px bg-border/60" />
      <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('settings')}>设置</button>
      <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('hide')}>隐藏</button>
    </div>
  );

  if (imgError) {
    return (
      <>
        <div
          ref={petRootRef}
          className="cursor-pointer select-none flex items-center justify-center"
          style={{ width: w, height: h, fontSize: Math.round(80 * scale), opacity, background: 'transparent' }}
          {...interactiveProps}
        >🐱</div>
        {menu}
      </>
    );
  }

  const motionStyle = !animationsPaused && currentMotion && motions[currentMotion]
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
        }}
        {...interactiveProps}
      >
        {kind === 'video' ? (
          <video ref={videoRef} key={src} src={src} autoPlay={!animationsPaused} loop={!animationsPaused} muted playsInline draggable={false} width={w} height={h}
            style={{ width: w, height: h, objectFit: 'contain', opacity, display: 'block', pointerEvents: 'none', ...motionStyle }}
            onError={() => setImgError(true)} />
        ) : (
          <canvas
            key={src}
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
