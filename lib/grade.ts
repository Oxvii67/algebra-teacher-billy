import { compile, parse, type EvalFunction } from "mathjs";

const KNOWN = new Set(["e", "pi", "i", "Infinity", "sqrt", "log", "ln", "abs", "sin", "cos", "tan", "exp", "nthRoot", "cbrt"]);

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\\left|\\right|\\,|\;|\\!/g, "")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\pi|π/g, "pi")
    .replace(/\\infty|∞|infinity/g, "inf")
    .replace(/\\cdot|×/g, "*")
    .replace(/\\le|≤/g, "<=")
    .replace(/\\ge|≥/g, ">=")
    .replace(/−/g, "-")
    .replace(/\b(or|and)\b|;/g, ",")
    .replace(/(^|,)\s*[a-z]\s*=\s*/g, "$1")
    .replace(/^\{|\}$/g, "")
    .replace(/\s+/g, "")
    .replace(/,+/g, ",")
    .replace(/^,|,$/g, "");
}

function ln(x: number) {
  return Math.log(x);
}

function evalItem(expr: string, vars: Record<string, number>): number | null {
  try {
    const f: EvalFunction = compile(expr.replace(/\bln\(/g, "log("));
    const v = f.evaluate({ ...vars, ln });
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (v && typeof v === "object" && "re" in v && "im" in v) {
      const c = v as { re: number; im: number };
      return Math.abs(c.im) < 1e-9 ? c.re : null;
    }
    return null;
  } catch {
    return null;
  }
}

function freeVars(expr: string): string[] {
  try {
    const names = new Set<string>();
    parse(expr).traverse((node) => {
      const n = node as unknown as { isSymbolNode?: boolean; name?: string };
      if (n.isSymbolNode && n.name && !KNOWN.has(n.name)) names.add(n.name);
    });
    return [...names];
  } catch {
    return [];
  }
}

function complexKey(expr: string): [number, number] | null {
  try {
    const v = compile(expr).evaluate({});
    if (typeof v === "number") return [v, 0];
    if (v && typeof v === "object" && "re" in v) return [(v as { re: number }).re, (v as { im: number }).im];
  } catch {
    /* not numeric */
  }
  return null;
}

function close(a: number, b: number) {
  return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
}

function itemsEqual(a: string, b: string): boolean {
  if (a === b) return true;
  const vars = [...new Set([...freeVars(a), ...freeVars(b)])];
  if (vars.length === 0) {
    const ca = complexKey(a);
    const cb = complexKey(b);
    return !!ca && !!cb && close(ca[0], cb[0]) && close(ca[1], cb[1]);
  }
  if (vars.length > 3) return false;
  const pts = [0.37, 1.73, -2.41, 3.19];
  for (const p of pts) {
    const scope: Record<string, number> = {};
    vars.forEach((v, i) => (scope[v] = p + i * 0.61));
    const va = evalItem(a, scope);
    const vb = evalItem(b, scope);
    if (va === null || vb === null || !close(va, vb)) return false;
  }
  return true;
}

/** Grades a free-response answer: order-insensitive lists, numeric and symbolic equivalence. */
export function answersMatch(student: string, key: string): boolean {
  const s = normalizeAnswer(student);
  const k = normalizeAnswer(key);
  if (!s) return false;
  if (s === k) return true;
  const sa = splitTop(s);
  const ka = splitTop(k);
  if (sa.length !== ka.length) return false;
  const used = new Array(ka.length).fill(false);
  return sa.every((x) => {
    const j = ka.findIndex((y, idx) => !used[idx] && itemsEqual(x, y));
    if (j < 0) return false;
    used[j] = true;
    return true;
  });
}
