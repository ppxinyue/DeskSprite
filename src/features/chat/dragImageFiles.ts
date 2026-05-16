type DragItemLike = {
  kind?: string;
  type?: string;
};

type FileLike = {
  name?: string;
  type?: string;
};

export function isAllowedDraggedImageName(name: string | undefined) {
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(String(name || ''));
}

export function isDraggedImageFile(file: FileLike | null | undefined) {
  if (!file) return false;
  return String(file.type || '').startsWith('image/') || isAllowedDraggedImageName(file.name);
}

export function hasDraggedImageItems(items: Iterable<DragItemLike> | ArrayLike<DragItemLike> | null | undefined) {
  return Array.from(items ?? []).some((item) => (
    item.kind === 'file' && (String(item.type || '').startsWith('image/') || isAllowedDraggedImageName(item.type))
  ));
}

export function hasDraggedFileItems(items: Iterable<DragItemLike> | ArrayLike<DragItemLike> | null | undefined) {
  return Array.from(items ?? []).some((item) => item.kind === 'file');
}

export function firstDraggedImageFile<T extends FileLike>(files: Iterable<T> | ArrayLike<T> | null | undefined): T | null {
  return Array.from(files ?? []).find(isDraggedImageFile) ?? null;
}
