export {};

declare global {
  const __APP_VERSION__: string;

  interface Window {
    deskCat: {
      label: string;
      invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;
      emit(channel: string, payload?: unknown): Promise<void>;
      listen<T = unknown>(
        channel: string,
        callback: (event: { event: string; payload: T }) => void,
      ): Promise<() => void>;
      window: {
        outerPosition(): Promise<{ x: number; y: number }>;
        outerSize(): Promise<{ width: number; height: number }>;
        setPosition(position: { x: number; y: number; type?: string }): Promise<void>;
        setSize(size: { width: number; height: number; type?: string }): Promise<void>;
        onMoved(callback: () => void): Promise<() => void>;
      };
      currentMonitor(): Promise<{
        scaleFactor: number;
        workArea: {
          position: { x: number; y: number };
          size: { width: number; height: number };
        };
      } | null>;
      openDialog(options: {
        multiple?: boolean;
        filters?: Array<{ name: string; extensions: string[] }>;
      }): Promise<string | string[] | null>;
      convertFileSrc(path: string): string;
    };
  }
}
