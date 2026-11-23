"use client";

import katex from "katex";
import { Fragment, useMemo } from "react";

/*
 * Math is rendered with the top-level katex package so the generated HTML always matches the
 * katex.min.css imported in app/layout.tsx. (react-katex bundled its own older KaTeX, whose class
 * names no longer match the stylesheet, which broke subscripts and other sized elements.)
 */

function cleanLatex(s: string): string {
  return s
    .trim()
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\$([\s\S]*)\$$/, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .trim();
}

const cache = new Map<string, string | null>();

function render(latex: string, displayMode: boolean): string | null {
  const key = (displayMode ? "D" : "I") + latex;
  if (cache.has(key)) return cache.get(key)!;
  let html: string | null;
  try {
    html = katex.renderToString(latex, { displayMode, throwOnError: true, strict: "ignore", trust: false, output: "htmlAndMathml" });
  } catch {
    html = null;
  }
  if (cache.size > 2000) cache.clear();
  cache.set(key, html);
  return html;
}

/** Shown only if KaTeX cannot parse the input: readable text, never raw backslash commands. */
function Fallback({ latex }: { latex: string }) {
  return <span className="math-error">{latex.replace(/\\[a-zA-Z]+/g, " ").replace(/[{}\\]/g, "").replace(/\s+/g, " ").trim()}</span>;
}

export function MathBlock({ latex, className }: { latex: string; className?: string }) {
  const m = cleanLatex(latex ?? "");
  const html = useMemo(() => (m ? render(m, true) : null), [m]);
  if (!m) return null;
  return <div className={className}>{html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <Fallback latex={m} />}</div>;
}

export function MathInline({ latex }: { latex: string }) {
  const m = cleanLatex(latex ?? "");
  const html = useMemo(() => (m ? render(m, false) : null), [m]);
  if (!m) return null;
  return html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : <Fallback latex={m} />;
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
