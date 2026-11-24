import { parse } from "mathjs";
import { answersMatch } from "@/lib/grade";
import { findPois, fmt, niceStep } from "@/lib/graph";
import { graphableSides, graphOfLatex } from "@/lib/latexExpr";
import { checkChoiceGraphs, checkGraph, compileCurve, type Window } from "@/lib/testGraph";
import type { SolutionStep, TestGraph, TestQuestion } from "@/lib/types";

/**
 * Graph questions. The AI picks the functions and what to ask; the wording, the answer key and the
 * worked solution are computed here from the curve that is drawn, so the key always matches the
 * figure. A question whose answer cannot be read off the grid is dropped.
 */

export const FIGURE_TASKS = [
  "none",
  "value",
  "limit",
  "left_limit",
  "right_limit",
  "x_intercepts",
  "y_intercept",
  "maximum",
  "minimum",
  "increasing",
  "decreasing",
  "intersections",
  "hole",
  "domain",
  "range",
  "vertical_asymptotes",
  "horizontal_asymptote",
  "average_rate",
  "amplitude",
  "period",
] as const;
export type FigureTask = (typeof FIGURE_TASKS)[number];

type Written = Pick<TestQuestion, "promptLatex" | "instructions" | "type" | "choices" | "answer" | "answerLatex" | "solution" | "graph" | "choiceGraphs">;

interface Piece {
  fn: (x: number) => number;
  from: number;
  to: number;
  fromClosed: boolean;
  toClosed: boolean;
  hole: number | null;
}

const EPS = 1e-7;
const FAR = 1e4;

// Numbers -----------------------------------------------------------------------------------------

/** "3/2" for the key and \frac{3}{2} for display; multiples of pi when the axis is in pi. */
function num(v: number): { key: string; tex: string } {
  if (Math.abs(v) < 1e-9) return { key: "0", tex: "0" };
  const ratio = (x: number): [number, number] | null => {
    for (let q = 1; q <= 24; q++) if (Math.abs(x * q - Math.round(x * q)) < 1e-6) return [Math.round(x * q), q];
    return null;
  };
  const plain = ratio(v);
  if (plain) {
    const [p, q] = plain;
    return q === 1 ? { key: String(p), tex: String(p) } : { key: `${p}/${q}`, tex: `${p < 0 ? "-" : ""}\\frac{${Math.abs(p)}}{${q}}` };
  }
  const r = ratio(v / Math.PI);
  if (r) {
    const [p, q] = r;
    const a = Math.abs(p);
    const top = `${a === 1 ? "" : a}\\pi`;
    return { key: `${p}*pi${q === 1 ? "" : `/${q}`}`, tex: `${p < 0 ? "-" : ""}${q === 1 ? top : `\\frac{${top}}{${q}}`}` };
  }
  return { key: String(v), tex: fmt(v) };
}

const list = (vs: number[]) => ({ key: vs.map((v) => num(v).key).join(", "), tex: vs.map((v) => num(v).tex).join(", ") });
const point = (x: number, y: number) => ({ key: `(${num(x).key}, ${num(y).key})`, tex: `(${num(x).tex}, ${num(y).tex})` });

interface Interval {
  lo: number;
  hi: number;
  loClosed: boolean;
  hiClosed: boolean;
}

function intervals(list: Interval[]): { key: string; tex: string } {
  const end = (v: number) => (v === Infinity ? { key: "inf", tex: "\\infty" } : v === -Infinity ? { key: "-inf", tex: "-\\infty" } : num(v));
  const one = (i: Interval, f: "key" | "tex") => `${i.loClosed ? "[" : "("}${end(i.lo)[f]}, ${end(i.hi)[f]}${i.hiClosed ? "]" : ")"}`;
  return { key: list.map((i) => one(i, "key")).join(", "), tex: list.map((i) => one(i, "tex")).join(" \\cup ") };
}

// A function as drawn ------------------------------------------------------------------------------

class Drawn {
  readonly xStep: number;
  readonly yStep: number;
  readonly inPi: boolean;
  constructor(
    readonly pieces: Piece[],
    readonly w: Window,
  ) {
    const half = Math.PI / 2;
    this.inPi = [w.xMin, w.xMax].every((v) => Math.abs(v / half - Math.round(v / half)) < 0.005) && Math.abs(w.xMax) > 0.1;
    this.xStep = this.inPi ? half : niceStep((w.xMax - w.xMin) / 11);
    this.yStep = niceStep((w.yMax - w.yMin) / 11);
  }

  at(x: number): number {
    for (const p of this.pieces) {
      if (p.hole !== null && Math.abs(x - p.hole) < 1e-10) continue;
      const inside = (x > p.from || (p.fromClosed && x === p.from)) && (x < p.to || (p.toClosed && x === p.to));
      if (!inside) continue;
      const y = p.fn(x);
      if (Number.isFinite(y)) return y;
    }
    return NaN;
  }

  /** One-sided limit: a number, or NaN when the curve is missing or runs off on that side. */
  side(x: number, dir: -1 | 1): number {
    const near = this.at(x + dir * EPS);
    const nearer = this.at(x + dir * EPS * 0.01);
    return Number.isFinite(near) && Math.abs(near - nearer) < 1e-3 * Math.max(1, Math.abs(near)) ? near : NaN;
  }

  /** Grows without bound on one side of x. */
  blowsUp(x: number): boolean {
    return ([-1, 1] as const).some((d) => {
      const a = Math.abs(this.at(x + d * 1e-5));
      const b = Math.abs(this.at(x + d * 1e-11));
      return Number.isFinite(a) && (b === Infinity || b > a + 5);
    });
  }

  /** The grid value v is read as, or null when a student could not read it. Half squares are readable. */
  snapX(v: number): number | null {
    return snap(v, this.xStep / 2);
  }
  snapY(v: number): number | null {
    return snap(v, this.yStep / 2) ?? snap(v, 0.5);
  }
  sees(x: number, y: number): boolean {
    const { xMin, xMax, yMin, yMax } = this.w;
    return x >= xMin && x <= xMax && y >= yMin && y <= yMax;
  }

  roots(from = this.w.xMin, to = this.w.xMax): number[] {
    const f = (x: number) => this.at(x);
    const found = findPois([{ fn: f, color: "" }], from, to, this.w.yMax - this.w.yMin).filter((p) => p.kind === "root" && Math.abs(p.x - to) > 1e-9);
    const xs = found.map((p) => p.x);
    for (const p of this.pieces) for (const e of [p.from, p.to]) if (Number.isFinite(e) && Math.abs(f(e)) < 1e-9) xs.push(e);
    if (Math.abs(f(to)) < 1e-9) xs.push(to);
    return xs.sort((a, b) => a - b).filter((x, i, all) => !i || x - all[i - 1] > 1e-4);
  }

  turning(from = this.w.xMin, to = this.w.xMax) {
    return findPois([{ fn: (x) => this.at(x), color: "" }], from, to, this.w.yMax - this.w.yMin)
      .filter((p) => p.kind === "max" || p.kind === "min")
      .sort((a, b) => a.x - b.x);
  }

  /** Where the curve stops, starts, jumps or is missing a point, strictly inside the window. */
  breaks(): number[] {
    const { xMin, xMax } = this.w;
    const n = 1600;
    const out = new Set<number>();
    const add = (x: number) => x > xMin + 1e-9 && x < xMax - 1e-9 && out.add(Number(x.toFixed(6)));
    for (const p of this.pieces) {
      if (Number.isFinite(p.from)) add(p.from);
      if (Number.isFinite(p.to)) add(p.to);
      if (p.hole !== null) add(p.hole);
    }
    // The odd offset keeps samples off the round numbers where functions break.
    const at = (i: number) => xMin + ((xMax - xMin) * (i + 0.137)) / n;
    for (let i = 0; i < n; i++) {
      let [a, b] = [at(i), at(i + 1)];
      if (b > xMax) break;
      const [fa, fb] = [this.at(a), this.at(b)];
      const defined = Number.isFinite(fa);
      if (defined === Number.isFinite(fb)) {
        const steep = defined && Math.abs(fb - fa) > (this.w.yMax - this.w.yMin) / 20;
        if (!steep) continue;
        for (let k = 0; k < 50; k++) {
          const m = (a + b) / 2;
          const fm = this.at(m);
          if (!Number.isFinite(fm)) {
            a = b = m;
            break;
          }
          if (Math.abs(fm - this.at(a)) > Math.abs(this.at(b) - fm)) b = m;
          else a = m;
        }
        const jump = Math.abs(this.at(b) - this.at(a));
        // Relative too, so rounding in very large values is not read as a jump.
        if (a === b || jump > Math.max(this.yStep / 4, 1e-3 * Math.abs(this.at(a)))) add(snap(a, 0.25) ?? a);
      } else {
        for (let k = 0; k < 50; k++) {
          const m = (a + b) / 2;
          if (Number.isFinite(this.at(m)) === defined) a = m;
          else b = m;
        }
        add(snap(a, 0.25) ?? a);
      }
    }
    // Even-sided spikes such as 1/x^2 are never steep enough between two samples to show above.
    for (let x = Math.ceil(xMin * 4) / 4; x < xMax; x += 0.25) if (!Number.isFinite(this.at(x)) && (Number.isFinite(this.at(x - 1e-4)) || Number.isFinite(this.at(x + 1e-4)))) add(x);
    const sorted = [...out].sort((a, b) => a - b);
    return sorted.filter((x, i) => !i || x - sorted[i - 1] > 1e-3);
  }

  /** True when nothing interrupts the curve from one side of the window to the other, and it carries on past both. */
  smoothEverywhere(): boolean {
    const { xMin, xMax } = this.w;
    return this.pieces.length === 1 && this.pieces[0].from === -Infinity && this.pieces[0].to === Infinity && [xMin, xMax].every((x) => Number.isFinite(this.at(x))) && !this.breaks().length && !this.breaksOutside();
  }

  /** Nothing of the same kind is hiding outside the window. */
  wide(): [number, number] {
    const span = this.w.xMax - this.w.xMin;
    return [this.w.xMin - 4 * span, this.w.xMax + 4 * span];
  }

  /** Breaks beyond the grid, such as the next asymptotes of tan(x), which the student cannot see. */
  breaksOutside(): boolean {
    const [xMin, xMax] = this.wide();
    return new Drawn(this.pieces, { ...this.w, xMin, xMax }).breaks().some((x) => x < this.w.xMin - 1e-6 || x > this.w.xMax + 1e-6);
  }

  rootsOutside(): boolean {
    const [lo, hi] = this.wide();
    return this.roots(lo, hi).some((x) => x < this.w.xMin - 1e-6 || x > this.w.xMax + 1e-6);
  }

  /** On the graph at x, rather than at an asymptote that rounding made finite. */
  has(x: number): boolean {
    return Math.abs(this.at(x)) < 1e6;
  }

  /** Repeating waves: every peak the same height, every trough the same depth. */
  wave(): { max: number; min: number; period: number } | null {
    const t = this.turning();
    if (t.length < 3 || !this.smoothEverywhere()) return null;
    const hi = t.filter((p) => p.kind === "max");
    const lo = t.filter((p) => p.kind === "min");
    if (!hi.length || !lo.length) return null;
    const same = (vs: number[]) => Math.max(...vs) - Math.min(...vs) < 1e-5;
    const gaps = t.slice(1).map((p, i) => p.x - t[i].x);
    if (!same(hi.map((p) => p.y)) || !same(lo.map((p) => p.y)) || Math.max(...gaps) - Math.min(...gaps) > 1e-3) return null;
    return { max: hi[0].y, min: lo[0].y, period: 2 * gaps[0] };
  }
}

function snap(v: number, step: number): number | null {
  const r = Math.round(v / step) * step;
  return Math.abs(r - v) < 2e-4 ? Number(r.toFixed(9)) : null;
}

// Reading the AI's request --------------------------------------------------------------------------

function textOf(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

function bound(v: unknown): number | null {
  const s = textOf(v);
  const k = s ? compileCurve(s.replace(/[^0-9.+\-*/()piesqrt^ ]/g, "")) : null;
  const n = k?.fn ? k.fn(0) : NaN;
  return /[a-z]/i.test(s.replace(/pi|sqrt|e/g, "")) || !Number.isFinite(n) ? null : n;
}

interface Figure {
  graph: TestGraph;
  groups: { name: string; drawn: Drawn }[];
}

function readFigure(raw: Record<string, unknown>): Figure | null {
  const curves = (Array.isArray(raw.curves) ? raw.curves : []).filter((c): c is Record<string, unknown> => !!c && typeof c === "object");
  if (!curves.length) return null;
  // One letter per function; the AI's label decides only which pieces belong together.
  const labels = [...new Set(curves.map((c) => textOf(c.label)))];
  if (labels.length > 2) return null;
  const names = labels.length === 2 ? ["f", "g"] : ["f"];
  const named = curves.map((c) => ({ ...c, label: `${names[labels.indexOf(textOf(c.label))]}(x)` }));
  const checked = checkGraph({ ...raw, curves: named, points: [] });
  if (checked.status !== "ok") return null;
  const graph = checked.graph;

  const pieces: { name: string; piece: Piece }[] = [];
  for (let i = 0; i < graph.curves.length; i++) {
    const c = graph.curves[i];
    const fn = compileCurve(c.expression)?.fn;
    if (!fn) return null;
    const src = curves[i];
    const hole = bound(src.hole);
    pieces.push({
      name: c.label[0],
      piece: { fn, from: c.from ?? -Infinity, to: c.to ?? Infinity, fromClosed: src.fromClosed === true && c.from !== null, toClosed: src.toClosed === true && c.to !== null, hole },
    });
  }
  // A natural hole such as (x^2 - 4)/(x - 2), in case it was not declared.
  for (const { piece: p } of pieces) {
    if (p.hole !== null) continue;
    const gaps: number[] = [];
    for (let x = Math.ceil(graph.xMin * 2) / 2; x <= graph.xMax; x += 0.5) {
      if (x <= p.from || x >= p.to || Number.isFinite(p.fn(x))) continue;
      const [l, r] = [p.fn(x - EPS), p.fn(x + EPS)];
      if (Number.isFinite(l) && Math.abs(l - r) < 1e-3 && Math.abs(l) < 1e4) gaps.push(x);
    }
    if (gaps.length > 1) return null;
    if (gaps.length) p.hole = gaps[0];
  }

  const groups = [...new Set(pieces.map((p) => p.name))].map((name) => ({ name, drawn: new Drawn(pieces.filter((p) => p.name === name).map((p) => p.piece), graph) }));

  // Dots are placed by the curve's own ends and holes, never by the AI.
  const dots: TestGraph["points"] = [];
  for (const { name, piece: p } of pieces) {
    const mark = (x: number, open: boolean) => {
      let y = p.fn(x);
      if (!Number.isFinite(y)) y = (p.fn(x - EPS) + p.fn(x + EPS)) / 2;
      if (!Number.isFinite(y)) return;
      y = Number(y.toFixed(5));
      dots.push({ x, y, open });
    };
    const others = pieces.filter((o) => o.name === name && o.piece !== p);
    for (const [x, closed] of [[p.from, p.fromClosed], [p.to, p.toClosed]] as const) {
      if (!Number.isFinite(x)) continue;
      // Two values at one x is not a function.
      if (closed && others.some((o) => ((o.piece.fromClosed && o.piece.from === x) || (o.piece.toClosed && o.piece.to === x)) && Math.abs(o.piece.fn(x) - p.fn(x)) > 1e-6)) return null;
      if (others.some((o) => x > o.piece.from && x < o.piece.to)) return null;
      mark(x, !closed);
    }
    if (p.hole !== null) {
      if (!(p.hole > Math.max(p.from, graph.xMin) && p.hole < Math.min(p.to, graph.xMax))) return null;
      mark(p.hole, true);
    }
  }
  // A filled dot covers an open one at the same spot, and pieces that join need no dot at all.
  const kept: TestGraph["points"] = [];
  for (const d of dots) {
    const same = dots.filter((o) => Math.abs(o.x - d.x) < 1e-9 && Math.abs(o.y - d.y) < 1e-6);
    if (same.length > 1 && same.some((o) => !o.open)) continue;
    if (!kept.some((o) => Math.abs(o.x - d.x) < 1e-9 && Math.abs(o.y - d.y) < 1e-6)) kept.push(d);
  }
  graph.points = kept;
  for (const d of kept) {
    if (d.x < graph.xMin || d.x > graph.xMax) return null;
    graph.yMin = Math.min(graph.yMin, Math.floor(d.y - 1));
    graph.yMax = Math.max(graph.yMax, Math.ceil(d.y + 1));
  }
  return { graph, groups };
}

// The questions -------------------------------------------------------------------------------------

interface Task {
  instructions: string;
  answer: { key: string; tex: string };
  /** LaTeX of the final line. */
  result: string;
  explain: string;
}

const COMMAS = "Separate more than one with commas.";

function solveTask(task: FigureTask, fig: Figure, atRaw: unknown, toRaw: unknown): Task | null {
  const f = fig.groups[0].drawn;
  const shown = fig.groups.length === 2 ? "The graphs of $f$ and $g$ are shown." : "The graph of $f$ is shown.";
  const a0 = bound(atRaw);
  const a = a0 === null ? null : f.snapX(a0);
  const visible = (x: number | null): x is number => x !== null && x >= fig.graph.xMin && x <= fig.graph.xMax;

  switch (task) {
    case "value": {
      if (!visible(a)) return null;
      const y = f.snapY(f.at(a));
      if (y === null || !f.sees(a, y)) return null;
      return {
        instructions: `${shown} Find $f(${num(a).tex})$.`,
        answer: num(y),
        result: `f(${num(a).tex}) = ${num(y).tex}`,
        explain: `Start at $x = ${num(a).tex}$ on the horizontal axis and move straight up or down to the graph. A filled dot is part of the graph and an open circle is not. Read the height there.`,
      };
    }
    case "limit":
    case "left_limit":
    case "right_limit": {
      if (!visible(a) || a <= fig.graph.xMin || a >= fig.graph.xMax) return null;
      const read = (d: -1 | 1) => {
        const y = f.snapY(f.side(a, d));
        return y !== null && f.sees(a, y) ? y : null;
      };
      const [l, r] = [read(-1), read(1)];
      const A = num(a).tex;
      if (task !== "limit") {
        const left = task === "left_limit";
        const v = left ? l : r;
        if (v === null) return null;
        return {
          instructions: `${shown} Find $\\lim_{x \\to ${A}^{${left ? "-" : "+"}}} f(x)$.`,
          answer: num(v),
          result: `\\lim_{x \\to ${A}^{${left ? "-" : "+"}}} f(x) = ${num(v).tex}`,
          explain: `Trace the graph toward $x = ${A}$ from the ${left ? "left" : "right"} side only. Read the height it heads for, whether that spot is an open circle or a filled dot.`,
        };
      }
      if (l === null || r === null) return null;
      const same = l === r;
      return {
        instructions: `${shown} Find $\\lim_{x \\to ${A}} f(x)$. If the limit does not exist, enter DNE.`,
        answer: same ? num(l) : { key: "dne", tex: "\\text{DNE}" },
        result: same ? `\\lim_{x \\to ${A}} f(x) = ${num(l).tex}` : `\\lim_{x \\to ${A}^{-}} f(x) = ${num(l).tex} \\ne ${num(r).tex} = \\lim_{x \\to ${A}^{+}} f(x)`,
        explain: same
          ? `From the left the graph heads for height $${num(l).tex}$, and from the right it heads for the same height. The sides agree, so that is the limit. The value of $f(${A})$ itself does not matter.`
          : `From the left the graph heads for height $${num(l).tex}$, but from the right it heads for $${num(r).tex}$. The sides disagree, so the limit does not exist.`,
      };
    }
    case "x_intercepts": {
      const xs = f.roots().map((x) => f.snapX(x));
      if (!xs.length || xs.length > 4 || xs.some((x) => x === null) || f.rootsOutside()) return null;
      const v = list(xs as number[]);
      return {
        instructions: `${shown} Enter the $x$-value of every $x$-intercept. ${COMMAS}`,
        answer: v,
        result: `x = ${v.tex}`,
        explain: "An $x$-intercept is a point where the graph meets the $x$-axis, so its height is $0$. Read the $x$-value at each one.",
      };
    }
    case "y_intercept": {
      const y = f.snapY(f.at(0));
      if (y === null || !f.sees(0, y)) return null;
      return {
        instructions: `${shown} Enter the $y$-value of the $y$-intercept.`,
        answer: num(y),
        result: `f(0) = ${num(y).tex}`,
        explain: "The $y$-intercept is where the graph crosses the $y$-axis, which is where $x = 0$. Read the height there.",
      };
    }
    case "maximum":
    case "minimum": {
      const kind = task === "maximum" ? "max" : "min";
      const [lo, hi] = f.wide();
      const pts = f.turning().filter((p) => p.kind === kind);
      if (!f.smoothEverywhere() || pts.length !== 1 || f.turning(lo, hi).filter((p) => p.kind === kind).length !== 1) return null;
      const [x, y] = [f.snapX(pts[0].x), f.snapY(pts[0].y)];
      if (x === null || y === null || !f.sees(x, y)) return null;
      return {
        instructions: `${shown} Enter the coordinates of its relative ${task} as an ordered pair $(x, y)$.`,
        answer: point(x, y),
        result: point(x, y).tex,
        explain: `A relative ${task} is where the graph stops ${kind === "max" ? "rising and starts falling" : "falling and starts rising"}. Read both coordinates of that turning point.`,
      };
    }
    case "increasing":
    case "decreasing": {
      const [lo, hi] = f.wide();
      const t = f.turning();
      if (!f.smoothEverywhere() || t.length < 1 || t.length > 2 || f.turning(lo, hi).length !== t.length) return null;
      const xs = t.map((p) => f.snapX(p.x));
      if (xs.some((x) => x === null)) return null;
      const ends = [-Infinity, ...(xs as number[]), Infinity];
      const sign = task === "increasing" ? 1 : -1;
      const inside = (i: number) => (ends[i] === -Infinity ? ends[i + 1] - 1e-2 : ends[i + 1] === Infinity ? ends[i] + 1e-2 : (ends[i] + ends[i + 1]) / 2);
      const keep: Interval[] = [];
      for (let i = 0; i + 1 < ends.length; i++) {
        const m = inside(i);
        if (Math.sign(f.at(m + 1e-4) - f.at(m - 1e-4)) === sign) keep.push({ lo: ends[i], hi: ends[i + 1], loClosed: false, hiClosed: false });
      }
      if (!keep.length) return null;
      const v = intervals(keep);
      return {
        instructions: `${shown} On what open interval or intervals is $f$ ${task}? Use interval notation, such as $(-\\infty, 4)$. ${COMMAS}`,
        answer: v,
        result: v.tex,
        explain: `Read from left to right. $f$ is ${task} wherever the graph goes ${sign > 0 ? "up" : "down"}. It changes direction only at the turning points, so the intervals end at their $x$-values.`,
      };
    }
    case "intersections": {
      const g = fig.groups[1]?.drawn;
      if (!g) return null;
      const diff = new Drawn([{ fn: (x) => f.at(x) - g.at(x), from: -Infinity, to: Infinity, fromClosed: false, toClosed: false, hole: null }], fig.graph);
      const xs = diff.roots().map((x) => f.snapX(x));
      if (!xs.length || xs.length > 4 || xs.some((x) => x === null || !f.sees(x, f.at(x))) || diff.rootsOutside()) return null;
      const v = list(xs as number[]);
      return {
        instructions: `${shown} Use them to solve $f(x) = g(x)$. Enter every solution. ${COMMAS}`,
        answer: v,
        result: `x = ${v.tex}`,
        explain: "$f(x) = g(x)$ where the two graphs have the same height, which is where they cross or touch. The solutions are the $x$-values of those points.",
      };
    }
    case "hole": {
      const holes = f.pieces.filter((p) => p.hole !== null).map((p) => p.hole!);
      if (holes.length !== 1) return null;
      const x = f.snapX(holes[0]);
      const y = f.snapY(f.side(holes[0], -1));
      if (x === null || y === null || Math.abs(f.side(x, 1) - y) > 1e-3 || !f.sees(x, y)) return null;
      return {
        instructions: `${shown} Enter the coordinates of its hole as an ordered pair $(x, y)$.`,
        answer: point(x, y),
        result: point(x, y).tex,
        explain: "A hole is drawn as an open circle: the graph approaches that point from both sides but leaves it out. Read both coordinates of the circle.",
      };
    }
    case "domain": {
      const d = domainOf(f);
      if (!d) return null;
      const v = intervals(d);
      return {
        instructions: `${shown} Enter the domain of $f$ in interval notation. ${COMMAS}`,
        answer: v,
        result: v.tex,
        explain: "The domain is every $x$-value the graph covers, read from left to right. A filled dot includes its $x$-value. An open circle or an asymptote leaves it out. A graph that runs off the edge of the grid keeps going.",
      };
    }
    case "range": {
      const r = rangeOf(f);
      if (!r) return null;
      const v = intervals([r]);
      return {
        instructions: `${shown} Enter the range of $f$ in interval notation.`,
        answer: v,
        result: v.tex,
        explain: "The range is every height the graph reaches, read from bottom to top. A highest or lowest point on the graph is included. A height the graph only gets closer and closer to is not.",
      };
    }
    case "vertical_asymptotes": {
      const at = f.breaks().filter((x) => f.blowsUp(x));
      const xs = at.map((x) => f.snapX(x));
      if (!xs.length || xs.length > 3 || xs.some((x) => x === null) || f.breaksOutside()) return null;
      const v = list(xs as number[]);
      return {
        instructions: `${shown} Enter the value of $a$ for every vertical asymptote $x = a$. ${COMMAS}`,
        answer: v,
        result: (xs as number[]).map((x) => `x = ${num(x).tex}`).join(", \\quad "),
        explain: "A vertical asymptote is a vertical line the graph climbs or drops along without ever reaching it. Read where that line meets the $x$-axis.",
      };
    }
    case "horizontal_asymptote": {
      const [l, r] = [f.at(-1e7), f.at(1e7)];
      const flat = [l, r].filter((v) => Number.isFinite(v) && Math.abs(v) < 1e3);
      if (!flat.length || (flat.length === 2 && Math.abs(l - r) > 1e-3) || Math.abs(f.at(1e6 * (flat[0] === l ? -1 : 1)) - flat[0]) > 1e-3) return null;
      const y = f.snapY(Number(flat[0].toFixed(4)));
      if (y === null || !f.sees(fig.graph.xMax, y)) return null;
      // A level line is its own "asymptote", and the curve must be close to it by the edge of the grid.
      const edge = flat[0] === l ? fig.graph.xMin : fig.graph.xMax;
      const gap = Math.abs(f.at(edge) - y);
      if (gap < 1e-9 || gap > f.yStep) return null;
      return {
        instructions: `${shown} Enter the value of $b$ for its horizontal asymptote $y = b$.`,
        answer: num(y),
        result: `y = ${num(y).tex}`,
        explain: "Follow the graph far to the left and far to the right. The horizontal line it levels off toward is the horizontal asymptote. Read where that line meets the $y$-axis.",
      };
    }
    case "average_rate": {
      const b0 = bound(toRaw);
      const b = b0 === null ? null : f.snapX(b0);
      if (!visible(a) || !visible(b) || b <= a || f.inPi) return null;
      const [ya, yb] = [f.snapY(f.at(a)), f.snapY(f.at(b))];
      if (ya === null || yb === null || !f.sees(a, ya) || !f.sees(b, yb)) return null;
      const m = num((yb - ya) / (b - a));
      const par = (v: number) => (v < 0 ? `(${num(v).tex})` : num(v).tex);
      return {
        instructions: `${shown} Find the average rate of change of $f$ on the interval $[${num(a).tex}, ${num(b).tex}]$.`,
        answer: m,
        result: `\\frac{f(${num(b).tex}) - f(${num(a).tex})}{${num(b).tex} - ${par(a)}} = \\frac{${num(yb).tex} - ${par(ya)}}{${num(b - a).tex}} = ${m.tex}`,
        explain: `Read the two heights: $f(${num(a).tex}) = ${num(ya).tex}$ and $f(${num(b).tex}) = ${num(yb).tex}$. The average rate of change is the change in height divided by the change in $x$.`,
      };
    }
    case "amplitude":
    case "period": {
      const w = f.wave();
      if (!w) return null;
      if (task === "amplitude") {
        const [hi, lo] = [f.snapY(w.max), f.snapY(w.min)];
        if (hi === null || lo === null || !f.sees(fig.graph.xMin, hi) || !f.sees(fig.graph.xMin, lo)) return null;
        const v = num((hi - lo) / 2);
        return {
          instructions: `${shown} Find its amplitude.`,
          answer: v,
          result: `\\frac{${num(hi).tex} - ${lo < 0 ? `(${num(lo).tex})` : num(lo).tex}}{2} = ${v.tex}`,
          explain: `The graph rises to $${num(hi).tex}$ and falls to $${num(lo).tex}$. The amplitude is half the distance between them.`,
        };
      }
      const p = f.snapX(w.period);
      if (p === null) return null;
      return {
        instructions: `${shown} Find its period.${f.inPi ? " You can type pi, such as 3pi/2." : ""}`,
        answer: num(p),
        result: `\\text{period} = ${num(p).tex}`,
        explain: "The period is the horizontal length of one full cycle. Measure along the $x$-axis from one peak to the next.",
      };
    }
    default:
      return null;
  }
}

function domainOf(f: Drawn): Interval[] | null {
  const { xMin, xMax } = f.w;
  const cuts = f.breaks();
  if (cuts.some((x) => f.snapX(x) === null) || f.breaksOutside()) return null;
  const marks = [xMin, ...cuts.map((x) => f.snapX(x)!), xMax];
  const out: Interval[] = [];
  for (let i = 0; i + 1 < marks.length; i++) {
    const [lo, hi] = [marks[i], marks[i + 1]];
    if (!Number.isFinite(f.at((lo + hi) / 2 + 1e-7))) continue;
    const edge = (first: boolean) => {
      // The curve carries on past the grid, or ends exactly at its edge.
      const x = first ? xMin : xMax;
      const beyond = f.at(x + (first ? -1 : 1) * 1e-3);
      const far = f.at(first ? -FAR : FAR);
      return Number.isFinite(beyond) && !Number.isNaN(far) ? "on" : Number.isFinite(beyond) ? "unclear" : "ends";
    };
    const loEdge = i === 0 ? edge(true) : null;
    const hiEdge = i + 2 === marks.length ? edge(false) : null;
    // Exponentials overflow far out, which reads as undefined there; only a one-piece curve is trusted to carry on.
    if (loEdge === "unclear" || hiEdge === "unclear") {
      const p = f.pieces;
      if (p.length !== 1 || p[0].from !== -Infinity || p[0].to !== Infinity) return null;
    }
    const a: Interval = {
      lo: loEdge && loEdge !== "ends" ? -Infinity : lo,
      hi: hiEdge && hiEdge !== "ends" ? Infinity : hi,
      loClosed: !(loEdge && loEdge !== "ends") && f.has(lo),
      hiClosed: !(hiEdge && hiEdge !== "ends") && f.has(hi),
    };
    const prev = out[out.length - 1];
    if (prev && prev.hi === a.lo && (prev.hiClosed || a.loClosed)) {
      prev.hi = a.hi;
      prev.hiClosed = a.hiClosed;
    } else out.push(a);
  }
  return out.length && out.length <= 3 ? out : null;
}

function rangeOf(f: Drawn): Interval | null {
  const w = f.wave();
  if (w) {
    const [lo, hi] = [f.snapY(w.min), f.snapY(w.max)];
    return lo === null || hi === null ? null : { lo, hi, loClosed: true, hiClosed: true };
  }
  const d = domainOf(f);
  // One unbroken stretch only: gaps and jumps can leave holes in the range.
  if (!d || d.length !== 1 || f.pieces.length !== 1 || f.breaks().some((x) => x > d[0].lo + 1e-6 && x < d[0].hi - 1e-6)) return null;
  const { lo, hi, loClosed, hiClosed } = d[0];
  const t = f.turning();
  const [wl, wh] = f.wide();
  if (t.length > 3 || f.turning(wl, wh).length !== t.length) return null;
  const marks: { y: number; closed: boolean }[] = t.map((p) => ({ y: p.y, closed: true }));
  const end = (x: number, closed: boolean, dir: -1 | 1): boolean => {
    if (Number.isFinite(x)) {
      const y = closed ? f.at(x) : f.side(x, dir);
      if (Number.isFinite(y)) marks.push({ y, closed });
      else if (f.blowsUp(x)) marks.push({ y: f.at(x + dir * 1e-9) > 0 ? Infinity : -Infinity, closed: false });
      else return false;
      return true;
    }
    const s = x > 0 ? 1 : -1;
    const [near, far] = [f.pieces[0].fn(s * 1e4), f.pieces[0].fn(s * 1e8)];
    if (near === Infinity || near === -Infinity) marks.push({ y: near, closed: false });
    else if (Number.isNaN(near)) return false;
    else if (!Number.isFinite(far) || Math.abs(far - near) > 1) marks.push({ y: far > near ? Infinity : -Infinity, closed: false });
    else marks.push({ y: Number(far.toFixed(3)), closed: false });
    return true;
  };
  if (!end(lo, loClosed, 1) || !end(hi, hiClosed, -1)) return null;
  const pick = (best: number) => ({ y: best, closed: marks.some((m) => m.closed && Math.abs(m.y - best) < 1e-6) });
  const [mn, mx] = [pick(Math.min(...marks.map((m) => m.y))), pick(Math.max(...marks.map((m) => m.y)))];
  const read = (v: number) => (Number.isFinite(v) ? f.snapY(v) : v);
  const [a, b] = [read(mn.y), read(mx.y)];
  if (a === null || b === null || a >= b) return null;
  if ([a, b].some((v) => Number.isFinite(v) && !f.sees(f.w.xMin, v))) return null;
  return { lo: a, hi: b, loClosed: mn.closed, hiClosed: mx.closed };
}

/** A question about a figure, or null when it cannot be asked honestly. */
export function figureQuestion(value: unknown): Written | null {
  const raw = (value ?? {}) as Record<string, unknown>;
  const task = FIGURE_TASKS.find((t) => t === raw.task);
  if (!task || task === "none") return null;
  const fig = readFigure(raw);
  if (!fig) return null;
  const q = solveTask(task, fig, raw.at, raw.to);
  if (!q) return null;
  const solution: SolutionStep[] = [{ explanation: q.explain, latex: q.result }];
  return { promptLatex: "", instructions: q.instructions, type: "free_response", choices: [], answer: q.answer.key, answerLatex: q.answer.tex, solution, graph: fig.graph };
}

/**
 * Puts the graphs of both sides on an equation question, so a test on a topic the AI left unillustrated
 * still has a graph. The grid must show the key exactly, or the question is left as it was.
 */
export function illustrateEquation(q: TestQuestion): TestQuestion | null {
  if (q.graph || q.choiceGraphs || q.type !== "free_response" || !/\bsolve\b|\bsolutions?\b/i.test(q.instructions)) return null;
  const sides = graphableSides(q.promptLatex);
  const drawn = sides?.length === 2 ? graphOfLatex(q.promptLatex) : null;
  if (!sides || !drawn) return null;
  const { xMin, xMax, yMin, yMax } = drawn;
  const curves = sides.map((s, i) => ({ expression: s.expr, label: i ? "g(x)" : "f(x)", from: "", to: "", hole: "" }));
  const fig = readFigure({ curves, xMin, xMax, yMin, yMax });
  const solved = fig && solveTask("intersections", fig, "", "");
  if (!fig || !solved || !answersMatch(solved.answer.key, q.answer)) return null;
  const graph = { ...fig.graph, curves: fig.graph.curves.map((c, i) => ({ ...c, label: `y = ${sides[i].tex}`.slice(0, 40) })) };
  return { ...q, graph, instructions: `${q.instructions} The graphs of both sides are shown: they meet at the solution.` };
}

/** True when the AI meant this to be a figure question. */
export function wantsFigure(value: unknown): boolean {
  const raw = (value ?? {}) as Record<string, unknown>;
  return typeof raw.task === "string" && raw.task !== "none" && raw.task !== "";
}

/** "Which graph shows f?" The equation is written from the very expression that is drawn as the key. */
export function choiceQuestion(expressions: unknown, window: unknown, answer: unknown): Written | null {
  const choiceGraphs = checkChoiceGraphs(expressions, window);
  const key = Number.parseInt(String(answer ?? ""), 10);
  if (!choiceGraphs || !(key >= 0 && key < choiceGraphs.length)) return null;
  const expr = choiceGraphs[key].curves[0].expression.replace(/^\s*(?:y|[a-z]\s*\(\s*x\s*\))\s*=\s*/i, "");
  const f = compileCurve(expr)?.fn;
  if (!f) return null;
  let tex: string;
  try {
    tex = parse(expr.replace(/\bln\(/g, "log(")).toTex({ parenthesis: "auto", implicit: "hide" }).replace(/\\mathrm\{(x|e)\}/g, "$1").replace(/~/g, "");
  } catch {
    return null;
  }
  const w = choiceGraphs[key];
  const passes: string[] = [];
  for (const x of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
    const y = f(x);
    if (x < w.xMin || x > w.xMax || !Number.isFinite(y) || y < w.yMin || y > w.yMax) continue;
    if (Math.abs(y * 4 - Math.round(y * 4)) > 1e-6) continue;
    passes.push(point(x, y).tex);
    if (passes.length === 3) break;
  }
  if (!passes.length) return null;
  const letters = choiceGraphs.map((_, i) => String.fromCharCode(65 + i));
  return {
    promptLatex: `f(x) = ${tex}`,
    instructions: "Which graph shows $f$?",
    type: "multiple_choice",
    choices: letters,
    answer: String(key),
    answerLatex: `\\text{Graph ${letters[key]}}`,
    choiceGraphs,
    solution: [
      { explanation: "Substitute simple $x$-values into $f$ to find points the graph must pass through.", latex: passes.join(", \\quad ") },
      { explanation: `Graph ${letters[key]} passes through ${passes.length === 1 ? "that point" : "all of them"} and has the right shape.`, latex: `\\text{Graph ${letters[key]}}` },
    ],
  };
}
