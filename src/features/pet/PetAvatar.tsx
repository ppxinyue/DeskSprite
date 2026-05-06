import { useState, useEffect, useRef } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { usePetStore } from './petStore';
import { isBuiltinAsset, needsFrameAnimation } from './animations';
import { resetIdleTimer, triggerYawn, triggerHappy, stopPetStateEngine } from './petStateEngine';

function toSrc(path: string): string {
  return isBuiltinAsset(path) ? path : `/${path}`;
}

export function PetAvatar({ opacity = 1, scale = 1 }: { opacity?: number; scale?: number }) {
  const { petState, setPetState, mediaConfig, toggleDialog, position } = usePetStore();
  const config = mediaConfig[petState];
  const [currentFrame, setCurrentFrame] = useState(0);
  const [imgError, setImgError] = useState(false);
  const isDragging = useRef(false);
  const dragOrigin = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  useEffect(() => { resetIdleTimer(); return () => stopPetStateEngine(); }, []);

  useEffect(() => { setCurrentFrame(0); setImgError(false); }, [petState]);

  useEffect(() => {
    if (!needsFrameAnimation(config)) return;
    const t = setInterval(() => setCurrentFrame((f) => (f + 1) % config.userFrames.length), config.frameInterval);
    return () => clearInterval(t);
  }, [config]);

  const enableHit = () => invoke('set_cursor_passthrough', { passthrough: false }).catch(() => {});
  const disableHit = () => invoke('set_cursor_passthrough', { passthrough: true }).catch(() => {});

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = false;
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: position.x, py: position.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragOrigin.current) return;
      const dx = ev.clientX - dragOrigin.current.mx;
      const dy = ev.clientY - dragOrigin.current.my;
      if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 4) {
        isDragging.current = true;
        setPetState('running');
      }
      if (isDragging.current) {
        usePetStore.getState().setPosition({ x: dragOrigin.current.px + dx, y: dragOrigin.current.py + dy });
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
      dragOrigin.current = null;
      setTimeout(disableHit, 100);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleClick = () => {
    if (isDragging.current) return;
    resetIdleTimer();
    const cur = usePetStore.getState().petState;
    if (cur === 'sleeping') {
      setPetState('idle');
    } else if (cur !== 'thinking') {
      if (Math.random() < 0.5) {
        const pick = (['happy', 'yawn', 'idle'] as const)[Math.floor(Math.random() * 3)];
        if (pick === 'happy') triggerHappy();
        else if (pick === 'yawn') triggerYawn();
        else setPetState('idle');
      }
    }
    toggleDialog();
  };

  const handleContextMenu = async (action: string) => {
    switch (action) {
      case 'chat': toggleDialog(); break;
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
  } else if (config.userFrames.length > 0) {
    src = toSrc(config.userFrames[currentFrame] ?? config.userFrames[0]);
  } else {
    src = config.defaultAsset;
  }

  const interactiveProps = {
    onMouseDown: handleMouseDown,
    onClick: handleClick,
    onMouseEnter: enableHit,
    onMouseLeave: () => { if (!isDragging.current) disableHit(); },
  };

  const menuItems = (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => handleContextMenu('chat')}>开始对话</ContextMenuItem>
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
        <div className="cursor-pointer select-none" style={{ background: 'transparent', display: 'inline-block' }} {...interactiveProps}>
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
