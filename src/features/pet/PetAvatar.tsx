import { useState, useEffect, useRef } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { usePetStore } from './petStore';
import { getConversations } from '@/lib/db';
import {
  getNextFrameIndex,
  getPetFrameSources,
  getRandomFrameSwitchDelay,
  isBuiltinAsset,
} from './animations';
import { stopPetStateEngine } from './petStateEngine';

function toSrc(path: string): string {
  return isBuiltinAsset(path) ? path : convertFileSrc(path);
}

export function PetAvatar({ opacity = 1, scale = 1 }: { opacity?: number; scale?: number }) {
  const { petState, mediaConfig, openChat, dialogOpen } = usePetStore();
  const config = mediaConfig[petState];
  const frameSources = getPetFrameSources(config);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [recentConversations, setRecentConversations] = useState<Array<{ id: number; title: string | null }>>([]);
  const didDrag = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const petRootRef = useRef<HTMLDivElement>(null);
  const w = Math.round(120 * scale);
  const h = Math.round(150 * scale);
  const collapsedSize = Math.max(220, Math.round(150 * scale) + 70);

  useEffect(() => () => stopPetStateEngine(), []);

  useEffect(() => {
    if (config.userAnimatedPath || frameSources.length <= 1) return;
    const t = setTimeout(() => {
      setCurrentFrame((f) => getNextFrameIndex(f, frameSources.length));
    }, getRandomFrameSwitchDelay());
    return () => clearTimeout(t);
  }, [config.userAnimatedPath, frameSources.length, currentFrame]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => {
      setMenuOpen(false);
      if (!dialogOpen) getCurrentWindow().setSize(new LogicalSize(collapsedSize, collapsedSize)).catch(() => {});
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('wheel', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('wheel', close);
      window.removeEventListener('blur', close);
    };
  }, [collapsedSize, dialogOpen, menuOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setMenuOpen(false);
    didDrag.current = false;
    startPoint.current = { x: e.clientX, y: e.clientY };

    const onMouseMove = (ev: MouseEvent) => {
      const start = startPoint.current;
      if (!start) return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (Math.hypot(dx, dy) > 4) {
        didDrag.current = true;
        startPoint.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        getCurrentWindow().startDragging().catch(() => {});
      }
    };

    const onMouseUp = () => {
      startPoint.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleClick = () => {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    setCurrentFrame((f) => getNextFrameIndex(f, frameSources.length));
  };

  const handleContextMenu = async (action: string) => {
    setMenuOpen(false);
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
      case 'quit':
        try { const { exit } = await import('@tauri-apps/plugin-process'); await exit(0); }
        catch { try { await invoke('exit_app'); } catch (e) { console.error(e); } }
        break;
    }
  };

  const handleContextMenuOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    didDrag.current = true;
    setMenuPos({ x: Math.min(e.clientX, 130), y: Math.min(e.clientY, 210) });
    setMenuOpen(true);
    getCurrentWindow().setSize(new LogicalSize(320, 420)).catch(() => {});
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

  const interactiveProps = {
    onMouseDown: handleMouseDown,
    onClick: handleClick,
    onContextMenu: handleContextMenuOpen,
  };

  const menu = menuOpen && (
    <div
      className="fixed z-50 min-w-[96px] rounded-md border border-border/60 bg-popover/80 px-1 py-1 text-popover-foreground shadow-xl backdrop-blur-xl"
      style={{ left: menuPos.x, top: menuPos.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">对话</div>
      <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('new-chat')}>新对话</button>
      <div className="group relative">
        <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('history-chat')}>历史对话</button>
        <div className="absolute left-full top-0 hidden min-w-[150px] rounded-md border border-border/60 bg-popover/90 px-1 py-1 shadow-xl backdrop-blur-xl group-hover:block">
          {recentConversations.length === 0 ? (
            <div className="px-2 py-1 text-xs text-muted-foreground">暂无历史</div>
          ) : recentConversations.map((item) => (
            <button
              key={item.id}
              className="block w-full max-w-44 truncate rounded px-2 py-1 text-left text-xs hover:bg-accent"
              onClick={() => {
                setMenuOpen(false);
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
      <button className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent" onClick={() => handleContextMenu('quit')}>退出</button>
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
          overflow: 'hidden',
          isolation: 'isolate',
          contain: 'layout paint size',
        }}
        {...interactiveProps}
      >
        {kind === 'video' ? (
          <video key={src} src={src} autoPlay loop muted playsInline draggable={false} width={w} height={h}
            className="drop-shadow-lg" style={{ width: w, height: h, objectFit: 'contain', opacity, display: 'block', background: 'transparent', backfaceVisibility: 'hidden' }}
            onError={() => setImgError(true)} />
        ) : (
          <img key={src} src={src} alt="灵宠" draggable={false} width={w} height={h}
            className="drop-shadow-lg"
            style={{ width: w, height: h, objectFit: 'contain', opacity, display: 'block', background: 'transparent',
                     backfaceVisibility: 'hidden', animation: 'petBounce 4s ease-in-out infinite' }}
            onError={() => setImgError(true)} />
        )}
      </div>
      {menu}
    </>
  );
}
