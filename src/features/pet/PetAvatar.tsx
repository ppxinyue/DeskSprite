import { useState, useEffect, useRef } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';
import { usePetStore } from './petStore';
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
  const { petState, mediaConfig } = usePetStore();
  const config = mediaConfig[petState];
  const frameSources = getPetFrameSources(config);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const dragging = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const startWindowPosition = useRef<{ x: number; y: number } | null>(null);
  const petRootRef = useRef<HTMLDivElement>(null);

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
    const close = () => setMenuOpen(false);
    window.addEventListener('mousedown', close);
    window.addEventListener('wheel', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('wheel', close);
      window.removeEventListener('blur', close);
    };
  }, [menuOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setMenuOpen(false);
    didDrag.current = false;
    dragging.current = false;
    startPoint.current = { x: e.clientX, y: e.clientY };

    getCurrentWindow().outerPosition().then((pos) => {
      startWindowPosition.current = { x: pos.x, y: pos.y };
    }).catch(() => {
      startWindowPosition.current = null;
    });

    const onMouseMove = (ev: MouseEvent) => {
      const start = startPoint.current;
      const startWindow = startWindowPosition.current;
      if (!start || !startWindow) return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!dragging.current && Math.hypot(dx, dy) > 4) {
        dragging.current = true;
        didDrag.current = true;
      }
      if (dragging.current) {
        getCurrentWindow().scaleFactor().then((factor) => {
          getCurrentWindow()
            .setPosition(new PhysicalPosition(startWindow.x + dx * factor, startWindow.y + dy * factor))
            .catch(() => {});
        }).catch(() => {});
      }
    };

    const onMouseUp = () => {
      startPoint.current = null;
      startWindowPosition.current = null;
      dragging.current = false;
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
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const w = Math.round(120 * scale);
  const h = Math.round(150 * scale);

  let src: string;
  let kind: 'img' | 'video' = 'img';
  if (config.userAnimatedPath) {
    src = isBuiltinAsset(config.userAnimatedPath) ? config.userAnimatedPath : convertFileSrc(config.userAnimatedPath);
    kind = config.userAnimatedType === 'video' ? 'video' : 'img';
  } else {
    src = toSrc(frameSources[currentFrame % frameSources.length] ?? frameSources[0]);
  }

  const interactiveProps = {
    onMouseDown: handleMouseDown,
    onClick: handleClick,
    onContextMenu: handleContextMenuOpen,
  };

  const menu = menuOpen && (
    <div
      className="fixed z-50 min-w-[86px] rounded-md border border-border/60 bg-popover/80 px-1 py-1 text-popover-foreground shadow-xl backdrop-blur-xl"
      style={{ left: menuPos.x, top: menuPos.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
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
      <div ref={petRootRef} className="cursor-pointer select-none" style={{ background: 'transparent', display: 'inline-block' }} {...interactiveProps}>
        {kind === 'video' ? (
          <video key={src} src={src} autoPlay loop muted playsInline draggable={false} width={w} height={h}
            className="drop-shadow-lg" style={{ objectFit: 'contain', opacity, display: 'block', background: 'transparent' }}
            onError={() => setImgError(true)} />
        ) : (
          <img key={src} src={src} alt="灵宠" draggable={false} width={w} height={h}
            className="drop-shadow-lg"
            style={{ objectFit: 'contain', opacity, display: 'block', background: 'transparent',
                     animation: 'petBounce 4s ease-in-out infinite' }}
            onError={() => setImgError(true)} />
        )}
      </div>
      {menu}
    </>
  );
}
