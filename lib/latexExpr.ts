import { findPois, parseLine } from "@/lib/graph";
import { checkGraph, compileCurve } from "@/lib/testGraph";
import type { TestGraph } from "@/lib/types";

/** Reads simple LaTeX such as 5x - 7 = 18 well enough to graph it. Anything it is unsure of is left ungraphed. */

/** The text inside the bracket that opens at i, and the index just past its close. */
function group(s: string, i: number, open = "{", close = "}"): [string, number] | null {
  if (s[i] !== open) return null;
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === open) depth++;
    else if (s[j] === close && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return null;
}

export function latexToExpr(latex: string): string | null {
  let s = latex
    .replace(/\\(?:left|right|displaystyle|,|;|!|:|quad|qquad)(?![a-zA-Z])/g, " ")
    .replace(/\\[dt]frac/g, "\\frac")
    .replace(/\\(?:cdot|times)(?![a-zA-Z])/g, "*")
    .replace(/\\pi(?![a-zA-Z])/g, " pi ")
    .replace(/\\(?:lvert|rvert|vert)(?![a-zA-Z])/g, "|")
    .replace(/\\ln(?![a-zA-Z])/g, "ln")
    .replace(/\\(sin|cos|tan)(?![a-zA-Z])/g, "$1")
    .trim();
  let out = "";
  for (let i = 0; i < s.length; ) {
    if (s.startsWith("\\frac", i)) {
      const a = group(s, i + 5);
      const b = a && group(s, a[1]);
      const [n, d] = [a && latexToExpr(a[0]), b && latexToExpr(b[0])];
      if (!b || !n || !d) return null;
      out += `((${n})/(${d}))`;
      i = b[1];
    } else if (s.startsWith("\\sqrt", i)) {
      const root = group(s, i + 5, "[", "]");
      const a = group(s, root ? root[1] : i + 5);
      const body = a && latexToExpr(a[0]);
      if (!a || !body) return null;
      out += root ? `nthRoot(${body}, ${root[0]})` : `sqrt(${body})`;
      i = a[1];
    } else if (/^\\log_(?:\{\d+\}|\d)\s*\(/.test(s.slice(i))) {
      const m = /^\\log_\{?(\d+)\}?\s*/.exec(s.slice(i))!;
      const a = group(s, i + m[0].length, "(", ")");
      const body = a && latexToExpr(a[0]);
      if (!a || !body) return null;
      out += `log(${body}, ${m[1]})`;
      i = a[1];
    } else if (s[i] === "^" && s[i + 1] === "{") {
      const a = group(s, i + 1);
      const body = a && latexToExpr(a[0]);
      if (!a || !body) return null;
      out += `^(${body})`;
      i = a[1];
    } else {
      out += s[i++];
    }
  }
  s = out.replace(/\s+/g, " ").trim();
  // A command, brace, inequality, list or prose that was not understood.
  if (!s || /[\\{}<>,;&]/.test(s.replace(/(?:log|nthRoot)\([^()]*(?:\([^()]*\)[^()]*)*\)/g, "0"))) return null;
  // sin x and ln x without brackets are too easy to misread.
  if (/\b(?:sin|cos|tan|ln|log)\b(?!\s*\()/.test(s)) return null;
  return s;
}

/** The sides of an equation in x, or the one side of y = ... and f(x) = .... */
export function graphableSides(latex: string): { expr: string; tex: string }[] | null {
  const parts = latex.split("=");
  if (parts.length > 2 || /\\(?:ne|le|ge|lt|gt|begin|text|lim|int|sum)(?![a-z])/.test(latex)) return null;
  const named = parts.length === 2 && /^\s*(?:y|[a-zA-Z]\s*(?:\\left)?\(\s*x\s*(?:\\right)?\))\s*$/.test(parts[0]);
  const sides = named ? [parts[1]] : parts;
  const out: { expr: string; tex: string }[] = [];
  for (const tex of sides) {
    const expr = latexToExpr(tex);
    if (!expr || /=/.test(expr)) return null;
    const p = parseLine(expr);
    if (p.error || p.params.length || p.curves.length !== 1) return null;
    out.push({ expr, tex: tex.trim() });
  }
  // Two plain numbers, or a lone number, have nothing to show.
  return out.some((o) => /x/.test(o.expr.replace(/exp/g, ""))) ? out : null;
}

/** A window that shows where the sides meet, or a function's main features. */
function windowFor(fns: ((x: number) => number)[]): { xMin: number; xMax: number; yMin: number; yMax: number } | null {
  const h = fns.length === 2 ? (x: number) => fns[0](x) - fns[1](x) : fns[0];
  const pois = findPois([{ fn: h, color: "" }], -40.03, 40.07, 40).filter((p) => p.kind !== "y-intercept");
  const marks = pois.map((p) => p.x).slice(0, 8);
  if (fns.length === 2 && !pois.some((p) => p.kind === "root")) return null;
  const xs = fns.length === 2 ? pois.filter((p) => p.kind === "root").map((p) => p.x) : marks;
  if (xs.length > 6) return null;
  const lo = Math.min(0, ...xs);
  const hi = Math.max(0, ...xs);
  const pad = Math.max(2, Math.ceil((10 - (hi - lo)) / 2));
  const ys = [0, ...xs.flatMap((x) => fns.map((f) => f(x))), ...fns.map((f) => f(0))].filter((y) => Number.isFinite(y) && Math.abs(y) < 400);
  const [yl, yh] = [Math.min(...ys), Math.max(...ys)];
  const yPad = Math.max(2, Math.ceil((yh - yl) * 0.2), Math.ceil((10 - (yh - yl)) / 2));
  return { xMin: Math.floor(lo) - pad, xMax: Math.ceil(hi) + pad, yMin: Math.floor(yl) - yPad, yMax: Math.ceil(yh) + yPad };
}

/** A figure of a question's own equation or function, with the solutions marked. Null when it cannot be drawn. */
export function graphOfLatex(latex: string): TestGraph | null {
  try {
    const sides = graphableSides(latex);
    if (!sides) return null;
    const fns = sides.map((s) => compileCurve(s.expr)?.fn);
    if (fns.some((f) => !f)) return null;
    const w = windowFor(fns as ((x: number) => number)[]);
    if (!w) return null;
    const curves = sides.map((s) => ({ expression: s.expr, label: `y = ${s.tex}`.slice(0, 40), from: "", to: "" }));
    const checked = checkGraph({ curves, points: [], ...w });
    if (checked.status !== "ok") return null;
    const g = checked.graph;
    if (sides.length === 2) {
      const [f, k] = fns as ((x: number) => number)[];
      g.points = findPois([{ fn: (x) => f(x) - k(x), color: "" }], g.xMin, g.xMax, g.yMax - g.yMin)
        .filter((p) => p.kind === "root")
        .map((p) => ({ x: p.x, y: f(p.x), open: false }))
        .filter((p) => p.y >= g.yMin && p.y <= g.yMax);
    }
    return g;
  } catch {
    return null;
  }
}
