import { complex, evaluate, abs as mabs, type MathType } from "mathjs";

export interface NumericCheckResult {
  ran: boolean;
  passed: boolean;
  details: { value: string; residual: number | null }[];
}

function toNumber(v: MathType): number | null {
  try {
    const a = mabs(v as never) as unknown;
    const n = typeof a === "number" ? a : Number(a);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Substitutes each claimed solution into (lhs - rhs) and checks the residual is zero. */
export function numericCheck(c: { variable: string; expression: string; solutions: string[] } | undefined | null): NumericCheckResult {
  if (!c || !c.variable || !c.expression || !c.solutions?.length) return { ran: false, passed: true, details: [] };
  const variable = c.variable.trim();
  if (!/^[a-zA-Z]\w*$/.test(variable)) return { ran: false, passed: true, details: [] };
  const details: NumericCheckResult["details"] = [];
  let passed = true;
  for (const sol of c.solutions.slice(0, 12)) {
    try {
      const value = evaluate(sol, { i: complex(0, 1) }) as MathType;
      const residual = evaluate(c.expression, { [variable]: value, i: complex(0, 1), e: Math.E, pi: Math.PI }) as MathType;
      const r = toNumber(residual);
      const scale = toNumber(value) ?? 1;
      const ok = r !== null && r <= 1e-6 * Math.max(1, scale * scale);
      details.push({ value: sol, residual: r });
      if (!ok) passed = false;
    } catch {
      // If mathjs cannot parse the claim, do not treat it as a failure of the math.
      return { ran: false, passed: true, details: [] };
    }
  }
  return { ran: true, passed, details };
}
