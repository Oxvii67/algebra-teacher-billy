import { compile, parse, type MathNode } from "mathjs";

export type Fn = (x: number, params: Record<string, number>) => number;

export interface Curve {
  fn: Fn;
  dashed: boolean;
  label: string;
}

export interface ParsedLine {
  curves: Curve[];
  /** x = c vertical lines. */
  vertical: Fn | null;
  params: string[];
  error: string | null;
}

const RESERVED = new Set(["x", "y", "e", "E", "pi", "PI", "i", "Infinity", "NaN", "true", "false", "ln"]);

function preprocess(s: string): string {
  return s
    .replace(/−/g, "-")
    .replace(/·|×/g, "*")
    .replace(/π/g, "pi")
    .replace(/\bln\s*\(/g, "log(")
    .replace(/\blog_(\d+(?:\.\d+)?)\s*\(([^()]*)\)/g, "log($2, $1)")
    .replace(/\bsqrt(\d)/g, "sqrt($1)")
    .trim();
}

function symbols(node: MathNode): string[] {
  const fnNames = new Set<string>();
  const names = new Set<string>();
  node.traverse((n) => {
    const any = n as unknown as { type: string; fn?: { name?: string }; name?: string };
    if (any.type === "FunctionNode" && any.fn?.name) fnNames.add(any.fn.name);
  });
  node.traverse((n) => {
    const any = n as unknown as { type: string; name?: string };
    if (any.type === "SymbolNode" && any.name && !fnNames.has(any.name) && !RESERVED.has(any.name)) names.add(any.name);
  });
  return [...names];
}

function toReal(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "re" in v && "im" in v) {
    const c = v as { re: number; im: number };
    return Math.abs(c.im) < 1e-10 ? c.re : NaN;
  }
  if (typeof v === "boolean") return v ? 1 : NaN;
  return NaN;
}

function makeFn(src: string): { fn: Fn; params: string[] } {
  const node = parse(src);
  const params = symbols(node);
  const code = compile(src);
  const scope: Record<string, unknown> = {};
  const fn: Fn = (x, p) => {
    for (const k of params) scope[k] = p[k] ?? 1;
    scope.x = x;
    try {
      return toReal(code.evaluate(scope));
    } catch {
      return NaN;
    }
  };
  // Surface undefined functions and similar mistakes now instead of silently drawing nothing.
  try {
    code.evaluate({ ...Object.fromEntries(params.map((k) => [k, 1])), x: 0.5 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Undefined (function|symbol)|Unexpected|Wrong number of arguments|Too few|Too many/i.test(msg)) throw err;
  }
  return { fn, params };
}

function hasSymbol(node: MathNode, name: string): boolean {
  let found = false;
  node.traverse((n) => {
    const any = n as unknown as { type: string; name?: string };
    if (any.type === "SymbolNode" && any.name === name) found = true;
  });
  return found;
}

/** Parses one calculator line: y = f(x), f(x) = ..., plain expressions in x, x = c, or lhs = rhs (graphed as two curves). */
export function parseLine(raw: string): ParsedLine {
  const s = preprocess(raw);
  if (!s) return { curves: [], vertical: null, params: [], error: null };
  try {
    const eq = s.split(/(?<![<>!=])=(?!=)/);
    if (eq.length > 2) return { curves: [], vertical: null, params: [], error: "Use at most one equals sign." };
    if (eq.length === 1) {
      const { fn, params } = makeFn(s);
      return { curves: [{ fn, dashed: false, label: s }], vertical: null, params, error: null };
    }
    const [lhsRaw, rhsRaw] = eq.map((p) => p.trim());
    if (!lhsRaw || !rhsRaw) return { curves: [], vertical: null, params: [], error: "Both sides of the equals sign need something." };
    const lhsNode = parse(lhsRaw);
    const rhsNode = parse(rhsRaw);

    if (/^y$/.test(lhsRaw) || /^[a-zA-Z]\w*\(\s*x\s*\)$/.test(lhsRaw)) {
      if (hasSymbol(rhsNode, "y")) return { curves: [], vertical: null, params: [], error: "Solve for y first, then graph y = ..." };
      const { fn, params } = makeFn(rhsRaw);
      return { curves: [{ fn, dashed: false, label: s }], vertical: null, params, error: null };
    }
    if (lhsRaw === "x" && !hasSymbol(rhsNode, "x") && !hasSymbol(rhsNode, "y")) {
      const { fn, params } = makeFn(rhsRaw);
      return { curves: [], vertical: fn, params, error: null };
    }
    if (hasSymbol(lhsNode, "y") || hasSymbol(rhsNode, "y")) {
      return { curves: [], vertical: null, params: [], error: "Implicit relations in y are not supported. Write y = ..." };
    }
    const a = makeFn(lhsRaw);
    const b = makeFn(rhsRaw);
    return {
      curves: [
        { fn: a.fn, dashed: false, label: lhsRaw },
        { fn: b.fn, dashed: true, label: rhsRaw },
      ],
      vertical: null,
      params: [...new Set([...a.params, ...b.params])],
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { curves: [], vertical: null, params: [], error: msg.replace(/\(char \d+\)/, "").slice(0, 120) };
  }
}

export interface Poi {
  x: number;
  y: number;
  kind: "root" | "max" | "min" | "intersection" | "y-intercept";
  color: string;
}

function bisect(f: (x: number) => number, a: number, b: number): number {
  let fa = f(a);
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (!Number.isFinite(fm)) return NaN;
    if (Math.sign(fm) === Math.sign(fa)) {
      a = m;
      fa = fm;
    } else b = m;
  }
  return (a + b) / 2;
}

function golden(f: (x: number) => number, a: number, b: number, max: boolean): number {
  const g = (Math.sqrt(5) - 1) / 2;
  const h = (x: number) => (max ? -f(x) : f(x));
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  for (let i = 0; i < 60; i++) {
    if (h(c) < h(d)) b = d;
    else a = c;
    c = b - g * (b - a);
    d = a + g * (b - a);
  }
  return (a + b) / 2;
}

function rootsOf(f: (x: number) => number, x0: number, x1: number, n: number, yScale: number): number[] {
  const out: number[] = [];
  const dx = (x1 - x0) / n;
  let px = x0;
  let py = f(px);
  for (let i = 1; i <= n; i++) {
    const x = x0 + i * dx;
    const y = f(x);
    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (py === 0) out.push(px);
      else if (Math.sign(py) !== Math.sign(y) && y !== 0) {
        const r = bisect(f, px, x);
        // Reject sign changes across vertical asymptotes.
        if (Number.isFinite(r) && Math.abs(f(r)) < Math.max(1e-6, yScale * 1e-3)) out.push(r);
      }
    }
    px = x;
    py = y;
  }
  return out;
}

function dedupe(points: Poi[], tolX: number, tolY: number): Poi[] {
  const out: Poi[] = [];
  for (const p of points) {
    if (!out.some((q) => q.kind === p.kind && Math.abs(q.x - p.x) < tolX && Math.abs(q.y - p.y) < tolY)) out.push(p);
  }
  return out;
}

export function clean(v: number): number {
  if (Math.abs(v) < 1e-9) return 0;
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-7) return r;
  return v;
}

export function findPois(
  curves: { fn: (x: number) => number; color: string }[],
  x0: number,
  x1: number,
  yRange: number,
): Poi[] {
  const n = 800;
  const pois: Poi[] = [];
  const dx = (x1 - x0) / n;

  for (const c of curves) {
    for (const r of rootsOf(c.fn, x0, x1, n, yRange)) pois.push({ x: clean(r), y: 0, kind: "root", color: c.color });

    const ys: number[] = [];
    for (let i = 0; i <= n; i++) ys.push(c.fn(x0 + i * dx));
    for (let i = 1; i < n; i++) {
      const a = ys[i - 1];
      const b = ys[i];
      const d = ys[i + 1];
      if (![a, b, d].every(Number.isFinite)) continue;
      const isMax = b > a && b >= d;
      const isMin = b < a && b <= d;
      if (!isMax && !isMin) continue;
      const xg = golden(c.fn, x0 + (i - 1) * dx, x0 + (i + 1) * dx, isMax);
      // Golden-section search is accurate to about 1e-8; snap to a short decimal when that is just as extreme.
      const xs = Number(xg.toPrecision(7));
      const better = isMax ? c.fn(xs) >= c.fn(xg) - 1e-12 : c.fn(xs) <= c.fn(xg) + 1e-12;
      const x = better ? xs : xg;
      const y = c.fn(x);
      if (!Number.isFinite(y)) continue;
      // Skip near-flat noise and asymptote spikes.
      if (Math.abs(b - a) + Math.abs(d - b) < 1e-12) continue;
      if (Math.abs(y) > yRange * 50) continue;
      pois.push({ x: clean(x), y: clean(y), kind: isMax ? "max" : "min", color: c.color });
      // A min or max touching the axis is also a root (double root).
      if (Math.abs(y) < 1e-7) pois.push({ x: clean(x), y: 0, kind: "root", color: c.color });
    }

    if (x0 <= 0 && x1 >= 0) {
      const y = c.fn(0);
      if (Number.isFinite(y)) pois.push({ x: 0, y: clean(y), kind: "y-intercept", color: c.color });
    }
  }

  for (let i = 0; i < curves.length; i++) {
    for (let j = i + 1; j < curves.length; j++) {
      const f = (x: number) => curves[i].fn(x) - curves[j].fn(x);
      for (const r of rootsOf(f, x0, x1, n, yRange)) {
        const y = curves[i].fn(r);
        if (Number.isFinite(y)) pois.push({ x: clean(r), y: clean(y), kind: "intersection", color: "#888888" });
      }
    }
  }

  return dedupe(pois, (x1 - x0) / 2000, yRange / 2000 + 1e-9);
}

export function fmt(v: number): string {
  if (!Number.isFinite(v)) return "undefined";
  const c = clean(v);
  if (Number.isInteger(c)) return String(c);
  const a = Math.abs(c);
  if (a >= 1e5 || a < 1e-4) return c.toExponential(3);
  return String(Number(c.toFixed(4)));
}

export function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
