export class LogicalPosition {
  readonly type = 'logical';
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class PhysicalPosition {
  readonly type = 'physical';
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class LogicalSize {
  readonly type = 'logical';
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

export function getCurrentWindow() {
  return {
    label: window.deskSprite.label,
    outerPosition: () => window.deskSprite.window.outerPosition(),
    outerSize: () => window.deskSprite.window.outerSize(),
    setPosition: (position: LogicalPosition | PhysicalPosition) =>
      window.deskSprite.window.setPosition(position),
    setSize: (size: LogicalSize) => window.deskSprite.window.setSize(size),
    onMoved: (callback: () => void) => window.deskSprite.window.onMoved(callback),
  };
}

export function currentMonitor() {
  return window.deskSprite.currentMonitor();
}
