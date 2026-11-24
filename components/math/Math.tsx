"use client";

import katex from "katex";
import { Fragment, useMemo } from "react";

/*
 * Math is rendered with the top-level katex package so the generated HTML always matches the
 * katex.min.css imported in app/layout.tsx. (react-katex bundled its own older KaTeX, whose class
 * names no longer match the stylesheet, which broke subscripts and other sized elements.)
 */

/**
 * Models sometimes over-escape: "\\\\times" arrives as \\times, which KaTeX reads as a line break
 * followed by the letters "times". A real line break is never glued to a command name, so collapse it.
 */
export function fixOverEscaped(s: string): string {
  return s.replace(/\\\\(?=[a-zA-Z]{2,})/g, "\\");
}

function cleanLatex(s: string): string {
  return fixOverEscaped(s)
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

/** True when a "LaTeX" field is really prose with $...$ math inside, as models sometimes send. */
function isMixed(s: string): boolean {
  return /\$[^$]+\$|\\\(|\\\[/.test(s) && !/^\s*\$[^$]*\$\s*$/.test(s);
}

/** Display math. Use as="span" inside buttons and other phrasing-only elements, where a div is invalid HTML. */
export function MathBlock({ latex, className, as: Tag = "div" }: { latex: string; className?: string; as?: "div" | "span" }) {
  if (isMixed(latex ?? "")) return <MathText text={latex} className={className} inline={Tag === "span"} />;
  const m = cleanLatex(latex ?? "");
  const html = useMemo(() => (m ? render(m, true) : null), [m]);
  if (!m) return null;
  const cls = Tag === "span" ? `block ${className ?? ""}` : className;
  return <Tag className={cls}>{html ? <Tag className={Tag === "span" ? "block" : undefined} dangerouslySetInnerHTML={{ __html: html }} /> : <Fallback latex={m} />}</Tag>;
}

export function MathInline({ latex }: { latex: string }) {
  if (isMixed(latex ?? "")) return <MathText text={latex} inline />;
  const m = cleanLatex(latex ?? "");
  const html = useMemo(() => (m ? render(m, false) : null), [m]);
  if (!m) return null;
  return html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : <Fallback latex={m} />;
}

/** Math as a button's whole content: drawn for the eye, spoken in words, read once. */
export function MathLabel({ latex, say }: { latex: string; say: string }) {
  return (
    <>
      <span aria-hidden="true">
        <MathInline latex={latex} />
      </span>
      <span className="sr-only">{say}</span>
    </>
  );
}

type Segment = { type: "text" | "inline" | "block"; value: string };

/**
 * LaTeX a model left outside $...$ in prose ("e.g., a\\times10^{b}"): treat each whitespace-separated
 * run that contains a backslash command as inline math, trimming sentence punctuation and an
 * unmatched closing bracket so "(e.g., a\\times10^{b})." keeps its parenthesis as text.
 */
function bareLatex(text: string): Segment[] {
  if (!/\\[a-zA-Z]{2,}/.test(text)) return [{ type: "text", value: text }];
  const out: Segment[] = [];
  const re = /\S*\\[a-zA-Z]{2,}\S*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let tok = m[0];
    let lead = "";
    let trail = "";
    while (/^[(\[]/.test(tok) && (tok.match(/[([]/g)?.length ?? 0) > (tok.match(/[)\]]/g)?.length ?? 0)) {
      lead += tok[0];
      tok = tok.slice(1);
    }
    while (/[.,;:!?]$/.test(tok) || (/[)\]]$/.test(tok) && (tok.match(/[)\]]/g)?.length ?? 0) > (tok.match(/[([]/g)?.length ?? 0))) {
      trail = tok.slice(-1) + trail;
      tok = tok.slice(0, -1);
    }
    out.push({ type: "text", value: text.slice(last, m.index) + lead });
    out.push({ type: "inline", value: tok });
    out.push({ type: "text", value: trail });
    last = m.index + m[0].length;
  }
  out.push({ type: "text", value: text.slice(last) });
  return out.filter((x) => x.value !== "");
}

export function splitMath(input: string): Segment[] {
  const out: Segment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m.index > last) out.push(...bareLatex(input.slice(last, m.index)));
    if (m[1] !== undefined) out.push({ type: "block", value: m[1] });
    else if (m[2] !== undefined) out.push({ type: "block", value: m[2] });
    else if (m[3] !== undefined) out.push({ type: "inline", value: m[3] });
    else out.push({ type: "inline", value: m[4] });
    last = re.lastIndex;
  }
  if (last < input.length) out.push(...bareLatex(input.slice(last)));
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
