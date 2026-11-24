"use client";

import { MathText } from "./Math";

const RULE = /^\s*\**\s*(Rule|Theorem|Property|Definition|Key idea|Remember|Formula|Identity|Law)\s*\**\s*:\s*\**\s*/i;
const WARN = /^\s*\**\s*(Careful|Watch out|Trap|Common mistake|Mistake)\s*\**\s*:\s*\**\s*/i;
const STEP = /^\s*(?:Step\s*)?(\d{1,2})[.):]\s+/i;

type Block = { kind: "p" | "rule" | "warn"; label?: string; text: string } | { kind: "step"; n: number; text: string };

/** Splits a teacher reply into paragraphs, numbered steps, and rule or warning callouts. */
function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split(/\n{2,}|\n(?=\s*(?:Step\s*)?\d{1,2}[.):]\s)|\n(?=\s*\**\s*(?:Rule|Theorem|Property|Definition|Key idea|Remember|Formula|Identity|Law|Careful|Watch out|Trap|Common mistake|Mistake)\s*\**\s*:)/i)) {
    const t = raw.trim();
    if (!t) continue;
    let m: RegExpExecArray | null;
    if ((m = STEP.exec(t))) blocks.push({ kind: "step", n: Number(m[1]), text: t.slice(m[0].length) });
    else if ((m = RULE.exec(t))) blocks.push({ kind: "rule", label: m[1], text: t.slice(m[0].length) });
    else if ((m = WARN.exec(t))) blocks.push({ kind: "warn", label: m[1], text: t.slice(m[0].length) });
    else blocks.push({ kind: "p", text: t });
  }
  return blocks;
}

export function WorksheetText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parse(text ?? "");
  return (
    <div className={`space-y-2.5 ${className}`}>
      {blocks.map((b, i) => {
        if (b.kind === "step") {
          return (
            <div key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start">
              <span className="num pt-[0.15rem] text-xs text-highlight">
                <span className="step-badge">{String(b.n).padStart(2, "0")}</span>
              </span>
              <MathText text={b.text} />
            </div>
          );
        }
        if (b.kind === "rule" || b.kind === "warn") {
          return (
            <div key={i} className="callout" style={b.kind === "warn" ? { ["--rule" as string]: "var(--danger)" } : undefined}>
              <div className="eyebrow mb-0.5" style={{ color: b.kind === "warn" ? "var(--danger)" : "var(--accent-ink)" }}>
                {b.label}
              </div>
              <MathText text={b.text} />
            </div>
          );
        }
        return <MathText key={i} text={b.text} />;
      })}
    </div>
  );
}
