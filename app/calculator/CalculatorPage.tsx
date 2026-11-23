"use client";

import { useSearchParams } from "next/navigation";
import { GraphCalculator } from "@/components/calculator/GraphCalculator";

export function CalculatorPage() {
  const params = useSearchParams();
  const initial = params.getAll("e").map((e) => e.slice(0, 300)).filter(Boolean).slice(0, 8);
  const key = initial.join("|");
  return (
    <div className="space-y-5">
      <header>
        <h1 className="page-title">Graphing calculator</h1>
        <p className="mt-2 text-muted">
          Type <span className="num text-text">y = x^2 - 4</span> or any equation. Extra letters become sliders.
        </p>
      </header>
      <GraphCalculator key={key} initial={initial} />
    </div>
  );
}
