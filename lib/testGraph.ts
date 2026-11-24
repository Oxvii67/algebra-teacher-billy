import { evaluate } from "mathjs";
import { clean, fmt, niceStep, parseLine } from "@/lib/graph";
import type { TestCurve, TestGraph } from "@/lib/types";

/** Graph figures on practice tests: checks what the AI wrote before a student sees it, and samples it for drawing. */

const MAX_CURVES = 4;
const MAX_POINTS = 24;
const MAX_SPAN = 1000;
const DEFAULT_WINDOW = { xMin: -8, xMax: 8, yMin: -8, yMax: 8 };

export type Window = Pick<TestGraph, "xMin" | "xMax" | "yMin" | "yMax">;

interface CurveFn {
  /** Null for a vertical line. */
  fn: ((x: number) => number) | null;
  vertical: number | null;
}

/** Null when the expression cannot be drawn: a typo, a free parameter, an inequality. */
export function compileCurve(expression: string): CurveFn | null {
  const p = parseLine(expression);
  if (p.error || p.params.length) return null;
  if (p.vertical) {
    const x = p.vertical(0, {});
    return Number.isFinite(x) ? { fn: null, vertical: x } : null;
  }
  if (p.curves.length !== 1) return null;
  const f = p.curves[0].fn;
  return { fn: (x) => f(x, {}), vertical: null };
}

function inDomain(c: TestCurve, x: number): boolean {
  return (c.from === null || x >= c.from) && (c.to === null || x <= c.to);
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").trim();
  // Numbers and simple constants such as pi/2 or sqrt(3); a word or an infinity means no bound.
  if (!s || s.length > 30 || !/^(?:[\d.\s+\-*/()^]|pi|e|sqrt)+$/.test(s)) return null;
  try {
    const n = Number(evaluate(s));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function samples(c: TestCurve, w: Window, n = 240): { x: number; y: number }[] {
  const k = compileCurve(c.expression);
  if (!k?.fn) return [];
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const x = w.xMin + ((w.xMax - w.xMin) * i) / n;
    if (!inDomain(c, x)) continue;
    const y = k.fn(x);
    if (Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

const inView = (y: number, w: Window) => y >= w.yMin && y <= w.yMax;

function readWindow(raw: Record<string, unknown>): Window | null {
  const [xMin, xMax, yMin, yMax] = [raw.xMin, raw.xMax, raw.yMin, raw.yMax].map(toNumber);
  if (xMin === null || xMax === null || yMin === null || yMax === null) return null;
  const ok = (a: number, b: number) => b - a >= 0.5 && b - a <= MAX_SPAN;
  return ok(xMin, xMax) && ok(yMin, yMax) ? { xMin, xMax, yMin, yMax } : null;
}

/** Whether every curve shows up in the window well enough to be read. */
function readable(curves: TestCurve[], w: Window): boolean {
  return curves.every((c) => {
    const k = compileCurve(c.expression);
    if (!k) return false;
    if (k.vertical !== null) return k.vertical >= w.xMin && k.vertical <= w.xMax;
    return samples(c, w).filter((p) => inView(p.y, w)).length >= 8;
  });
}

/** A y range that shows the middle of every curve, for a window that misses them. */
function refit(curves: TestCurve[], points: { y: number }[], w: Window): Window {
  const ys = [...curves.flatMap((c) => samples(c, w).map((p) => p.y)), ...points.map((p) => p.y)].sort((a, b) => a - b);
  if (!ys.length) return w;
  const lo = Math.min(0, ys[Math.floor(ys.length * 0.05)]);
  const hi = Math.max(0, ys[Math.ceil(ys.length * 0.95) - 1]);
  const pad = Math.max(1, (hi - lo) * 0.1);
  return { ...w, yMin: Math.floor(lo - pad), yMax: Math.ceil(hi + pad) };
}

type Checked = { status: "none" | "bad" } | { status: "ok"; graph: TestGraph };

/** "none" is a question with no figure. "bad" is a figure that cannot be trusted, so neither can its question. */
export function checkGraph(value: unknown): Checked {
  if (!value || typeof value !== "object") return { status: "none" };
  const raw = value as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]) : []);
  const curves: TestCurve[] = list(raw.curves).map((c) => ({
    expression: String(c.expression ?? "").slice(0, 200).trim(),
    label: String(c.label ?? "").slice(0, 40).trim(),
    from: toNumber(c.from),
    to: toNumber(c.to),
  }));
  const points = list(raw.points).map((p) => ({ x: toNumber(p.x), y: toNumber(p.y), open: p.open === true }));
  if (!curves.length && !points.length) return { status: "none" };
  if (curves.length > MAX_CURVES || points.length > MAX_POINTS) return { status: "bad" };
  if (curves.some((c) => !compileCurve(c.expression) || (c.from !== null && c.to !== null && c.from >= c.to))) return { status: "bad" };
  if (points.some((p) => p.x === null || p.y === null)) return { status: "bad" };
  const pts = points as TestGraph["points"];

  let w = readWindow(raw) ?? DEFAULT_WINDOW;
  if (!readable(curves, w)) w = refit(curves, pts, w);
  if (!readable(curves, w)) return { status: "bad" };
  for (const p of pts) {
    if (p.x < w.xMin || p.x > w.xMax) return { status: "bad" };
    w = { ...w, yMin: Math.min(w.yMin, Math.floor(p.y - 1)), yMax: Math.max(w.yMax, Math.ceil(p.y + 1)) };
  }
  // An open circle marks where a curve breaks off, so it has to sit on one.
  const tol = (w.yMax - w.yMin) * 0.02;
  const onCurve = (x: number, y: number) =>
    curves.some((c) => {
      const f = compileCurve(c.expression)?.fn;
      const d = 1e-5;
      return !!f && [x - d, x, x + d].some((t) => inDomain(c, t) && Math.abs(f(t) - y) <= tol);
    });
  if (curves.length && pts.some((p) => p.open && !onCurve(p.x, p.y))) return { status: "bad" };
  // A bound at or past the window is the window's edge, not an end of the curve.
  const drawn = curves.map((c) => ({ ...c, from: c.from !== null && c.from <= w.xMin ? null : c.from, to: c.to !== null && c.to >= w.xMax ? null : c.to }));
  return { status: "ok", graph: { curves: drawn, points: pts, ...w } };
}

/** Four answer choices that are graphs, in one shared window so only the shapes differ. Null if any cannot be used. */
export function checkChoiceGraphs(expressions: unknown, window: unknown): TestGraph[] | null {
  const list = Array.isArray(expressions) ? expressions.map((e) => String(e ?? "").slice(0, 200).trim()) : [];
  if (list.length !== 4) return null;
  const w = readWindow((window ?? {}) as Record<string, unknown>) ?? DEFAULT_WINDOW;
  const graphs = list.map((expression): TestGraph => ({ curves: [{ expression, label: "", from: null, to: null }], points: [], ...w }));
  if (!graphs.every((g) => readable(g.curves, w))) return null;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (sameCurve(graphs[i].curves[0], graphs[j].curves[0], w)) return null;
  return graphs;
}

/** Two choices a student could not tell apart. */
function sameCurve(a: TestCurve, b: TestCurve, w: Window): boolean {
  const ka = compileCurve(a.expression);
  const kb = compileCurve(b.expression);
  if (!ka || !kb) return true;
  if (!ka.fn || !kb.fn) return !ka.fn && !kb.fn && Math.abs(ka.vertical! - kb.vertical!) < (w.xMax - w.xMin) * 0.03;
  const tol = (w.yMax - w.yMin) * 0.03;
  for (let i = 0; i <= 60; i++) {
    const x = w.xMin + ((w.xMax - w.xMin) * i) / 60;
    const ya = ka.fn(x);
    const yb = kb.fn(x);
    const va = Number.isFinite(ya) && inView(ya, w);
    const vb = Number.isFinite(yb) && inView(yb, w);
    if (va !== vb || (va && vb && Math.abs(ya - yb) > tol)) return false;
  }
  return true;
}

/** Wording that only makes sense next to a figure. */
export function mentionsFigure(instructions: string): boolean {
  return (
    /\b(?:graphs?|curves?|figures?|diagrams?|plots?)\b[^.?!]{0,40}\b(?:shown|pictured|displayed)\b/i.test(instructions) ||
    /\b(?:graphs?|figures?|diagrams?|plots?) (?:below|above)\b(?! (?:the|\$))/i.test(instructions) ||
    /\b(?:shown|pictured|displayed)\b[^.?!]{0,30}\b(?:graph|curve|figure|diagram|plot)/i.test(instructions) ||
    /\b(?:which (?:of (?:the|these) (?:following )?)?graphs?|use the graph|from the graph|based on the graph)\b/i.test(instructions)
  );
}

/** What the student saw, in words, for Billy's answer review. */
export function describeGraph(g: TestGraph): string {
  const curves = g.curves.map((c) => {
    const range = c.from === null && c.to === null ? "" : ` for x from ${c.from === null ? "-infinity" : fmt(c.from)} to ${c.to === null ? "infinity" : fmt(c.to)}`;
    return `${c.label ? `${c.label}: ` : ""}${c.expression}${range}`;
  });
  const points = g.points.map((p) => `${p.open ? "open" : "closed"} point (${fmt(p.x)}, ${fmt(p.y)})`);
  return [...curves, ...points].join("; ").slice(0, 1200);
}

export interface Tick {
  v: number;
  label: string;
}

/** Grid lines at round numbers, or at multiples of pi/2 when the window is set in pi. */
export function ticks(min: number, max: number): Tick[] {
  const half = Math.PI / 2;
  const inPi = [min, max].every((v) => Math.abs(v / half - Math.round(v / half)) < 0.005) && [min, max].some((v) => Math.abs(v) > 0.1);
  const base = inPi ? half : 1;
  const span = (max - min) / base;
  const step = inPi ? base * Math.max(1, Math.ceil(span / 12)) : niceStep(span / 11);
  const out: Tick[] = [];
  for (let i = Math.ceil(min / step - 1e-9); i * step <= max + 1e-9; i++) out.push({ v: clean(i * step), label: inPi ? piLabel(Math.round((i * step) / half)) : fmt(i * step) });
  return out;
}

/** halves counts multiples of pi/2. */
function piLabel(halves: number): string {
  if (halves === 0) return "0";
  const sign = halves < 0 ? "-" : "";
  const n = Math.abs(halves);
  if (n % 2 === 0) return `${sign}${n === 2 ? "" : n / 2}π`;
  return `${sign}${n === 1 ? "" : n}π/2`;
}

/**
 * Screen-space path of a curve. The pen lifts where the function is undefined and at jumps and
 * asymptotes, which are found by narrowing in on any steep stretch to see whether it stays steep.
 */
export function curvePath(c: TestCurve, g: Window, px: (x: number) => number, py: (y: number) => number, height: number): string {
  const k = compileCurve(c.expression);
  if (!k) return "";
  if (k.vertical !== null) return `M${px(k.vertical).toFixed(2)} ${py(g.yMin).toFixed(2)}V${py(g.yMax).toFixed(2)}`;
  const f = k.fn!;
  const a = Math.max(g.xMin, c.from ?? -Infinity);
  const b = Math.min(g.xMax, c.to ?? Infinity);
  if (!(b > a)) return "";
  const far = (y: number) => Math.max(-2 * height, Math.min(3 * height, py(y)));
  const broken = (x0: number, x1: number): boolean => {
    for (let i = 0; i < 30; i++) {
      const m = (x0 + x1) / 2;
      const [y0, ym, y1] = [f(x0), f(m), f(x1)];
      if (![y0, ym, y1].every(Number.isFinite)) return true;
      if (Math.abs(py(ym) - py(y0)) > Math.abs(py(y1) - py(ym))) x1 = m;
      else x0 = m;
    }
    return Math.abs(py(f(x1)) - py(f(x0))) > 4;
  };
  const N = 400;
  let d = "";
  let prev: { x: number; y: number } | null = null;
  for (let i = 0; i <= N; i++) {
    const x = a + ((b - a) * i) / N;
    const y = f(x);
    if (!Number.isFinite(y)) {
      prev = null;
      continue;
    }
    const lift = !prev || (Math.abs(py(y) - py(prev.y)) > 6 && broken(prev.x, x));
    d += `${lift ? "M" : "L"}${px(x).toFixed(2)} ${far(y).toFixed(2)}`;
    prev = { x, y };
  }
  return d;
}

/** The curve's height at each labeled x, for students who cannot see the figure. */
export function valueTable(g: TestGraph): { x: string; ys: string[] }[] {
  const fns = g.curves.map((c) => ({ c, f: compileCurve(c.expression)?.fn ?? null }));
  return ticks(g.xMin, g.xMax).map((t) => ({
    x: t.label,
    ys: fns.map(({ c, f }) => {
      const y = f && inDomain(c, t.v) ? f(t.v) : NaN;
      return Number.isFinite(y) ? (inView(y, g) ? fmt(Math.round(y * 100) / 100) : "off the graph") : "not defined";
    }),
  }));
}
