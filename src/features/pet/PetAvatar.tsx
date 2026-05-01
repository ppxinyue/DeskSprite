import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { usePetStore } from './petStore';
import { getImageSrc, getAnimationConfig } from './animations';
import { startAttachEngine, stopAttachEngine, pauseAttach } from './attachEngine';
import { invoke } from '@tauri-apps/api/core';

interface PetAvatarProps {
  opacity?: number;
  scale?: number;
}

export function PetAvatar({ opacity = 1, scale = 1 }: PetAvatarProps) {
  const { petState, setPetState, toggleDialog } = usePetStore();
  const imageSrc = getImageSrc(petState);
  const { animate } = getAnimationConfig(petState);

  useEffect(() => {
    startAttachEngine();
    return () => stopAttachEngine();
  }, []);

  const handleDragStart = () => {
    pauseAttach();
    setPetState('dragging');
  };
  const handleDragEnd = () => setPetState('idle');

  const handleClick = () => {
    pauseAttach();
    toggleDialog();
  };

  const handleContextMenuAction = async (action: string) => {
    switch (action) {
      case 'chat':
        pauseAttach();
        toggleDialog();
        break;
      case 'settings':
        await invoke('show_settings_cmd');
        break;
      case 'hide':
        await invoke('hide_pet_window');
        break;
      case 'quit':
        await invoke('plugin:window|close');
        break;
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          className="cursor-grab active:cursor-grabbing select-none"
          style={{ opacity, transform: `scale(${scale})` }}
          drag
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onHoverStart={() => pauseAttach()}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={`${petState}-${imageSrc}`}
              src={imageSrc}
              alt="DeskSprite Pet"
              className="w-24 h-24 pointer-events-none drop-shadow-lg"
              animate={animate}
              initial={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>
        </motion.div>
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
