export const CONTEXT_MENU_ACTION_DEDUPE_MS = 240;

export type ContextMenuActivationEventLike = {
  button?: number;
  currentTarget?: {
    disabled?: boolean;
  };
};

export type ContextMenuActionStamp = {
  action: string;
  at: number;
} | null;

export function shouldActivateContextMenuAction(event?: ContextMenuActivationEventLike | null) {
  if (event?.currentTarget?.disabled) return false;
  if (typeof event?.button === 'number' && event.button !== 0) return false;
  return true;
}

export function shouldRunContextMenuAction(last: ContextMenuActionStamp, action: string, now: number) {
  if (!last) return true;
  if (last.action !== action) return true;
  return now - last.at >= CONTEXT_MENU_ACTION_DEDUPE_MS;
}
