"use client";

import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import { Fragment } from "react";

function cleanLatex(s: string): string {
  return s
    .trim()
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\$([\s\S]*)\$$/, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .trim();
}

function Fallback({ latex }: { latex: string }) {
  return <span className="math-error">{latex.replace(/\\/g, " ").replace(/[{}]/g, "")}</span>;
}

export function MathBlock({ latex, className }: { latex: string; className?: string }) {
  const m = cleanLatex(latex);
  if (!m) return null;
  return (
    <div className={className}>
      <BlockMath math={m} renderError={() => <Fallback latex={m} />} />
    </div>
  );
}

export function MathInline({ latex }: { latex: string }) {
  const m = cleanLatex(latex);
  if (!m) return null;
  return <InlineMath math={m} renderError={() => <Fallback latex={m} />} />;
}

type Segment = { type: "text" | "inline" | "block"; value: string };

export function splitMath(input: string): Segment[] {
  const out: Segment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m.index > last) out.push({ type: "text", value: input.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "block", value: m[1] });
    else if (m[2] !== undefined) out.push({ type: "block", value: m[2] });
    else if (m[3] !== undefined) out.push({ type: "inline", value: m[3] });
    else out.push({ type: "inline", value: m[4] });
    last = re.lastIndex;
  }
  if (last < input.length) out.push({ type: "text", value: input.slice(last) });
  return out;
}

function renderText(t: string, key: string) {
  // Minimal **bold** support for teacher emphasis, preserving line breaks.
  const parts = t.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Fragment key={key}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>
            {p.split("\n").map((line, j, arr) => (
              <Fragment key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </Fragment>
        ),
      )}
    </Fragment>
  );
}

/** Renders prose that contains $inline$ and $$block$$ math. Raw LaTeX never reaches the student. */
export function MathText({ text, className, inline = false }: { text: string; className?: string; inline?: boolean }) {
  const segs = splitMath(text ?? "");
  const Tag = inline ? "span" : "div";
  return (
    <Tag className={className}>
      {segs.map((s, i) =>
        s.type === "text" ? (
          renderText(s.value, String(i))
        ) : s.type === "inline" ? (
          <MathInline key={i} latex={s.value} />
        ) : (
          inline ? <MathInline key={i} latex={s.value} /> : <MathBlock key={i} latex={s.value} />
        ),
      )}
    </Tag>
  );
}
