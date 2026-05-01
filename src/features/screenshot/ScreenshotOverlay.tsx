import { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';

interface Point {
  x: number;
  y: number;
}

interface Selection {
  start: Point;
  end: Point;
}

interface ScreenshotOverlayProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

export function ScreenshotOverlay({ onCapture, onCancel }: ScreenshotOverlayProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragging, setDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [capturing, setCapturing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (capturing) return;
      setStartPoint({ x: e.clientX, y: e.clientY });
      setDragging(true);
      setSelection(null);
    },
    [capturing]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setSelection({
        start: startPoint,
        end: { x: e.clientX, y: e.clientY },
      });
    },
    [dragging, startPoint]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const getRect = () => {
    if (!selection) return null;
    const x = Math.min(selection.start.x, selection.end.x);
    const y = Math.min(selection.start.y, selection.end.y);
    const w = Math.abs(selection.end.x - selection.start.x);
    const h = Math.abs(selection.end.y - selection.start.y);
    return { x, y, width: w, height: h };
  };

  const handleCapture = async () => {
    const rect = getRect();
    if (!rect || rect.width < 10 || rect.height < 10) return;

    setCapturing(true);
    try {
      const base64 = await invoke<string>('capture_screen_region', {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
      onCapture(base64);
    } catch (e) {
      console.error('Screenshot capture failed:', e);
      setCapturing(false);
    }
  };

  const rect = getRect();

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] cursor-crosshair"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => {
        if (!selection && !dragging) onCancel();
      }}
    >
      {rect && (
        <div
          className="absolute border-2 border-white border-dashed"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
          }}
        >
          {/* Size label */}
          <div className="absolute -top-6 left-0 text-white text-xs bg-black/60 px-2 py-0.5 rounded">
            {Math.round(rect.width)} × {Math.round(rect.height)} px
          </div>

          {/* Capture button */}
          {!dragging && rect.width > 30 && rect.height > 30 && (
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
              <Button size="sm" onClick={handleCapture} disabled={capturing}>
                {capturing ? '截取中...' : '分析此区域'}
              </Button>
              <Button size="sm" variant="ghost" className="text-white" onClick={onCancel}>
                取消
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
