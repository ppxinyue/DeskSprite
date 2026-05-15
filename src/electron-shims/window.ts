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

export class LogicalBounds {
  readonly type = 'logical';
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

export function getCurrentWindow() {
  if (!window.deskCat) {
    const label = (window.location.hash.replace(/^#/, '') || 'pet').split(':')[0] || 'pet';
    return {
      label,
      outerPosition: async () => ({ x: 0, y: 0 }),
      outerSize: async () => ({ width: window.innerWidth, height: window.innerHeight }),
      setPosition: async () => {},
      setSize: async () => {},
      setBounds: async () => {},
      onMoved: async () => () => {},
    };
  }
  return {
    label: window.deskCat.label,
    outerPosition: () => window.deskCat.window.outerPosition(),
    outerSize: () => window.deskCat.window.outerSize(),
    setPosition: (position: LogicalPosition | PhysicalPosition) =>
      window.deskCat.window.setPosition(position),
    setSize: (size: LogicalSize) => window.deskCat.window.setSize(size),
    setBounds: (bounds: LogicalBounds) => window.deskCat.window.setBounds(bounds),
    onMoved: (callback: () => void) => window.deskCat.window.onMoved(callback),
  };
}

export function currentMonitor() {
  if (!window.deskCat) {
    return Promise.resolve({
      scaleFactor: window.devicePixelRatio || 1,
      workArea: {
        position: { x: 0, y: 0 },
        size: { width: window.innerWidth, height: window.innerHeight },
      },
    });
  }
  return window.deskCat.currentMonitor();
}
