import type { MessageSendShortcut } from '@/features/settings/settingsStore';

type KeyboardLike = {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
};

export function shouldSubmitMessage(event: KeyboardLike, shortcut: MessageSendShortcut) {
  if (event.key !== 'Enter' || event.shiftKey) return false;
  if (shortcut === 'mod-enter') return event.metaKey || event.ctrlKey;
  return !event.metaKey && !event.ctrlKey;
}
