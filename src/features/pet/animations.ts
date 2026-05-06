export type PetState =
  | 'idle'
  | 'happy'
  | 'thinking'
  | 'sleeping'
  | 'dragging';

const DEFAULT_IMAGES: Record<PetState, string> = {
  idle: 'assets/pet-images/cat15-front.png',
  happy: 'assets/pet-images/cat15-front.png',
  thinking: 'assets/pet-images/cat15-front.png',
  sleeping: 'assets/pet-images/cat15-sleeping.png',
  dragging: 'assets/pet-images/cat15-front.png',
};

const DEFAULT_IDLE_IMAGE = 'assets/pet-images/cat15-front.png';

export function getDefaultImage(state: PetState): string {
  return DEFAULT_IMAGES[state] ?? DEFAULT_IDLE_IMAGE;
}

export function getImageSrc(
  state: PetState,
  customImages: Record<PetState, string | null>,
): string {
  // 1. User custom image for this state
  if (customImages[state]) return customImages[state]!;
  // 2. User custom idle image as fallback
  if (customImages.idle) return customImages.idle;
  // 3. Built-in default
  return getDefaultImage(state);
}
