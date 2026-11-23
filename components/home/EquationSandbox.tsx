"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { MathBlock, MathInline, MathText } from "@/components/math/Math";
import { SANDBOX, type SandboxExample } from "@/lib/sandbox";

const STEP_MS = 520;
const W = 420;
const H = 300;

function project(ex: SandboxExample) {
  const [x0, x1] = ex.x;
  const [y0, y1] = ex.y;
  return {
    px: (x: number) => ((x - x0) / (x1 - x0)) * W,
    py: (y: number) => H - ((y - y0) / (y1 - y0)) * H,
  };
}

function curvePath(ex: SandboxExample, fn: (x: number) => number, domain?: [number, number]) {
  const { px, py } = project(ex);
  const [a, b] = domain ?? ex.x;
  const n = 220;
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

function ticks(lo: number, hi: number) {
  const span = hi - lo;
  const step = span > 12 ? 2 : 1;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) if (v !== 0) out.push(v);
  return out;
}

function Plot({ ex, focus, run }: { ex: SandboxExample; focus: Set<string>; run: number }) {
  const { px, py } = project(ex);
  const paths = useMemo(() => ex.curves.map((c) => ({ ...c, d: curvePath(ex, c.fn, c.domain) })), [ex]);
  const lit = (id: string) => focus.size === 0 || focus.has(id);
  const ox = px(0);
  const oy = py(0);

  return (
    <svg key={run} viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Graph for ${ex.topic}`}>
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
      <line x1={0} x2={W} y1={oy} y2={oy} stroke="var(--muted)" strokeOpacity="0.55" strokeWidth="1.2" />
      <line x1={ox} x2={ox} y1={0} y2={H} stroke="var(--muted)" strokeOpacity="0.55" strokeWidth="1.2" />

      <g clipPath={`url(#clip-${ex.id})`}>
        {ex.vlines.map((l) => (
          <g key={l.id} style={{ opacity: lit(l.id) ? 1 : 0.3, transition: "opacity 240ms" }}>
            <line x1={px(l.x)} x2={px(l.x)} y1={0} y2={H} stroke="var(--danger)" strokeWidth="1.4" strokeDasharray="5 5" />
            <text x={px(l.x) + 6} y={16} className="font-mono" fontSize="11" fill="var(--danger)">
              {l.label}
            </text>
          </g>
        ))}
        {ex.hlines.map((l) => {
          const c = l.tone === "highlight" ? "var(--highlight)" : l.tone === "accent" ? "var(--accent)" : "var(--muted)";
          return (
            <g key={l.id} style={{ opacity: lit(l.id) ? 1 : 0.3, transition: "opacity 240ms" }}>
              <line x1={0} x2={W} y1={py(l.y)} y2={py(l.y)} stroke={c} strokeWidth="1.4" strokeDasharray="5 5" />
              <text x={W - 6} y={py(l.y) - 6} textAnchor="end" className="font-mono" fontSize="11" fill={c}>
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
            style={{ animationDelay: `${120 + i * 260}ms` }}
            fill="none"
            stroke={c.tone === "highlight" ? "var(--highlight)" : "var(--accent)"}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>

      {ex.points.map((p, i) => {
        const on = lit(p.id);
        const x = px(p.x);
        const y = py(p.y);
        const right = x < W - 70;
        return (
          <g key={p.id} className="pop" style={{ animationDelay: `${900 + i * 120}ms`, opacity: on ? 1 : 0.35, transition: "opacity 240ms" }}>
            {focus.has(p.id) && <circle cx={x} cy={y} r="11" fill="var(--accent)" fillOpacity="0.14" />}
            <circle
              cx={x}
              cy={y}
              r="4.5"
              fill={p.kind === "hole" ? "var(--surface)" : "var(--text)"}
              stroke="var(--text)"
              strokeWidth={p.kind === "hole" ? 1.8 : 0}
            />
            <text x={right ? x + 9 : x - 9} y={y - 9} textAnchor={right ? "start" : "end"} className="font-mono" fontSize="11" fill="var(--text)">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Landing-page centerpiece: pick a real Algebra 2 problem and watch it get worked and graphed. */
export function EquationSandbox() {
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(0);
  const ex = SANDBOX[active];

  useEffect(() => {
    setRevealed(0);
    setSelected(null);
    const timers = ex.steps.map((_, i) => setTimeout(() => setRevealed(i + 1), 260 + i * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [ex, run]);

  const done = revealed >= ex.steps.length;
  const current = selected ?? (done ? null : revealed - 1);
  const focus = new Set(current !== null && current >= 0 ? ex.steps[current]?.focus ?? [] : []);

  return (
    <div className="card-raised overflow-hidden">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="tab-track" role="tablist" aria-label="Example problems">
          {SANDBOX.map((e, i) => (
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
              className={`tab ${i === active ? "tab-active" : ""}`}
            >
              {e.tab}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setRun((n) => n + 1)} className="btn-quiet btn-sm ml-auto" aria-label="Replay the worked solution">
          <RotateCcw className="h-3.5 w-3.5" /> Replay
        </button>
      </div>

      <div id="sandbox-panel" role="tabpanel" className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Worked steps */}
        <div className="min-w-0 border-line px-4 py-5 sm:px-6 lg:border-r">
          <div className="eyebrow">{ex.topic}</div>
          <div key={`p${active}-${run}`} className="rise mt-1 text-[1.15rem]">
            <MathBlock latex={ex.problemLatex} />
          </div>

          <div className="callout mt-2 text-sm" style={{ ["--rule" as string]: "var(--highlight)" }}>
            <span className="eyebrow mr-2" style={{ color: "var(--highlight)" }}>
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
                  <span className="ws-num">{String(i + 1).padStart(2, "0")}</span>
                  <button
                    type="button"
                    disabled={!done}
                    onClick={() => setSelected(selected === i ? null : i)}
                    className={`${shown ? "rise" : ""} -mx-2 mb-0.5 block w-[calc(100%+1rem)] rounded-[10px] px-2 py-1.5 text-left transition-colors duration-200 ${
                      isCurrent ? "bg-accent/[0.07]" : done ? "hover:bg-surface-2" : ""
                    }`}
                  >
                    <span className="block text-[13px] text-muted">{s.note}</span>
                    <span className="block text-[0.95rem] [&_.katex-display]:my-0 [&_.katex-display]:py-0.5 [&_.katex-display]:text-left [&_.katex-display>.katex]:text-left">
                      <MathBlock latex={s.latex} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className={`mt-3 transition-[opacity,transform] duration-500 ${done ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0"}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[12px] border border-text/80 px-4 py-2">
              <span className="eyebrow text-text">Answer</span>
              <span className="text-[1.02rem]">
                <MathInline latex={ex.answerLatex} />
              </span>
            </div>
            <MathText text={ex.check} className="mt-2 text-[13px] text-muted" />
          </div>
        </div>

        {/* Live curve */}
        <div className="flex min-w-0 flex-col bg-bg/60 px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Live graph</span>
            <span className="text-[12px] text-muted">{done ? "Tap a step to see it on the curve" : "Working"}</span>
          </div>
          <div className="mt-3 aspect-[7/5] w-full overflow-hidden rounded-[12px] border border-line bg-surface">
            <Plot ex={ex} focus={focus} run={run * 10 + active} />
          </div>
          <Link href={ex.studioHref} className="group mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-accent">
            Open the full lesson
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
