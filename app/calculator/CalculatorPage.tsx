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
        <h1 className="font-serif text-3xl font-semibold">Graphing Calculator</h1>
        <p className="mt-1 text-sm text-muted">
          Type y = ..., f(x) = ..., x = c, or an equation like x^2 = 2x + 3 to see both sides. Letters other than x become sliders. Click a gray point
          to label it.
        </p>
      </header>
      <GraphCalculator key={key} initial={initial} />
    </div>
  );
}
