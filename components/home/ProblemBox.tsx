"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Camera, PenTool } from "lucide-react";
import { MathInline } from "@/components/math/Math";

const TRY = ["2x^2 - 8x + 6 = 0", "\\log_2(x) + \\log_2(x - 2) = 3", "|2x - 5| = 9"];

/** The hero's problem box: type a problem and land on the solver with it already running. */
export function ProblemBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const go = (latex: string) => {
    const q = latex.trim();
    if (q) router.push(`/studio?q=${encodeURIComponent(q)}`);
  };

  return (
    <div>
      <form
        className="flex flex-col gap-2 rounded-[14px] border border-line bg-surface p-2 transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)] sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
      >
        <label htmlFor="hero-problem" className="sr-only">
          Your math problem
        </label>
        <input
          id="hero-problem"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a problem, like 3x - 7 = 11"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-[15px] text-text outline-none placeholder:font-sans placeholder:text-muted"
        />
        <button type="submit" className="btn-primary" disabled={!value.trim()}>
          Solve it <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
        <Link href="/studio?mode=image" className="inline-flex items-center gap-1.5 hover:text-text">
          <Camera className="h-4 w-4" /> Upload a photo
        </Link>
        <Link href="/studio?mode=draw" className="inline-flex items-center gap-1.5 hover:text-text">
          <PenTool className="h-4 w-4" /> Write it by hand
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">Or try</span>
        {TRY.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => go(t)}
            className="rounded-[8px] border border-line px-2.5 py-1 text-[13px] transition-colors duration-150 hover:border-text/40 hover:bg-surface-2"
          >
            <MathInline latex={t} />
          </button>
        ))}
      </div>
    </div>
  );
}
