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
  const { petState, toggleDialog } = usePetStore();
  const imageSrc = getImageSrc(petState);
  const [imgError, setImgError] = useState(false);

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

  // Display size scaled
  const w = Math.round(120 * scale);
  const h = Math.round(150 * scale);

  if (imgError) {
    // Fallback: emoji if image fails to load
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
            alt="猫十五"
            draggable={false}
            width={w}
            height={h}
            className="drop-shadow-lg"
            style={{
              objectFit: 'contain',
              animation: 'petBounce 4s ease-in-out infinite',
            }}
            onError={() => setImgError(true)}
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
