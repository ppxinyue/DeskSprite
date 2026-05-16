import type { SelectedImage } from './ChatPrimitives';

export const COMPACT_CHAT_PENDING_IMAGE_KEY = 'deskcat:compact-chat-pending-image';

export function isDroppedChatImagePayload(value: unknown): value is SelectedImage {
  if (!value || typeof value !== 'object') return false;
  const image = value as Partial<SelectedImage>;
  return image.kind !== 'document' && typeof image.dataUrl === 'string' && image.dataUrl.startsWith('data:image/');
}

export function serializeDroppedChatImage(image: SelectedImage) {
  if (!isDroppedChatImagePayload(image)) throw new Error('Unsupported dropped image payload.');
  return JSON.stringify({
    path: image.path || '',
    name: image.name || '拖入图片',
    kind: 'image',
    dataUrl: image.dataUrl,
  });
}

export function parseDroppedChatImage(raw: string | null | undefined): SelectedImage | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isDroppedChatImagePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
