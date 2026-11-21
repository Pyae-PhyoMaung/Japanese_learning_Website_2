'use client';

/* Writing pad — port of JL.pad: a guide canvas (the character drawn large
   and centered, shown as light gray strokes behind the user's drawing) and
   a draw canvas the user writes on with mouse/touch/pen. Strokes are kept
   as point lists so Undo works. The parent page drives what is displayed
   through props and gets a { clear, undo } API through the ref. */
import * as React from 'react';

export interface PadApi {
  clear: () => void;
  undo: () => void;
  strokeCount: number;
}

const SIZE = 320;

export const Pad = React.forwardRef<PadApi, { char: string; show: boolean; size?: number }>(function Pad(
  { char, show, size = SIZE },
  ref
) {
  const guideRef = React.useRef<HTMLCanvasElement | null>(null);
  const drawRef = React.useRef<HTMLCanvasElement | null>(null);
  const strokes = React.useRef<Array<Array<{ x: number; y: number }>>>([]);
  const drawing = React.useRef(false);
  const [, force] = React.useState(0);

  /* paint the guide character — same style as the original (light gray, big, centered) */
  React.useEffect(() => {
    const cv = guideRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!show || !char) return;
    ctx.fillStyle = '#d6d3d1'; /* stone-300 */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = (cv.width * 0.7) + 'px "Noto Sans JP", "Hiragino Sans", sans-serif';
    ctx.fillText(char, cv.width / 2, cv.height / 2 + cv.width * 0.02);
  }, [char, show]);

  const redraw = React.useCallback(() => {
    const cv = drawRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
    strokes.current.forEach((pts) => {
      if (!pts.length) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });
  }, []);

  React.useImperativeHandle(ref, () => ({
    clear: () => { strokes.current = []; redraw(); },
    undo: () => { strokes.current.pop(); redraw(); },
    get strokeCount() { return strokes.current.length; },
  }), [redraw]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  };

  return (
    <div className="relative select-none rounded-xl border bg-white shadow-inner" style={{ width: size, height: size }}>
      <canvas ref={guideRef} width={SIZE} height={SIZE} className="absolute inset-0 h-full w-full" />
      <canvas
        ref={drawRef}
        width={SIZE}
        height={SIZE}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          strokes.current.push([pos(e)]);
          redraw();
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          strokes.current[strokes.current.length - 1]?.push(pos(e));
          redraw();
        }}
        onPointerUp={() => { drawing.current = false; force((v) => v + 1); }}
        onPointerLeave={() => { drawing.current = false; }}
      />
      {/* grid lines like genkō yōshi paper */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-black/10" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-black/10" />
      </div>
    </div>
  );
});
