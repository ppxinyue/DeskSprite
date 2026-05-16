import type { MessageSendShortcut } from '@/features/settings/settingsStore';

type KeyboardLike = {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  isComposing?: boolean;
  keyCode?: number;
  nativeEvent?: {
    isComposing?: boolean;
    keyCode?: number;
  };
};

export function shouldSubmitMessage(event: KeyboardLike, shortcut: MessageSendShortcut) {
  if (
    event.isComposing ||
    event.nativeEvent?.isComposing ||
    event.keyCode === 229 ||
    event.nativeEvent?.keyCode === 229
  ) {
    return false;
  }
  if (event.key !== 'Enter' || event.shiftKey) return false;
  if (shortcut === 'mod-enter') return event.metaKey || event.ctrlKey;
  return !event.metaKey && !event.ctrlKey;
}
