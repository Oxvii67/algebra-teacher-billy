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

/** Words students use for "no solution" and "does not exist", mapped to the keys' canonical forms. */
const NO_SOLUTION = /^\s*(no(\s+real)?\s+(solutions?|roots?|zeros?)|∅|\\emptyset|\\varnothing|\{\s*\}|none)\s*\.?\s*$/i;
const DOES_NOT_EXIST = /^\s*(does\s*not\s*exist|doesn'?t\s*exist|dne|undefined)\s*\.?\s*$/i;

export function normalizeAnswer(raw: string): string {
  if (NO_SOLUTION.test(raw)) return "none";
  if (DOES_NOT_EXIST.test(raw)) return "dne";
  return raw
    .toLowerCase()
    .replace(/\\left(?!arrow)|\\right(?!arrow)|\\,|\\;|\\!/g, "")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\pi|π/g, "pi")
    .replace(/\\infty|∞|infinity/g, "inf")
    .replace(/\\cdot|\\times|×/g, "*")
    // Scientific notation typed with the letter x: 1.56x10^22 means 1.56 * 10^22.
    .replace(/(\d)\s*x\s*10\s*\^/g, "$1*10^")
    // LaTeX exponent braces: 10^{22} -> 10^(22).
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/\\leq?|≤|=</g, "<=")
    .replace(/\\geq?|≥|=>/g, ">=")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/√\s*(\d+|[a-z])/g, "sqrt($1)")
    .replace(/\\pm|\+\/-/g, "±")
    // Union of intervals: (-inf,1) U (3,inf).
    .replace(/∪|\\cup/g, ",")
    .replace(/([)\]])\s*u\s*(?=[([])/g, "$1,")
    .replace(/−/g, "-")
    .replace(/\b(or|and)\b|;/g, ",")
    .replace(/(^|,)\s*[a-z]\s*\(\s*[a-z]\s*\)\s*=\s*/g, "$1") // f(x) = ...
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
  // Points and intervals: same brackets, then compare entry by entry, so (3.0,-2) matches (3,-2).
  const wrap = /^([([])(.*)([)\]])$/;
  const ma = wrap.exec(a);
  const mb = wrap.exec(b);
  if (ma && mb && ma[1] === mb[1] && ma[3] === mb[3]) {
    const ia = splitTop(ma[2]);
    const ib = splitTop(mb[2]);
    if (ia.length > 1 && ia.length === ib.length) return ia.every((x, i) => itemsEqual(x, ib[i]));
  }
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

/** "1±sqrt(2)" is two answers. */
function expandPlusMinus(items: string[]): string[] {
  return items.flatMap((x) => (x.split("±").length === 2 ? [x.replace("±", "+"), x.replace("±", "-")].map((y) => y.replace(/^\+/, "")) : [x]));
}

const VAR = "(?:[fgh]\\([a-z]\\)|[a-df-hj-z])";
const OP = "(<=|>=|<|>)";
const ONE_SIDED = new RegExp(`^(${VAR})${OP}([^<>=]+)$`);
const ONE_SIDED_REV = new RegExp(`^([^<>=]+)${OP}(${VAR})$`);
const TWO_SIDED = new RegExp(`^([^<>=]+)${OP}(${VAR})${OP}([^<>=]+)$`);
const FLIP: Record<string, string> = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" };

function ray(variable: string, op: string, bound: string) {
  const closed = op.includes("=");
  return { variable, set: op.startsWith(">") ? `${closed ? "[" : "("}${bound},inf)` : `(-inf,${bound}${closed ? "]" : ")"}` };
}

/** x >= 2 becomes [2,inf) and 1 < x <= 4 becomes (1,4]. Null when the item is not an inequality in one variable. */
function inequalityToInterval(item: string): { variable: string; set: string } | null {
  let m = TWO_SIDED.exec(item);
  if (m) {
    const [, lo, op1, v, op2, hi] = m;
    if (op1[0] !== op2[0]) return null;
    return op1[0] === "<"
      ? { variable: v, set: `${op1 === "<=" ? "[" : "("}${lo},${hi}${op2 === "<=" ? "]" : ")"}` }
      : { variable: v, set: `${op2 === ">=" ? "[" : "("}${hi},${lo}${op1 === ">=" ? "]" : ")"}` };
  }
  if ((m = ONE_SIDED.exec(item))) return ray(m[1], m[2], m[3]);
  if ((m = ONE_SIDED_REV.exec(item))) return ray(m[3], FLIP[m[2]], m[1]);
  return null;
}

/** Comma-separated inequalities rewritten as intervals, domain (x) before range (y). Null when a reading would be a guess. */
function asIntervals(raw: string): string[] | null {
  const n = tidyBrackets(normalizeAnswer(raw));
  if (!/[<>]/.test(n)) return splitTop(n);
  const parts = splitTop(n).map((item) => inequalityToInterval(item) ?? { variable: "", set: item });
  if (parts.some((p) => /[<>=]/.test(p.set))) return null;
  const named = parts.filter((p) => p.variable);
  const repeats = new Set(named.map((p) => p.variable)).size < named.length;
  // Two conditions on one variable: a union only when the student wrote "or". "and" and commas go to review.
  if (repeats && (!/\bor\b/i.test(raw) || /\band\b/i.test(raw))) return null;
  if (!repeats && parts.length === 2 && parts[0].variable === "y" && parts[1].variable === "x") parts.reverse();
  return parts.map((p) => p.set);
}

const LABEL = /\b(domain|range|d|r)\s*(?::|=|\bis\b)\s*/gi;

/** Drops "D:" and "Range =" labels, putting a labeled domain ahead of a labeled range. */
function stripLabels(raw: string): string {
  const marks = [...raw.matchAll(LABEL)];
  if (!marks.length) return raw;
  if (marks.length === 2 && /^r/i.test(marks[0][1]) && /^d/i.test(marks[1][1]) && !raw.slice(0, marks[0].index).trim()) {
    const range = raw.slice(marks[0].index! + marks[0][0].length, marks[1].index).replace(/(?:[\s,;]|\band\b)+$/i, "");
    return `${raw.slice(marks[1].index! + marks[1][0].length)}, ${range}`;
  }
  return raw.replace(LABEL, "");
}

function domainRange(raw: string): string {
  return raw
    .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
    .replace(/\b(?:all\s+real(?:s|\s+numbers?)?)\b|ℝ|\\mathbb\{R\}/gi, "(-inf, inf)")
    .replace(/\bis\s+(?=[<>])/gi, "");
}

/** Keys from a model sometimes carry a stray bracket: "[2,inf),[0,inf))" or "([2,inf),[0,inf))". */
function tidyBrackets(n: string): string {
  const depth = (s: string) => [...s].reduce((d, c) => d + ("([".includes(c) ? 1 : ")]".includes(c) ? -1 : 0), 0);
  if (!n.includes("inf")) return n;
  if (depth(n) === -1 && /[)\]]\)$/.test(n)) return n.slice(0, -1);
  const m = /^\(([([].*[)\]])\)$/.exec(n);
  return m && splitTop(m[1]).length > 1 && splitTop(m[1]).every((x) => depth(x) === 0) ? m[1] : n;
}

/** Question wording that decides how an answer is read. */
export interface GradeContext {
  instructions?: string;
}

/** Instant grading: lists in any order, numeric and symbolic equivalence, inequalities against intervals. */
export function answersMatch(student: string, key: string, ctx: GradeContext = {}): boolean {
  const pair = /\bdomain\b/i.test(ctx.instructions ?? "") && /\brange\b/i.test(ctx.instructions ?? "");
  const labeled = /\bdomain\b|\brange\b/i.test(ctx.instructions ?? "");
  const st = labeled ? stripLabels(domainRange(student)) : student;
  const kt = labeled ? stripLabels(domainRange(key)) : key;
  const s = tidyBrackets(normalizeAnswer(st));
  const k = tidyBrackets(normalizeAnswer(kt));
  if (!s) return false;
  if (s === k) return true;
  let sa = expandPlusMinus(splitTop(s));
  let ka = expandPlusMinus(splitTop(k));
  if (/[<>]/.test(s) || /[<>]/.test(k)) {
    const si = asIntervals(st);
    const ki = asIntervals(kt);
    // A bare (2,3) could be a point, so an inequality only matches a key that is clearly a set.
    const keyIsSet = /[<>[\]]|inf/.test(k);
    const studentIsSet = /[<>[\]]|inf/.test(s);
    if (si && ki && keyIsSet && studentIsSet) {
      sa = si;
      ka = ki;
    }
  }
  if (sa.length !== ka.length) return false;
  // Domain and range are not interchangeable.
  if (pair) return sa.every((x, i) => itemsEqual(x, ka[i]));
  const used = new Array(ka.length).fill(false);
  return sa.every((x) => {
    const j = ka.findIndex((y, idx) => !used[idx] && itemsEqual(x, y));
    if (j < 0) return false;
    used[j] = true;
    return true;
  });
}

/** LaTeX preview of what the student typed. */
export function previewLatex(raw: string): string {
  return raw
    .replace(/\*/g, "\\cdot ")
    .replace(/sqrt\(([^()]+)\)/g, "\\sqrt{$1}")
    .replace(/<=|=<|≤/g, "\\le ")
    .replace(/>=|=>|≥/g, "\\ge ")
    .replace(/!=|≠/g, "\\ne ")
    .replace(/\+\/-|±/g, "\\pm ")
    .replace(/(?<![a-z\\])(infinity|inf|∞)(?![a-z])/gi, "\\infty ")
    .replace(/(?<![a-z\\])pi(?![a-z])/gi, "\\pi ")
    .replace(/(?<![a-z\\])(domain|range|all real numbers|no solution|or|and|[dr](?=\s*:))(?![a-z])/gi, "\\text{ $1 }");
}
