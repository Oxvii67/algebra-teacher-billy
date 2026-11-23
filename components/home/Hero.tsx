"use client";

import Link from "next/link";
import { useState } from "react";
import { ListChecks, MessageSquare, PlayCircle, ShieldCheck } from "lucide-react";
import { MathBlock, MathText } from "@/components/math/Math";
import { EXAMPLES } from "@/lib/examples";

const TRUST = [
  { icon: ShieldCheck, text: "Line-by-line verified" },
  { icon: PlayCircle, text: "Prerequisite video lessons" },
  { icon: MessageSquare, text: "Teacher pushback chat" },
];

const STEP_DELAY = 260;

export function Hero() {
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const ex = EXAMPLES[active];
  const r = ex.result;
  const doneAt = 180 + r.steps.length * STEP_DELAY;

  return (
    <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-12">
      <div className="min-w-0">
        <h1 className="font-display leading-[0.92]" style={{ fontStretch: "125%" }}>
          <span className="block text-[clamp(1.35rem,1rem+1.6vw,2.1rem)] font-bold tracking-tight text-muted">Algebra Teacher</span>
          <span className="block text-[clamp(4.25rem,2.4rem+8vw,8.5rem)] font-black tracking-[-0.035em]">Billy</span>
        </h1>
        <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed">
          Send me one problem. I work it line by line, plug the answer back in to prove it, and tell you which skill to fix first. You do the thinking; I make sure it holds up.
        </p>

        <ul className="mt-5 flex flex-wrap gap-2" aria-label="What every solution includes">
          {TRUST.map(({ icon: Icon, text }) => (
            <li key={text} className="pill">
              <Icon className="h-4 w-4 text-accent" />
              {text}
            </li>
          ))}
        </ul>

        <div className="mt-7">
          <p className="text-sm font-semibold text-muted" id="examples-label">
            Try an Algebra 2 example
          </p>
          <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-labelledby="examples-label">
            {EXAMPLES.map((e, i) => (
              <button
                key={e.slug}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-controls="whiteboard"
                onClick={() => {
                  setActive(i);
                  setRun((n) => n + 1);
                }}
                className={`rounded-[10px] border px-3.5 py-2 text-sm font-semibold transition-[background-color,border-color,box-shadow] duration-150 ${
                  i === active ? "border-text bg-text text-bg shadow-elev-2" : "border-line bg-surface shadow-elev-1 hover:border-accent/60"
                }`}
              >
                {e.chip}
              </button>
            ))}
          </div>
        </div>

        <Ctas className="mt-7 hidden lg:flex" />
      </div>

      {/* The whiteboard: the one moment that animates on its own. */}
      <div id="whiteboard" role="tabpanel" aria-label={`${ex.chip} worked by Billy`} className="min-w-0">
        <div className="graph-paper relative overflow-hidden rounded-[22px] border border-line shadow-elev-3">
          <div className="flex items-center gap-3 border-b border-line bg-surface/90 px-5 py-3 backdrop-blur-sm">
            <span className="text-sm font-bold">{r.topic}</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-success">
              <ListChecks className="h-4 w-4" /> {r.steps.length} steps, checked
            </span>
          </div>

          <div key={`${active}-${run}`} className="wb px-4 pb-5 pt-3 sm:px-6">
            <div className="write-in text-[1.2rem] [&_.katex-display]:py-1.5">
              <MathBlock latex={r.problemLatex} />
            </div>

            <ol className="mt-1">
              {r.steps.map((s, i) => (
                <li
                  key={i}
                  className="write-in grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-2 border-t border-dashed border-line/80 py-0.5"
                  style={{ animationDelay: `${180 + i * STEP_DELAY}ms` }}
                >
                  <span className="text-xs font-bold tabular-nums text-muted">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[0.92rem]">
                      <MathBlock latex={s.latex} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="write-in relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2" style={{ animationDelay: `${doneAt}ms` }}>
              <div className="relative rounded-xl border-2 border-text/80 bg-surface px-4 py-1.5 text-[1.05rem]">
                <MathBlock latex={r.finalAnswerLatex} />
                <svg className="pointer-events-none absolute -inset-x-3 -inset-y-2.5 h-[calc(100%+1.25rem)] w-[calc(100%+1.5rem)] overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
                  <path
                    className="pen-stroke"
                    pathLength={1}
                    style={{ ["--len" as string]: 1, animationDelay: `${doneAt + 380}ms` }}
                    d="M14 9 C 34 1, 80 1, 95 12 C 103 20, 92 34, 60 38 C 30 41, 2 35, 3 22 C 4 13, 18 7, 42 5"
                    fill="none"
                    stroke="var(--danger)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <svg width="34" height="28" viewBox="0 0 34 28" aria-hidden="true" className="shrink-0">
                <path
                  className="pen-stroke"
                  pathLength={1}
                  style={{ ["--len" as string]: 1, animationDelay: `${doneAt + 900}ms` }}
                  d="M3 15 L12 24 L31 3"
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="write-in mt-3 rounded-xl bg-surface/90 p-3 text-sm leading-relaxed" style={{ animationDelay: `${doneAt + 500}ms` }}>
              <MathText text={r.verification.check} />
            </div>

            <Link href={`/studio?example=${ex.slug}`} className="btn-ghost mt-4 w-full sm:w-auto">
              Open the full lesson: prerequisites, reasons, traps
            </Link>
          </div>
        </div>
        <Ctas className="mt-5 flex lg:hidden" />
      </div>
    </section>
  );
}

function Ctas({ className }: { className: string }) {
  return (
    <div className={`flex-wrap gap-2 ${className}`}>
      <Link href="/studio" className="btn-primary px-5 py-3 text-[15px]">
        Solve your own problem
      </Link>
      <Link href="/tutor" className="btn-ghost px-5 py-3 text-[15px]">
        Ask Billy a question
      </Link>
    </div>
  );
}
