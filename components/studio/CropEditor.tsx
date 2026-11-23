"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crop, LoaderCircle, RotateCcw, RotateCw, Undo2 } from "lucide-react";
import { cropImage, type CropRect, rotateImage } from "./imageUtils";

type Handle = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

const MIN = 0.05;

function clampRect(r: CropRect): CropRect {
  const w = Math.min(1, Math.max(MIN, r.w));
  const h = Math.min(1, Math.max(MIN, r.h));
  return { x: Math.min(1 - w, Math.max(0, r.x)), y: Math.min(1 - h, Math.max(0, r.y)), w, h };
}

export function CropEditor({
  src,
  onDone,
  onCancel,
}: {
  src: string;
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [quarter, setQuarter] = useState(0);
  const [fine, setFine] = useState(0);
  const [working, setWorking] = useState(src);
  const [rect, setRect] = useState<CropRect>({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 });
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; startX: number; startY: number; start: CropRect } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const angle = quarter * 90 + fine;
    if (angle === 0) {
      setWorking(src);
      return;
    }
    const t = setTimeout(() => {
      rotateImage(src, angle).then((out) => !cancelled && setWorking(out));
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [src, quarter, fine]);

  const onPointerDown = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { handle, startX: e.clientX, startY: e.clientY, start: rect };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    const b = box.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / b.width;
    const dy = (e.clientY - d.startY) / b.height;
    const s = d.start;
    let r: CropRect = { ...s };
    if (d.handle === "move") r = { ...s, x: s.x + dx, y: s.y + dy };
    else {
      let { x, y, w, h } = s;
      if (d.handle.includes("w")) {
        const nx = Math.min(s.x + s.w - MIN, Math.max(0, s.x + dx));
        w = s.w + (s.x - nx);
        x = nx;
      }
      if (d.handle.includes("e")) w = Math.min(1 - s.x, Math.max(MIN, s.w + dx));
      if (d.handle.includes("n")) {
        const ny = Math.min(s.y + s.h - MIN, Math.max(0, s.y + dy));
        h = s.h + (s.y - ny);
        y = ny;
      }
      if (d.handle.includes("s")) h = Math.min(1 - s.y, Math.max(MIN, s.h + dy));
      r = { x, y, w, h };
    }
    setRect(clampRect(r));
  };

  const end = () => (drag.current = null);

  const apply = async () => {
    setBusy(true);
    try {
      onDone(await cropImage(working, rect));
    } finally {
      setBusy(false);
    }
  };

  const handles: { h: Handle; cls: string }[] = [
    { h: "nw", cls: "-left-2 -top-2 cursor-nwse-resize" },
    { h: "ne", cls: "-right-2 -top-2 cursor-nesw-resize" },
    { h: "sw", cls: "-bottom-2 -left-2 cursor-nesw-resize" },
    { h: "se", cls: "-bottom-2 -right-2 cursor-nwse-resize" },
    { h: "n", cls: "-top-2 left-1/2 -translate-x-1/2 cursor-ns-resize" },
    { h: "s", cls: "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize" },
    { h: "w", cls: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
    { h: "e", cls: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label flex items-center gap-1.5">
          <Crop className="h-3.5 w-3.5" /> Crop to one problem
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setQuarter((q) => (q + 3) % 4)} aria-label="Rotate left">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setQuarter((q) => (q + 1) % 4)} aria-label="Rotate right">
            <RotateCw className="h-4 w-4" />
          </button>
          <label className="flex items-center gap-2 text-xs text-muted">
            Straighten
            <input type="range" min={-15} max={15} step={0.5} value={fine} onChange={(e) => setFine(Number(e.target.value))} className="w-28 accent-[var(--accent)]" />
            <span className="w-10 tabular-nums">{fine.toFixed(1)}</span>
          </label>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setQuarter(0);
              setFine(0);
              setRect({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 });
            }}
          >
            <Undo2 className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      <div className="flex justify-center rounded-lg bg-surface-2 p-3">
        <div
          ref={boxRef}
          className="relative inline-block touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={working} alt="Problem to crop" className="block max-h-[60vh] max-w-full" draggable={false} />
          <div
            className="absolute cursor-move border-2 border-accent"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
            }}
            onPointerDown={onPointerDown("move")}
          >
            {handles.map(({ h, cls }) => (
              <span
                key={h}
                onPointerDown={onPointerDown(h)}
                className={`absolute h-4 w-4 rounded-sm border-2 border-accent bg-surface ${cls}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Choose another image
        </button>
        <button type="button" className="btn-primary" onClick={apply} disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Use this crop
        </button>
      </div>
    </div>
  );
}
