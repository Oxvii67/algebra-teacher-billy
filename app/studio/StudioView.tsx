"use client";

import { useState } from "react";
import { StudioInput } from "@/components/studio/StudioInput";
import type { SolveInput } from "@/lib/types";
import { MathBlock } from "@/components/math/Math";

export function StudioView() {
  const [input, setInput] = useState<SolveInput | null>(null);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Math Studio</h1>
        <p className="mt-1 text-muted">Give me one problem. Photograph it, draw it, or type it.</p>
      </header>
      <StudioInput onSubmit={setInput} />
      {input && (
        <div className="card p-4">
          {input.kind === "text" ? (
            <MathBlock latex={input.latex} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={input.dataUrl} alt="Submitted problem" className="max-h-64 rounded border border-line bg-white" />
          )}
        </div>
      )}
    </div>
  );
}
