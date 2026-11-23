"use client";

import { useState } from "react";
import { ChevronsDown, Eye, ListOrdered } from "lucide-react";
import { MathBlock, MathText } from "@/components/math/Math";
import type { SolutionStep } from "@/lib/types";

/**
 * Numbered worked steps. Students can switch to one-step-at-a-time mode and predict
 * each next line before revealing it.
 */
export function StepList({ steps, allowReveal = true }: { steps: SolutionStep[]; allowReveal?: boolean }) {
  const [stepMode, setStepMode] = useState(false);
  const [shown, setShown] = useState(1);
  const visible = stepMode ? steps.slice(0, shown) : steps;
  const remaining = steps.length - shown;

  return (
    <div>
      {allowReveal && steps.length > 2 && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="btn-ghost btn-sm"
            aria-pressed={stepMode}
            onClick={() => {
              setStepMode((m) => !m);
              setShown(1);
            }}
          >
            {stepMode ? <Eye className="h-3.5 w-3.5" /> : <ListOrdered className="h-3.5 w-3.5" />}
            {stepMode ? "Show all steps" : "One step at a time"}
          </button>
        </div>
      )}
      <ol className="relative space-y-3">
        <span className="absolute bottom-4 left-[15px] top-4 w-px bg-line" aria-hidden="true" />
        {visible.map((s, i) => (
          <li key={i} className={`relative flex gap-3 ${stepMode && i === shown - 1 && i > 0 ? "step-in" : ""}`}>
            <span className="relative z-[1] mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-surface text-sm font-black tabular-nums text-accent">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-line bg-surface p-3.5 shadow-elev-1">
              <MathText text={s.explanation} className="text-[0.95rem] leading-relaxed" />
              {s.latex?.trim() && <MathBlock latex={s.latex} className="mt-1 [&_.katex-display]:mb-0 [&_.katex-display]:pb-0" />}
            </div>
          </li>
        ))}
      </ol>
      {stepMode && remaining > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 pl-11">
          <button type="button" className="btn-primary" onClick={() => setShown((n) => n + 1)}>
            <ChevronsDown className="h-4 w-4" /> Reveal step {shown + 1}
          </button>
          <span className="text-sm text-muted">Write your next line on paper first, then check it.</span>
        </div>
      )}
    </div>
  );
}
