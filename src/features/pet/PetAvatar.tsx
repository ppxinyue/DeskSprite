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
    // Simple idle animation toggle
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="cursor-pointer select-none"
          style={{
            opacity,
            transform: `scale(${scale})`,
            transformOrigin: 'center',
          }}
          onClick={toggleDialog}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <img
            src={imageSrc}
            alt="DeskSprite Pet"
            className="w-24 h-24 drop-shadow-lg"
            style={{
              transition: 'transform 0.3s ease',
              transform: hovered ? 'scale(1.1)' : 'scale(1)',
              animation: 'petBounce 4s ease-in-out infinite',
            }}
            onError={(e) => {
              // Fallback: render a colored circle if image fails
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Fallback visible if image fails */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, #F5A623, #E8951D)', display: 'none' }}
          >
            🐱
          </div>
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
