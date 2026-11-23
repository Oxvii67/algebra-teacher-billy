import { MathBlock, MathText } from "@/components/math/Math";
import type { SolutionStep } from "@/lib/types";

export function StepList({ steps }: { steps: SolutionStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-accent">{i + 1}</span>
          <div className="min-w-0 flex-1 rounded-lg border border-line p-3">
            <MathText text={s.explanation} className="text-sm leading-relaxed" />
            {s.latex?.trim() && <MathBlock latex={s.latex} className="mt-1" />}
          </div>
        </li>
      ))}
    </ol>
  );
}
