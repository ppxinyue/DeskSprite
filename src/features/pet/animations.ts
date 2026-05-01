export type PetState =
  | 'idle'
  | 'thinking'
  | 'speaking'
  | 'listening'
  | 'happy'
  | 'walking'
  | 'running'
  | 'sleeping'
  | 'dragging'
  | 'peering'
  | 'wondering';

const IMAGE_MAP: Record<PetState, string> = {
  idle: '/assets/pet-images/cat15-front.png',
  thinking: '/assets/pet-images/cat15-wondering.png',
  speaking: '/assets/pet-images/cat15-front.png',
  listening: '/assets/pet-images/cat15-front.png',
  happy: '/assets/pet-images/cat15-front.png',
  walking: '/assets/pet-images/cat15-side.png',
  running: '/assets/pet-images/cat15-side.png',
  sleeping: '/assets/pet-images/cat15-sleeping.png',
  dragging: '/assets/pet-images/cat15-front.png',
  peering: '/assets/pet-images/cat15-peering.png',
  wondering: '/assets/pet-images/cat15-wondering.png',
};

export function getImageSrc(state: PetState): string {
  return IMAGE_MAP[state] ?? IMAGE_MAP.idle;
}
