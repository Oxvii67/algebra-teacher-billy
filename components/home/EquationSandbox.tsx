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

function Plot({ ex, focus, run }: { ex: SandboxExample; focus: Set<string>; run: number }) {
  const { px, py, ux } = project(ex);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hx, setHx] = useState<number | null>(null);
  const paths = useMemo(() => ex.curves.map((c) => ({ ...c, d: curvePath(ex, c.fn, c.domain) })), [ex]);
  const shade = useMemo(() => areaPath(ex), [ex]);
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
          const c = l.tone === "highlight" ? "var(--highlight)" : l.tone === "accent" ? "var(--accent)" : "var(--muted)";
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
            stroke={c.tone === "highlight" ? "var(--highlight)" : "var(--accent)"}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>

      {ex.points.map((p, i) => {
        const x = px(p.x);
        const y = py(p.y);
        const right = x < W - 80;
        return (
          <g key={p.id} className="pop" style={{ animationDelay: `${900 + i * 110}ms`, opacity: lit(p.id) ? 1 : 0.35, transition: "opacity 240ms" }}>
            {focus.has(p.id) && <circle cx={x} cy={y} r="12" fill="var(--accent)" fillOpacity="0.14" />}
            <circle cx={x} cy={y} r="4.5" fill={p.kind === "hole" ? "var(--surface)" : "var(--text)"} stroke="var(--text)" strokeWidth={p.kind === "hole" ? 1.8 : 0} />
            <text x={right ? x + 9 : x - 9} y={y - 9} textAnchor={right ? "start" : "end"} fontFamily="var(--font-code)" fontSize="11.5" fill="var(--text)">
              {p.label}
            </text>
          </g>
        );
      })}

      {trace && (
        <g pointerEvents="none">
          <line x1={px(trace.x)} x2={px(trace.x)} y1={0} y2={H} stroke="var(--text)" strokeOpacity="0.18" strokeWidth="1" />
          <circle cx={px(trace.x)} cy={py(trace.y)} r="5.5" fill="var(--surface)" stroke={trace.tone === "highlight" ? "var(--highlight)" : "var(--accent)"} strokeWidth="2.5" />
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
 * Landing-page hero. The left column carries the pitch and one-click samples grouped by course;
 * the right column is a live worksheet: KaTeX steps written out one by one beside a traceable curve.
 */
export function EquationSandbox({ intro }: { intro: React.ReactNode }) {
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
    <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      <div className="min-w-0 lg:sticky lg:top-24">
        {intro}
        <div className="mt-9" role="tablist" aria-label="Sample problems">
          <p className="text-sm font-semibold">Watch Billy work one</p>
          <div className="mt-3 space-y-3">
            {COURSES.map((c) => (
              <div key={c} className="grid items-baseline gap-2 border-t border-line pt-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
                <span className="text-[13px] text-muted">{c}</span>
                <div className="flex flex-wrap gap-1.5">
                  {SANDBOX.map((e, i) =>
                    e.course !== c ? null : (
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
                        className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-[background-color,border-color,color] duration-150 ${
                          i === active ? "border-text bg-text text-bg" : "border-line bg-surface hover:border-text/40"
                        }`}
                      >
                        {e.tab}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="sandbox-panel" role="tabpanel" aria-label={`${ex.tab}, worked by Billy`} className="card-raised min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span className="text-sm font-semibold">{ex.topic}</span>
          <span className="text-[13px] text-muted">{ex.course}</span>
          <button type="button" onClick={() => setRun((n) => n + 1)} className="btn-quiet btn-sm ml-auto" aria-label="Replay the worked solution">
            <RotateCcw className="h-3.5 w-3.5" /> Replay
          </button>
        </div>

        <div className="aspect-[56/34] w-full border-b border-line bg-surface">
          <Plot ex={ex} focus={focus} run={run * 10 + active} />
        </div>

        <div className="px-4 py-5 sm:px-6">
          <div key={`p${active}-${run}`} className="rise text-[1.12rem]">
            <MathBlock latex={ex.problemLatex} />
          </div>
          <div className="callout mt-1 text-sm" style={{ ["--rule" as string]: "var(--highlight)" }}>
            <span className="mr-2 font-semibold" style={{ color: "var(--highlight)" }}>
              {ex.rule.name}
            </span>
            <MathInline latex={ex.rule.latex} />
          </div>

          <ol className="worksheet mt-4" aria-live="polite">
            {ex.steps.map((s, i) => {
              const shown = i < revealed;
              const isCurrent = current === i;
              return (
                <li key={`${active}-${run}-${i}`} className="ws-row" data-active={isCurrent} style={{ visibility: shown ? "visible" : "hidden" }}>
                  <span className="ws-num">{i + 1}</span>
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
                      <MathBlock latex={s.latex} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className={`mt-3 transition-[opacity,transform] duration-500 ${done ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0"}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[12px] border border-text/70 px-4 py-2">
              <span className="text-[13px] font-semibold">Answer</span>
              <span className="min-w-0 overflow-x-auto text-[1.02rem]">
                <MathInline latex={ex.answerLatex} />
              </span>
            </div>
            <MathText text={ex.check} className="mt-2 text-[13px] text-muted" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] text-muted">Tap a step to find it on the graph. Drag across the graph to trace it.</span>
              <Link href={ex.href} className="text-sm font-semibold text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent">
                {ex.href.startsWith("/studio") ? "Open the full lesson" : "Work through it with Billy"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
