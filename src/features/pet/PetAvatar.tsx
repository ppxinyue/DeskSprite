import { useState } from 'react';
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
  const { petState, petImages, toggleDialog } = usePetStore();
  const imageSrc = getImageSrc(petState, petImages);
  const [imgError, setImgError] = useState(false);

  const handleContextMenuAction = async (action: string) => {
    try {
      switch (action) {
        case 'chat':
          toggleDialog();
          break;
        case 'settings':
          await invoke('show_settings_cmd');
          break;
        case 'hide':
          await invoke('hide_pet_window');
          break;
        case 'quit':
          await invoke('exit_app');
          break;
      }
    } catch (e) {
      console.error('Context menu action failed:', e);
    }
  };

  const w = Math.round(120 * scale);
  const h = Math.round(150 * scale);

  if (imgError) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="cursor-pointer select-none flex items-center justify-center"
            style={{ width: w, height: h, fontSize: Math.round(80 * scale), opacity }}
            onClick={toggleDialog}
          >
            🐱
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="cursor-pointer select-none"
          style={{ opacity }}
          onClick={toggleDialog}
        >
          <img
            src={imageSrc}
            alt="灵宠"
            draggable={false}
            width={w}
            height={h}
            className="drop-shadow-lg"
            style={{
              objectFit: 'contain',
              animation: petState === 'happy'
                ? 'petJump 0.5s ease'
                : petState === 'thinking'
                  ? 'petWobble 1.5s ease-in-out infinite'
                  : petState === 'sleeping'
                    ? 'petBreathe 6s ease-in-out infinite'
                    : petState === 'dragging'
                      ? undefined
                      : 'petBounce 4s ease-in-out infinite',
            }}
            onError={() => setImgError(true)}
            onLoad={() => setImgError(false)}
          />
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
