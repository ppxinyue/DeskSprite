import { useEffect, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { usePetStore } from './petStore';
import { getImageSrc } from './animations';
import { invoke } from '@tauri-apps/api/core';

interface PetAvatarProps {
  opacity?: number;
  scale?: number;
}

export function PetAvatar({ opacity = 1, scale = 1 }: PetAvatarProps) {
  const { petState, setPetState, toggleDialog } = usePetStore();
  const imageSrc = getImageSrc(petState);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    // Simple idle <-> happy cycle
    const timer = setInterval(() => {
      const current = usePetStore.getState().petState;
      if (current === 'idle') setPetState('happy');
      else if (current === 'happy') setPetState('idle');
    }, 8000);
    return () => clearInterval(timer);
  }, []);

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
        try { await invoke('plugin:window|close'); } catch (e) { console.error(e); }
        break;
    }
  };

  // Display size: the actual image is ~2000x2500, we show at ~120x150
  const displayWidth = 120 * scale;
  const displayHeight = 150 * scale;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="cursor-pointer select-none"
          style={{ opacity }}
          onClick={toggleDialog}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <img
            src={imageSrc}
            alt="猫十五"
            draggable={false}
            className="drop-shadow-lg"
            style={{
              width: displayWidth,
              height: displayHeight,
              objectFit: 'contain',
              transition: 'transform 0.3s ease, filter 0.3s ease',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
              animation: petState === 'idle' ? 'petBounce 4s ease-in-out infinite' :
                         petState === 'happy' ? 'petJump 0.5s ease' :
                         petState === 'thinking' ? 'petWobble 1.5s ease-in-out infinite' :
                         petState === 'sleeping' ? 'petBreathe 6s ease-in-out infinite' :
                         undefined,
              filter: petState === 'dragging' ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' : undefined,
            }}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleContextMenuAction('chat')}>
          开始对话
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction('settings')}>
          设置
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction('hide')}>
          隐藏
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction('quit')}>
          退出
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
