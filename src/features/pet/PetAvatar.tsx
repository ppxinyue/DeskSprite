import { useState, useEffect, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { usePetStore } from './petStore';
import { needsFrameAnimation, isBuiltinAsset } from './animations';
import { resetIdleTimer, triggerHappy, stopPetStateEngine } from './petStateEngine';

function toImgSrc(path: string): string {
  if (isBuiltinAsset(path)) return path;
  return convertFileSrc(path);
}

export function PetAvatar({ opacity = 1, scale = 1 }: { opacity?: number; scale?: number }) {
  const { petState, setPetState, mediaConfig, toggleDialog } = usePetStore();
  const config = mediaConfig[petState];
  const [currentFrame, setCurrentFrame] = useState(0);
  const [imgError, setImgError] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  useEffect(() => {
    resetIdleTimer();
    return () => stopPetStateEngine();
  }, []);

  useEffect(() => {
    setCurrentFrame(0);
    setImgError(false);
  }, [petState]);

  useEffect(() => {
    if (!needsFrameAnimation(config)) return;
    const timer = setInterval(() => {
      setCurrentFrame((f) => (f + 1) % config.frames.length);
    }, config.frameInterval);
    return () => clearInterval(timer);
  }, [config]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = false;
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      px: usePetStore.getState().position.x,
      py: usePetStore.getState().position.y,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 4) {
        isDragging.current = true;
        setPetState('running');
        resetIdleTimer();
      }
      if (isDragging.current) {
        usePetStore.getState().setPosition({
          x: dragStart.current.px + dx,
          y: dragStart.current.py + dy,
        });
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (isDragging.current) {
        setPetState('idle');
        resetIdleTimer();
      }
      isDragging.current = false;
      dragStart.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleClick = () => {
    if (isDragging.current) return;
    resetIdleTimer();

    const current = usePetStore.getState().petState;

    if (current === 'sleeping') {
      setPetState('idle');
    } else if (current === 'thinking') {
      toggleDialog();
      return;
    } else {
      if (Math.random() < 0.5) {
        const candidates: ('happy' | 'yawn' | 'idle')[] = ['happy', 'yawn', 'idle'];
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        if (next === 'happy') {
          triggerHappy();
        } else if (next === 'yawn') {
          import('./petStateEngine').then(({ triggerYawn }) => triggerYawn());
        } else {
          setPetState('idle');
        }
      }
    }
    toggleDialog();
  };

  const handleContextMenuAction = async (action: string) => {
    switch (action) {
      case 'chat':
        toggleDialog();
        break;
      case 'settings':
        try { await invoke('show_settings_cmd'); } catch (e) { console.error(e); }
        break;
      case 'hide':
        try { await invoke('hide_pet_window'); } catch (e) { console.error(e); }
        break;
      case 'quit':
        try { await exit(0); } catch (e) { console.error(e); }
        break;
    }
  };

  const w = Math.round(120 * scale);
  const h = Math.round(150 * scale);

  let mediaSrc: string | null = null;
  let mediaKind: 'img' | 'video' = 'img';

  if (config.animatedPath) {
    mediaSrc = toImgSrc(config.animatedPath);
    mediaKind = config.animatedType === 'video' ? 'video' : 'img';
  } else {
    mediaSrc = toImgSrc(config.frames[currentFrame] ?? config.frames[0]);
  }

  const inner = imgError ? (
    <div
      className="cursor-pointer select-none flex items-center justify-center"
      style={{ width: w, height: h, fontSize: Math.round(80 * scale), opacity }}
    >
      🐱
    </div>
  ) : mediaKind === 'video' ? (
    <video
      key={mediaSrc}
      src={mediaSrc!}
      autoPlay
      loop
      muted
      playsInline
      draggable={false}
      width={w}
      height={h}
      className="drop-shadow-lg"
      style={{ objectFit: 'contain', opacity }}
      onError={() => setImgError(true)}
    />
  ) : (
    <img
      key={mediaSrc}
      src={mediaSrc!}
      alt="灵宠"
      draggable={false}
      width={w}
      height={h}
      className="drop-shadow-lg"
      style={{ objectFit: 'contain', opacity, animation: 'petBounce 4s ease-in-out infinite' }}
      onError={() => setImgError(true)}
    />
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="cursor-pointer select-none"
          onMouseDown={handleMouseDown}
          onClick={handleClick}
        >
          {inner}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleContextMenuAction('chat')}>开始对话</ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction('settings')}>设置</ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction('hide')}>隐藏</ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction('quit')}>退出</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
