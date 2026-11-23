"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, EyeOff, Home, Minus, Plus, Trash2, X } from "lucide-react";
import { clean, findPois, fmt, niceStep, parseLine, type Poi } from "@/lib/graph";

const COLORS = ["#c2410c", "#1d4ed8", "#15803d", "#7c3aed", "#be185d", "#0e7490", "#a16207", "#4b5563"];

interface Expr {
  id: number;
  text: string;
  color: string;
  visible: boolean;
}

interface Slider {
  value: number;
  min: number;
  max: number;
  step: number;
}

interface View {
  cx: number;
  cy: number;
  /** pixels per unit */
  scale: number;
}

const DEFAULT_VIEW: View = { cx: 0, cy: 0, scale: 40 };

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const KIND_LABEL: Record<Poi["kind"], string> = {
  root: "Root",
  max: "Maximum",
  min: "Minimum",
  intersection: "Intersection",
  "y-intercept": "y-intercept",
};

let nextId = 1;

export function GraphCalculator({ initial }: { initial: string[] }) {
  const [exprs, setExprs] = useState<Expr[]>(() => {
    const list = initial.length ? initial : ["y = a*x^2 + b*x + c"];
    return list.map((text, i) => ({ id: nextId++, text, color: COLORS[i % COLORS.length], visible: true }));
  });
  const [sliders, setSliders] = useState<Record<string, Slider>>({});
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [pinned, setPinned] = useState<Poi[]>([]);
  const [showPois, setShowPois] = useState(true);
  const [tableFor, setTableFor] = useState<number | null>(null);
  const [tableStart, setTableStart] = useState(-3);
  const [tableStep, setTableStep] = useState(1);
  const [themeTick, setThemeTick] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; view: View } | null>(null);

  const parsed = useMemo(() => exprs.map((e) => ({ expr: e, p: parseLine(e.text) })), [exprs]);

  // Auto-create sliders for every free parameter.
  const paramNames = useMemo(() => [...new Set(parsed.flatMap((x) => x.p.params))].sort(), [parsed]);
  useEffect(() => {
    setSliders((prev) => {
      const next: Record<string, Slider> = {};
      for (const n of paramNames) next[n] = prev[n] ?? { value: 1, min: -10, max: 10, step: 0.1 };
      return next;
    });
  }, [paramNames]);

  const params = useMemo(() => Object.fromEntries(Object.entries(sliders).map(([k, s]) => [k, s.value])), [sliders]);

  const live = useMemo(
    () =>
      parsed
        .filter((x) => x.expr.visible && !x.p.error)
        .flatMap((x) => [
          ...x.p.curves.map((c) => ({ id: x.expr.id, color: x.expr.color, dashed: c.dashed, label: c.label, fn: (t: number) => c.fn(t, params) })),
        ]),
    [parsed, params],
  );

  const verticals = useMemo(
    () =>
      parsed
        .filter((x) => x.expr.visible && x.p.vertical)
        .map((x) => ({ color: x.expr.color, x: x.p.vertical!(0, params) }))
        .filter((v) => Number.isFinite(v.x)),
    [parsed, params],
  );

  const toPx = useCallback((x: number, y: number) => ({ px: size.w / 2 + (x - view.cx) * view.scale, py: size.h / 2 - (y - view.cy) * view.scale }), [size, view]);
  const toWorld = useCallback((px: number, py: number) => ({ x: view.cx + (px - size.w / 2) / view.scale, y: view.cy - (py - size.h / 2) / view.scale }), [size, view]);

  const range = useMemo(() => {
    const a = toWorld(0, 0);
    const b = toWorld(size.w, size.h);
    return { x0: a.x, x1: b.x, y0: b.y, y1: a.y };
  }, [toWorld, size]);

  const pois = useMemo(() => {
    if (!showPois || !live.length) return [];
    return findPois(live, range.x0, range.x1, range.y1 - range.y0);
  }, [live, range, showPois]);

  // Pinned labels describe the current math; drop them when equations or parameters change, keep them while panning.
  useEffect(() => {
    setPinned([]);
  }, [exprs, params]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(280, Math.round(r.width));
      // Desktop: the plane fills its panel. Mobile: a near-square plane under the expression list.
      const lg = window.matchMedia("(min-width: 1024px)").matches;
      const h = lg && r.height > 200 ? Math.round(r.height) : Math.round(Math.min(560, Math.max(320, w * 0.85)));
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    const ro = new ResizeObserver(measure);
    window.addEventListener("resize", measure);
    measure();
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((t) => t + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });
    return () => obs.disconnect();
  }, []);

  const draw = useCallback(
    (canvas: HTMLCanvasElement, forExport = false) => {
      const dpr = forExport ? 2 : Math.min(2, window.devicePixelRatio || 1);
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = forExport ? "#ffffff" : cssVar("--surface", "#ffffff");
      const text = forExport ? "#111111" : cssVar("--text", "#111111");
      const muted = forExport ? "#666666" : cssVar("--muted", "#666666");
      const grid = forExport ? "#e5e7eb" : cssVar("--grid", "#e5e7eb");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.w, size.h);

      // Grid
      const step = niceStep(80 / view.scale);
      const minor = step / 5;
      const drawLines = (st: number, color: string, width: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        for (let x = Math.ceil(range.x0 / st) * st; x <= range.x1; x += st) {
          const { px } = toPx(x, 0);
          ctx.moveTo(Math.round(px) + 0.5, 0);
          ctx.lineTo(Math.round(px) + 0.5, size.h);
        }
        for (let y = Math.ceil(range.y0 / st) * st; y <= range.y1; y += st) {
          const { py } = toPx(0, y);
          ctx.moveTo(0, Math.round(py) + 0.5);
          ctx.lineTo(size.w, Math.round(py) + 0.5);
        }
        ctx.stroke();
      };
      ctx.globalAlpha = 0.45;
      drawLines(minor, grid, 1);
      ctx.globalAlpha = 1;
      drawLines(step, grid, 1);

      // Axes
      const origin = toPx(0, 0);
      ctx.strokeStyle = text;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(0, origin.py);
      ctx.lineTo(size.w, origin.py);
      ctx.moveTo(origin.px, 0);
      ctx.lineTo(origin.px, size.h);
      ctx.stroke();

      // Labels
      ctx.fillStyle = muted;
      ctx.font = `11px ${cssVar("--font-code", "ui-monospace")}, ui-monospace, monospace`;
      const lx = Math.min(size.h - 4, Math.max(12, origin.py + 14));
      ctx.textAlign = "center";
      for (let x = Math.ceil(range.x0 / step) * step; x <= range.x1; x += step) {
        if (Math.abs(x) < step / 2) continue;
        ctx.fillText(fmt(clean(x)), toPx(x, 0).px, lx);
      }
      ctx.textAlign = "right";
      const ly = Math.min(size.w - 4, Math.max(28, origin.px - 6));
      for (let y = Math.ceil(range.y0 / step) * step; y <= range.y1; y += step) {
        if (Math.abs(y) < step / 2) continue;
        ctx.fillText(fmt(clean(y)), ly, toPx(0, y).py + 4);
      }

      // Curves
      for (const c of live) {
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash(c.dashed ? [8, 6] : []);
        ctx.beginPath();
        let pen = false;
        let lastPy = 0;
        for (let px = 0; px <= size.w; px += 1) {
          const x = range.x0 + px / view.scale;
          const y = c.fn(x);
          if (!Number.isFinite(y)) {
            pen = false;
            continue;
          }
          const py = size.h / 2 - (y - view.cy) * view.scale;
          if (pen && Math.abs(py - lastPy) > size.h * 1.5) pen = false;
          const cpy = Math.max(-size.h, Math.min(2 * size.h, py));
          if (pen) ctx.lineTo(px, cpy);
          else ctx.moveTo(px, cpy);
          pen = true;
          lastPy = py;
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const v of verticals) {
        const { px } = toPx(v.x, 0);
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, size.h);
        ctx.stroke();
      }

      // Points of interest
      for (const p of pois) {
        const { px, py } = toPx(p.x, p.y);
        ctx.fillStyle = bg;
        ctx.strokeStyle = muted;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      for (const p of pinned) {
        const { px, py } = toPx(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fill();
        const label = `${KIND_LABEL[p.kind]} (${fmt(p.x)}, ${fmt(p.y)})`;
        ctx.font = `500 12px ${cssVar("--font-code", "ui-monospace")}, ui-monospace, monospace`;
        const w = ctx.measureText(label).width + 12;
        const bx = Math.min(size.w - w - 4, Math.max(4, px + 8));
        const by = Math.max(4, py - 30);
        ctx.fillStyle = bg;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, w, 22, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = text;
        ctx.textAlign = "left";
        ctx.fillText(label, bx + 6, by + 15);
      }
    },
    // themeTick forces a redraw when the theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size, view, range, live, verticals, pois, pinned, toPx, themeTick],
  );

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current);
  }, [draw]);

  // Wheel zoom around the cursor.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      setView((v) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const scale = Math.min(5000, Math.max(0.5, v.scale * factor));
        const wx = v.cx + (mx - size.w / 2) / v.scale;
        const wy = v.cy - (my - size.h / 2) / v.scale;
        return { scale, cx: wx - (mx - size.w / 2) / scale, cy: wy + (my - size.h / 2) / scale };
      });
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  }, [size]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), view };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s = Math.min(5000, Math.max(0.5, pinch.current.view.scale * (d / pinch.current.dist)));
      setView({ ...pinch.current.view, scale: s });
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.moved) setView({ ...d.view, cx: d.view.cx - dx / d.view.scale, cy: d.view.cy + dy / d.view.scale });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const r = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let best: Poi | null = null;
    let bestD = 14;
    for (const p of pois) {
      const { px, py } = toPx(p.x, p.y);
      const dist = Math.hypot(px - mx, py - my);
      if (dist < bestD) {
        bestD = dist;
        best = p;
      }
    }
    if (best) {
      const b = best;
      setPinned((prev) => (prev.some((p) => p.x === b.x && p.y === b.y && p.kind === b.kind) ? prev.filter((p) => !(p.x === b.x && p.y === b.y && p.kind === b.kind)) : [...prev, b]));
    }
  };

  const zoom = (f: number) => setView((v) => ({ ...v, scale: Math.min(5000, Math.max(0.5, v.scale * f)) }));

  const exportPng = () => {
    const c = document.createElement("canvas");
    draw(c, true);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "graph.png";
    a.click();
    if (canvasRef.current) draw(canvasRef.current);
  };

  const update = (id: number, patch: Partial<Expr>) => setExprs((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const add = () => setExprs((list) => [...list, { id: nextId++, text: "", color: COLORS[list.length % COLORS.length], visible: true }]);
  const remove = (id: number) => setExprs((list) => list.filter((e) => e.id !== id));

  const tableExpr = parsed.find((x) => x.expr.id === tableFor && !x.p.error && x.p.curves.length);
  const tableRows = useMemo(() => {
    if (!tableExpr) return [];
    const step = tableStep || 1;
    return Array.from({ length: 13 }, (_, i) => {
      const x = clean(tableStart + i * step);
      return { x, ys: tableExpr.p.curves.map((c) => c.fn(x, params)) };
    });
  }, [tableExpr, tableStart, tableStep, params]);

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-elev-2 lg:grid lg:h-[calc(100dvh-15rem)] lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col border-b border-line lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="divide-y divide-line border-b border-line">
          {parsed.map(({ expr, p }, i) => (
            <div key={expr.id} className="grid grid-cols-[2rem_minmax(0,1fr)] py-2 pr-2.5 transition-colors focus-within:bg-accent/[0.05]">
              <span className="num pt-2 text-center text-[11px] text-muted">{i + 1}</span>
              <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update(expr.id, { visible: !expr.visible })}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: expr.color, background: expr.visible ? expr.color : "transparent" }}
                  aria-label={expr.visible ? "Hide graph" : "Show graph"}
                >
                  {expr.visible ? <Eye className="h-3.5 w-3.5 text-white" /> : <EyeOff className="h-3.5 w-3.5" style={{ color: expr.color }} />}
                </button>
                <input
                  className="w-full min-w-0 bg-transparent py-1.5 font-mono text-[15px] outline-none placeholder:text-muted"
                  value={expr.text}
                  onChange={(e) => update(expr.id, { text: e.target.value })}
                  placeholder={i === 0 ? "y = x^2 - 4" : "Add an equation"}
                  spellCheck={false}
                  aria-label={`Expression ${i + 1}`}
                />
                <button type="button" onClick={() => remove(expr.id)} className="p-1 text-muted hover:text-danger" aria-label="Delete expression">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {p.error && <p className="mt-1 pl-9 text-xs text-danger">{p.error}</p>}
              {!p.error && p.curves.length > 0 && (
                <button type="button" className="mt-1 pl-9 text-xs text-accent hover:underline" onClick={() => setTableFor(tableFor === expr.id ? null : expr.id)}>
                  {tableFor === expr.id ? "Hide table" : "Table of values"}
                </button>
              )}
              </div>
            </div>
          ))}
          <button type="button" onClick={add} className="flex w-full items-center gap-2 p-2.5 text-sm text-muted hover:bg-surface-2 hover:text-text">
            <Plus className="h-4 w-4" /> Add equation
          </button>
        </div>

        {paramNames.length > 0 && (
          <div className="space-y-3 border-b border-line p-3">
            <div className="label">Parameters</div>
            {paramNames.map((n) => {
              const s = sliders[n];
              if (!s) return null;
              const set = (patch: Partial<Slider>) => setSliders((prev) => ({ ...prev, [n]: { ...prev[n], ...patch } }));
              return (
                <div key={n}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-6 font-mono font-semibold italic">{n}</span>
                    <span className="text-muted">=</span>
                    <input
                      type="number"
                      className="input w-20 py-1 text-sm"
                      value={s.value}
                      step={s.step}
                      onChange={(e) => Number.isFinite(e.target.valueAsNumber) && set({ value: e.target.valueAsNumber })}
                      aria-label={`Value of ${n}`}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <input
                      type="number"
                      className="w-12 rounded border border-line bg-surface px-1 py-0.5"
                      value={s.min}
                      onChange={(e) => Number.isFinite(e.target.valueAsNumber) && set({ min: e.target.valueAsNumber })}
                      aria-label={`Minimum of ${n}`}
                    />
                    <input
                      type="range"
                      className="flex-1 accent-[var(--accent)]"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={s.value}
                      onChange={(e) => set({ value: Number(e.target.value) })}
                      aria-label={`Slider for ${n}`}
                    />
                    <input
                      type="number"
                      className="w-12 rounded border border-line bg-surface px-1 py-0.5"
                      value={s.max}
                      onChange={(e) => Number.isFinite(e.target.valueAsNumber) && set({ max: e.target.valueAsNumber })}
                      aria-label={`Maximum of ${n}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tableExpr && (
          <div className="border-b border-line p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="label flex-1">Table: {tableExpr.expr.text}</span>
              <button type="button" onClick={() => setTableFor(null)} className="text-muted hover:text-text" aria-label="Close table">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-2 flex gap-2 text-xs">
              <label className="flex items-center gap-1">
                Start
                <input type="number" className="input w-16 py-1 text-xs" value={tableStart} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && setTableStart(e.target.valueAsNumber)} />
              </label>
              <label className="flex items-center gap-1">
                Step
                <input type="number" className="input w-16 py-1 text-xs" value={tableStep} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && e.target.valueAsNumber !== 0 && setTableStep(e.target.valueAsNumber)} />
              </label>
            </div>
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-1 font-medium">x</th>
                  {tableExpr.p.curves.map((c, i) => (
                    <th key={i} className="py-1 font-medium">
                      {tableExpr.p.curves.length > 1 ? c.label : "y"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.x} className="border-b border-line/50">
                    <td className="py-0.5">{fmt(r.x)}</td>
                    {r.ys.map((y, i) => (
                      <td key={i} className="py-0.5">
                        {fmt(y)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col lg:min-h-0">
        <div ref={wrapRef} className="relative min-h-0 overflow-hidden max-lg:min-h-[320px] lg:flex-1">
          <canvas
            ref={canvasRef}
            style={{ width: size.w, height: size.h }}
            className="block cursor-grab touch-none active:cursor-grabbing lg:absolute lg:inset-0"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-label="Graph. Drag to pan, scroll or pinch to zoom, click a gray point to label it."
          />
          <div className="absolute right-3 top-3 flex flex-col divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface shadow-elev-1">
            <button type="button" className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:bg-surface-2 hover:text-text" onClick={() => zoom(1.4)} aria-label="Zoom in">
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:bg-surface-2 hover:text-text" onClick={() => zoom(1 / 1.4)} aria-label="Zoom out">
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:bg-surface-2 hover:text-text" onClick={() => setView(DEFAULT_VIEW)} aria-label="Reset view">
              <Home className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2 text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={showPois} onChange={(e) => setShowPois(e.target.checked)} />
            Show roots, extrema, intersections
          </label>
          {pinned.length > 0 && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setPinned([])}>
              Clear labels
            </button>
          )}
          <button type="button" className="btn-ghost btn-sm ml-auto" onClick={exportPng}>
            <Download className="h-4 w-4" /> Export PNG
          </button>
        </div>
        {pinned.length > 0 && (
          <ul className="divide-y divide-line border-t border-line text-sm lg:max-h-40 lg:overflow-y-auto">
            {pinned.map((p, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <span className="font-medium">{KIND_LABEL[p.kind]}</span>
                <span className="ml-auto font-mono tabular-nums">
                  ({fmt(p.x)}, {fmt(p.y)})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
