"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { MathBlock, MathInline, MathText } from "@/components/math/Math";
import { SANDBOX, type SandboxCourse, type SandboxExample } from "@/lib/sandbox";

const STEP_MS = 480;
const W = 560;
const H = 340;
const COURSES: SandboxCourse[] = ["Algebra 2", "AP Precalculus", "AP Calculus"];
/** Labels for phone widths, where three full course names do not fit side by side. */
const SHORT: Record<SandboxCourse, string> = { "Algebra 2": "Algebra 2", "AP Precalculus": "Precalc", "AP Calculus": "Calculus" };
const LABEL_FONT = 11.5;
const CHAR_W = 6.9; // monospace advance at LABEL_FONT

function project(ex: SandboxExample) {
  const [x0, x1] = ex.x;
  const [y0, y1] = ex.y;
  return {
    px: (x: number) => ((x - x0) / (x1 - x0)) * W,
    py: (y: number) => H - ((y - y0) / (y1 - y0)) * H,
    ux: (px: number) => x0 + (px / W) * (x1 - x0),
  };
}

function curvePath(ex: SandboxExample, fn: (x: number) => number, domain?: [number, number]) {
  const { px, py } = project(ex);
  const [a, b] = domain ?? ex.x;
  const n = 260;
  const pad = (ex.y[1] - ex.y[0]) * 0.6;
  let d = "";
  let pen = false;
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const y = fn(x);
    if (!Number.isFinite(y) || y < ex.y[0] - pad || y > ex.y[1] + pad) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${px(x).toFixed(2)} ${py(y).toFixed(2)}`;
    pen = true;
  }
  return d;
}

function areaPath(ex: SandboxExample) {
  if (!ex.area) return "";
  const { px, py } = project(ex);
  const { fn, a, b } = ex.area;
  let d = `M${px(a)} ${py(0)}`;
  for (let i = 0; i <= 80; i++) {
    const x = a + ((b - a) * i) / 80;
    d += `L${px(x).toFixed(2)} ${py(fn(x)).toFixed(2)}`;
  }
  return d + `L${px(b)} ${py(0)}Z`;
}

function ticks(lo: number, hi: number) {
  const step = hi - lo > 12 ? 2 : 1;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) if (v !== 0) out.push(v);
  return out;
}

function fmt(v: number) {
  const r = Math.round(v * 100) / 100;
  return (Object.is(r, -0) ? 0 : r).toFixed(2).replace(/\.?0+$/, "");
}

type Box = { x: number; y: number; w: number; h: number };

const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Places each point label in the corner around its point that collides least with the dashed guide
 * lines, the curves, the axes, other labels, and the plot edge. Earlier labels claim space first.
 */
function placeLabels(ex: SandboxExample) {
  const { px, py } = project(ex);
  const curvePts = ex.curves.flatMap((c) => {
    const [a, b] = c.domain ?? ex.x;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = a + ((b - a) * i) / 120;
      const y = c.fn(x);
      if (Number.isFinite(y)) out.push({ x: px(x), y: py(y) });
    }
    return out;
  });
  const guides: Box[] = [
    ...ex.vlines.map((l) => ({ x: px(l.x) - 3, y: 0, w: 6, h: H })),
    ...ex.hlines.map((l) => ({ x: 0, y: py(l.y) - 3, w: W, h: 6 })),
    { x: px(0) - 2, y: 0, w: 4, h: H },
    { x: 0, y: py(0) - 2, w: W, h: 4 },
  ];
  const taken: Box[] = [];
  return ex.points.map((p) => {
    const x = px(p.x);
    const y = py(p.y);
    const w = p.label.length * CHAR_W + 4;
    const h = LABEL_FONT + 4;
    const gap = 10;
    const options: (Box & { anchor: "start" | "end" })[] = [
      { x: x + gap, y: y - gap - h, w, h, anchor: "start" },
      { x: x + gap, y: y + gap, w, h, anchor: "start" },
      { x: x - gap - w, y: y - gap - h, w, h, anchor: "end" },
      { x: x - gap - w, y: y + gap, w, h, anchor: "end" },
    ];
    let best = options[0];
    let bestScore = Infinity;
    for (const o of options) {
      let score = 0;
      if (o.x < 2 || o.x + o.w > W - 2 || o.y < 2 || o.y + o.h > H - 2) score += 10_000;
      for (const g of guides) score += overlap(o, g) * 40;
      for (const t of taken) score += overlap(o, t) * 60;
      for (const c of curvePts) if (c.x >= o.x - 3 && c.x <= o.x + o.w + 3 && c.y >= o.y - 3 && c.y <= o.y + o.h + 3) score += 300;
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    }
    taken.push(best);
    return { tx: best.anchor === "start" ? best.x + 2 : best.x + best.w - 2, ty: best.y + h - 4, anchor: best.anchor };
  });
}

function Plot({ ex, focus, run }: { ex: SandboxExample; focus: Set<string>; run: number }) {
  const { px, py, ux } = project(ex);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hx, setHx] = useState<number | null>(null);
  const paths = useMemo(() => ex.curves.map((c) => ({ ...c, d: curvePath(ex, c.fn, c.domain) })), [ex]);
  const shade = useMemo(() => areaPath(ex), [ex]);
  const labels = useMemo(() => placeLabels(ex), [ex]);
  const lit = (id: string) => focus.size === 0 || focus.has(id);

  // The trace follows the first curve whose domain contains the pointer, like a calculator trace.
  const trace = useMemo(() => {
    if (hx === null) return null;
    for (const c of ex.curves) {
      const [a, b] = c.domain ?? ex.x;
      if (hx < a || hx > b) continue;
      const y = c.fn(hx);
      if (Number.isFinite(y) && y >= ex.y[0] && y <= ex.y[1]) return { x: hx, y, tone: c.tone };
    }
    return null;
  }, [hx, ex]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    setHx(ux(((e.clientX - r.left) / r.width) * W));
  };

  return (
    <svg
      ref={svgRef}
      key={run}
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full touch-none select-none"
      role="img"
      aria-label={`Graph for ${ex.topic}. Move the pointer across it to trace the curve.`}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => setHx(null)}
    >
      <defs>
        <clipPath id={`clip-${ex.id}`}>
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>
      {ticks(ex.x[0], ex.x[1]).map((v) => (
        <line key={`gx${v}`} x1={px(v)} x2={px(v)} y1={0} y2={H} stroke="var(--grid)" strokeWidth="1" />
      ))}
      {ticks(ex.y[0], ex.y[1]).map((v) => (
        <line key={`gy${v}`} y1={py(v)} y2={py(v)} x1={0} x2={W} stroke="var(--grid)" strokeWidth="1" />
      ))}
      <line x1={0} x2={W} y1={py(0)} y2={py(0)} stroke="var(--muted)" strokeOpacity="0.6" strokeWidth="1.2" />
      <line x1={px(0)} x2={px(0)} y1={0} y2={H} stroke="var(--muted)" strokeOpacity="0.6" strokeWidth="1.2" />

      <g clipPath={`url(#clip-${ex.id})`}>
        {shade && (
          <path d={shade} fill="var(--accent)" className="rise" style={{ opacity: lit(ex.area!.id) ? 0.16 : 0.07, transition: "opacity 240ms", animationDelay: "700ms" }} />
        )}
        {ex.vlines.map((l) => {
          const c = l.tone === "muted" ? "var(--muted)" : "var(--danger)";
          return (
            <g key={l.id} style={{ opacity: lit(l.id) ? 1 : 0.3, transition: "opacity 240ms" }}>
              <line x1={px(l.x)} x2={px(l.x)} y1={0} y2={H} stroke={c} strokeWidth="1.4" strokeDasharray="5 5" />
              <text x={px(l.x) + 6} y={16} fontFamily="var(--font-code)" fontSize="11" fill={c}>
                {l.label}
              </text>
            </g>
          );
        })}
        {ex.hlines.map((l) => {
          const c = l.tone === "highlight" ? "var(--highlight)" : l.tone === "accent" ? "var(--accent-ink)" : "var(--muted)";
          return (
            <g key={l.id} style={{ opacity: lit(l.id) ? 1 : 0.3, transition: "opacity 240ms" }}>
              <line x1={0} x2={W} y1={py(l.y)} y2={py(l.y)} stroke={c} strokeWidth="1.4" strokeDasharray="5 5" />
              <text x={W - 6} y={py(l.y) - 6} textAnchor="end" fontFamily="var(--font-code)" fontSize="11" fill={c}>
                {l.label}
              </text>
            </g>
          );
        })}
        {paths.map((c, i) => (
          <path
            key={c.id}
            d={c.d}
            pathLength={1}
            className="draw"
            style={{ animationDelay: `${100 + i * 300}ms`, opacity: lit(c.id) || c.tone === "accent" ? 1 : 0.35, transition: "opacity 240ms" }}
            fill="none"
            stroke={c.tone === "highlight" ? "var(--highlight)" : "var(--accent-ink)"}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>

      {ex.points.map((p, i) => {
        const x = px(p.x);
        const y = py(p.y);
        const l = labels[i];
        return (
          <g key={p.id} className="pop" style={{ animationDelay: `${900 + i * 110}ms`, opacity: lit(p.id) ? 1 : 0.35, transition: "opacity 240ms" }}>
            {focus.has(p.id) && <circle cx={x} cy={y} r="12" fill="var(--accent)" fillOpacity="0.14" />}
            <circle cx={x} cy={y} r="4.5" fill={p.kind === "hole" ? "var(--surface)" : "var(--text)"} stroke="var(--text)" strokeWidth={p.kind === "hole" ? 1.8 : 0} />
            <text x={l.tx} y={l.ty} textAnchor={l.anchor} fontFamily="var(--font-code)" fontSize={LABEL_FONT} fill="var(--text)" paintOrder="stroke" stroke="var(--surface)" strokeWidth="4" strokeLinejoin="round">
              {p.label}
            </text>
          </g>
        );
      })}

      {trace && (
        <g pointerEvents="none">
          <line x1={px(trace.x)} x2={px(trace.x)} y1={0} y2={H} stroke="var(--text)" strokeOpacity="0.18" strokeWidth="1" />
          <circle cx={px(trace.x)} cy={py(trace.y)} r="5.5" fill="var(--surface)" stroke={trace.tone === "highlight" ? "var(--highlight)" : "var(--accent-ink)"} strokeWidth="2.5" />
          <g transform={`translate(${Math.min(W - 118, Math.max(4, px(trace.x) + 10))} ${Math.max(6, Math.min(H - 30, py(trace.y) - 34))})`}>
            <rect width="112" height="24" rx="6" fill="var(--text)" />
            <text x="56" y="16" textAnchor="middle" fontFamily="var(--font-code)" fontSize="11.5" fill="var(--bg)">
              ({fmt(trace.x)}, {fmt(trace.y)})
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

/**
 * Landing-page worked example: pick a problem in the header, watch the KaTeX steps write out beside a
 * traceable curve, then tap any step to see it on the graph.
 */
export function EquationSandbox() {
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(0);
  const ex = SANDBOX[active];

  useEffect(() => {
    setRevealed(0);
    setSelected(null);
    const timers = ex.steps.map((_, i) => setTimeout(() => setRevealed(i + 1), 240 + i * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [ex, run]);

  const done = revealed >= ex.steps.length;
  const current = selected ?? (done ? null : revealed - 1);
  const focus = new Set(current !== null && current >= 0 ? (ex.steps[current]?.focus ?? []) : []);

  return (
    <div className="card-raised min-w-0 overflow-hidden">
      <div className="border-b border-line px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="tab-track grid min-w-0 flex-1 grid-cols-3" role="group" aria-label="Course">
            {COURSES.map((c) => {
              const first = SANDBOX.findIndex((e) => e.course === c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={ex.course === c}
                  onClick={() => {
                    if (ex.course === c) return;
                    setActive(first);
                    setRun((n) => n + 1);
                  }}
                  className={`tab justify-center px-2 text-[13px] whitespace-nowrap ${ex.course === c ? "tab-active" : ""}`}
                >
                  <span className="sm:hidden">{SHORT[c]}</span>
                  <span className="hidden sm:inline">{c}</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setRun((n) => n + 1)} className="btn-quiet btn-sm shrink-0 px-2.5" aria-label="Replay the worked solution">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-4" role="tablist" aria-label={`${ex.course} examples`}>
          {SANDBOX.map((e, i) =>
            e.course !== ex.course ? null : (
              <button
                key={e.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-controls="sandbox-panel"
                onClick={() => {
                  setActive(i);
                  setRun((n) => n + 1);
                }}
                className={`border-b-2 pb-1 text-sm transition-colors duration-150 ${i === active ? "border-text font-medium text-text" : "border-transparent text-muted hover:text-text"}`}
              >
                {e.tab}
              </button>
            ),
          )}
        </div>
      </div>

      <div id="sandbox-panel" role="tabpanel" aria-label={`${ex.topic}, ${ex.course}, worked by Billy`}>
        <div className="aspect-[56/34] w-full border-b border-line bg-surface">
          <Plot ex={ex} focus={focus} run={run * 10 + active} />
        </div>

        <div className="px-4 py-5 sm:px-6">
          <div key={`p${active}-${run}`} className="rise text-[1.12rem]">
            <MathBlock latex={ex.problemLatex} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] bg-surface-2 px-3.5 py-2.5 text-sm">
            <span className="font-medium text-muted">{ex.rule.name}</span>
            <MathInline latex={ex.rule.latex} />
          </div>

          <ol className="worksheet mt-4" aria-live="polite">
            {ex.steps.map((s, i) => {
              const shown = i < revealed;
              const isCurrent = current === i;
              return (
                <li key={`${active}-${run}-${i}`} className="ws-row" data-active={isCurrent} style={{ visibility: shown ? "visible" : "hidden" }}>
                  <span className="ws-num">
                    <span className="step-badge">{i + 1}</span>
                  </span>
                  <button
                    type="button"
                    disabled={!done}
                    onClick={() => setSelected(selected === i ? null : i)}
                    className={`${shown ? "rise" : ""} -mx-2 mb-0.5 block w-[calc(100%+1rem)] rounded-[10px] px-2 py-1.5 text-left transition-colors duration-200 ${
                      isCurrent ? "bg-accent/[0.07]" : done ? "hover:bg-surface-2" : ""
                    }`}
                  >
                    <span className="block text-[13px] text-muted">{s.note}</span>
                    <span className="block overflow-x-auto text-[0.95rem] [&_.katex-display]:my-0 [&_.katex-display]:py-0.5 [&_.katex-display]:text-left [&_.katex-display>.katex]:text-left">
                      <MathBlock as="span" latex={s.latex} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className={`mt-3 transition-[opacity,transform] duration-500 ${done ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0"}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border border-success/50 px-4 py-2.5">
              <span className="text-[13px] font-semibold text-success">Answer</span>
              <span className="min-w-0 overflow-x-auto text-[1.02rem]">
                <MathInline latex={ex.answerLatex} />
              </span>
            </div>
            <MathText text={ex.check} className="mt-2 text-base text-muted" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] text-muted">Tap a step to see it on the graph.</span>
              <Link href={ex.href} className="text-sm font-semibold text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent">
                {ex.href.startsWith("/studio") ? "See the full solution" : "Work it with Billy"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
