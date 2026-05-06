import { useState, useEffect, useRef } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
  const didDrag = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const petRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => stopPetStateEngine(), []);

  useEffect(() => {
    if (config.userAnimatedPath || frameSources.length <= 1) return;
    const t = setTimeout(() => {
      setCurrentFrame((f) => getNextFrameIndex(f, frameSources.length));
    }, getRandomFrameSwitchDelay());
    return () => clearTimeout(t);
  }, [config.userAnimatedPath, frameSources.length, currentFrame]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    didDrag.current = false;
    startPoint.current = { x: e.clientX, y: e.clientY };
    const onMouseUp = (ev: MouseEvent) => {
      const start = startPoint.current;
      if (start && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 4) {
        didDrag.current = true;
      }
      startPoint.current = null;
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mouseup', onMouseUp);
    getCurrentWindow().startDragging().catch(() => {});
  };

  const handleClick = () => {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    setCurrentFrame((f) => getNextFrameIndex(f, frameSources.length));
  };

  const handleContextMenu = async (action: string) => {
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
  };

  const menuItems = (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => handleContextMenu('settings')}>设置</ContextMenuItem>
      <ContextMenuItem onClick={() => handleContextMenu('hide')}>隐藏</ContextMenuItem>
      <ContextMenuItem onClick={() => handleContextMenu('quit')}>退出</ContextMenuItem>
    </ContextMenuContent>
  );

  if (imgError) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={petRootRef}
            className="cursor-pointer select-none flex items-center justify-center"
            style={{ width: w, height: h, fontSize: Math.round(80 * scale), opacity, background: 'transparent' }}
            {...interactiveProps}
          >🐱</div>
        </ContextMenuTrigger>
        {menuItems}
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
      </ContextMenuTrigger>
      {menuItems}
    </ContextMenu>
  );
}
