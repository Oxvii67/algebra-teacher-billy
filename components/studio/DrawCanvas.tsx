"use client";

import { getStroke } from "perfect-freehand";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Grid3x3, PenTool, Redo2, Trash2, Undo2 } from "lucide-react";
import type { Stroke } from "@/lib/session/drafts";

const W = 1400;
const H = 800;
const COLORS = ["#111111", "#1d4ed8", "#b91c1c", "#15803d", "#7c3aed", "#c2410c"];
const SIZES = [3, 6, 10, 16];

function pathFrom(stroke: number[][]): Path2D {
  const p = new Path2D();
  if (!stroke.length) return p;
  const [first, ...rest] = stroke;
  p.moveTo(first[0], first[1]);
  for (let i = 0; i < rest.length; i++) {
    const [x0, y0] = stroke[i];
    const [x1, y1] = rest[i];
    p.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  p.closePath();
  return p;
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  const outline = getStroke(s.points, {
    size: s.erase ? s.size * 3 : s.size,
    thinning: s.erase ? 0 : 0.55,
    smoothing: 0.6,
    streamline: 0.5,
    simulatePressure: s.points.every((p) => p[2] === 0.5),
    last: true,
  });
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.fillStyle = s.erase ? "#000" : s.color;
  ctx.fill(pathFrom(outline));
  ctx.globalCompositeOperation = "source-over";
}

export function DrawCanvas({
  strokes,
  setStrokes,
  onChange,
}: {
  strokes: Stroke[];
  setStrokes: (s: Stroke[]) => void;
  /** The drawing as an image, or null while it is blank. */
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [erase, setErase] = useState(false);
  const [grid, setGrid] = useState(true);
  const current = useRef<Stroke | null>(null);
  const raf = useRef<number | null>(null);

  const render = useCallback((list: Stroke[]) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const scale = c.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    list.forEach((s) => drawStroke(ctx, s));
    if (current.current) drawStroke(ctx, current.current);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr;
    c.height = H * dpr;
  }, []);

  const exportImage = useCallback((list: Stroke[]) => {
    if (!list.some((s) => !s.erase)) return onChange(null);
    const src = canvasRef.current!;
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(src, 0, 0, W, H);
    onChange(out.toDataURL("image/png"));
  }, [onChange]);

  // Also runs when a saved drawing loads.
  useEffect(() => {
    render(strokes);
    exportImage(strokes);
  }, [strokes, render, exportImage]);

  const commit = setStrokes;

  const toPoint = (e: React.PointerEvent): [number, number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H, e.pointerType === "pen" ? e.pressure : 0.5];
  };

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    (e.target as Element).setPointerCapture(e.pointerId);
    current.current = { points: [toPoint(e)], color, size, erase };
    render(strokes);
  };

  const move = (e: React.PointerEvent) => {
    if (!current.current) return;
    const events = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [];
    if (events.length) {
      const r = canvasRef.current!.getBoundingClientRect();
      for (const ev of events) {
        current.current.points.push([((ev.clientX - r.left) / r.width) * W, ((ev.clientY - r.top) / r.height) * H, ev.pointerType === "pen" ? ev.pressure : 0.5]);
      }
    } else current.current.points.push(toPoint(e));
    if (raf.current === null) {
      raf.current = requestAnimationFrame(() => {
        raf.current = null;
        render(strokes);
      });
    }
  };

  const up = () => {
    const s = current.current;
    current.current = null;
    if (!s) return;
    setRedo([]);
    commit([...strokes, s]);
  };

  const undo = () => {
    if (!strokes.length) return;
    setRedo((r) => [...r, strokes[strokes.length - 1]]);
    commit(strokes.slice(0, -1));
  };

  const redoOne = () => {
    if (!redo.length) return;
    const s = redo[redo.length - 1];
    setRedo((r) => r.slice(0, -1));
    commit([...strokes, s]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      e.preventDefault();
      if (e.shiftKey) redoOne();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line p-0.5">
          <button type="button" onClick={() => setErase(false)} className={`tab ${!erase ? "tab-active" : ""}`} aria-pressed={!erase}>
            <PenTool className="h-4 w-4" /> Pen
          </button>
          <button type="button" onClick={() => setErase(true)} className={`tab ${erase ? "tab-active" : ""}`} aria-pressed={erase}>
            <Eraser className="h-4 w-4" /> Eraser
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setErase(false);
              }}
              className={`h-7 w-7 rounded-full border-2 ${color === c && !erase ? "border-accent ring-2 ring-accent/40" : "border-line"}`}
              style={{ background: c }}
              aria-label={`Pen color ${c}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex h-8 w-8 items-center justify-center rounded-md border ${size === s ? "border-accent bg-surface-2" : "border-line"}`}
              aria-label={`Pen size ${s}`}
            >
              <span className="rounded-full bg-text" style={{ width: Math.max(3, s * 0.9), height: Math.max(3, s * 0.9) }} />
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className={`btn-ghost btn-sm ${grid ? "border-accent" : ""}`} onClick={() => setGrid((g) => !g)} aria-pressed={grid}>
            <Grid3x3 className="h-4 w-4" /> Grid
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={undo} disabled={!strokes.length} aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={redoOne} disabled={!redo.length} aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setRedo([]);
              commit([]);
            }}
            disabled={!strokes.length}
            aria-label="Clear canvas"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-line bg-white"
        style={
          grid
            ? {
                backgroundImage:
                  "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }
            : undefined
        }
      >
        <canvas
          ref={canvasRef}
          className={`block aspect-[7/4] w-full touch-none ${erase ? "cursor-cell" : "cursor-crosshair"}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Drawing canvas. Write the problem here."
        />
      </div>
      <p className="text-xs text-muted">Write one problem clearly. Ctrl+Z or Cmd+Z undoes, add Shift to redo. The grid is not sent with your drawing.</p>
    </div>
  );
}
