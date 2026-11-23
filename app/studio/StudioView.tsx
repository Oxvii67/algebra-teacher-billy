"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { StudioInput } from "@/components/studio/StudioInput";
import { SolutionView } from "@/components/solve/SolutionView";
import { useData } from "@/lib/data/DataProvider";
import type { SavedSolution, SolveInput, SolveResult } from "@/lib/types";
import { exampleBySlug } from "@/lib/examples";
import { compressImage } from "@/lib/image-compress";

const STAGES = ["Reading the problem", "Working every step", "Plugging the answer back in", "Matching prerequisite lessons"];

export function StudioView() {
  const { saveSolution, moveSolution, folders, recordActivity } = useData();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const example = exampleBySlug(useSearchParams().get("example"));
  const [result, setResult] = useState<SolveResult | null>(example?.result ?? null);
  const [saved, setSaved] = useState<SavedSolution | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 3500);
    return () => clearInterval(t);
  }, [busy]);

  const solve = async (input: SolveInput) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "solve", input: input.kind === "image" ? { ...input, dataUrl: await compressImage(input.dataUrl) } : input }),
      });
      const data = await res.json().catch(() => ({ error: "The server returned an unreadable response." }));
      if (!res.ok) throw new Error(data.error ?? "Solve failed.");
      const r = data as SolveResult;
      setResult(r);
      setSaved(await saveSolution(r));
      recordActivity({ xp: 15, skill: r.topic });
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Solve a problem</h1>
          <p className="mt-2 text-muted">{example && result === example.result ? "A worked example from Billy. Read the reasons, not just the lines." : "One problem at a time. Photograph it, draw it, or type it."}</p>
        </div>
        {result && (
          <button type="button" className="btn-ghost" onClick={() => setResult(null)}>
            <RotateCcw className="h-4 w-4" /> New problem
          </button>
        )}
      </header>

      <div hidden={!!result}>
        <StudioInput onSubmit={solve} busy={busy} />
      </div>

      {busy && (
        <div className="card flex items-center gap-3 p-4" role="status" aria-live="polite">
          <LoaderCircle className="h-5 w-5 animate-spin text-accent" />
          <div>
            <div className="font-medium">{STAGES[stage]}</div>
            <div className="text-xs text-muted">One pass: Billy solves it and substitutes the answer back in before you see it. Usually 8 to 20 seconds.</div>
          </div>
        </div>
      )}
      {error && <div className="card border-danger p-4 text-sm text-danger">{error}</div>}

      <div ref={topRef} />
      {result && (
        <SolutionView
          result={result}
          onSolveChallenge={(latex) => solve({ kind: "text", latex })}
          toolbar={
            saved && (
              <select
                className="input w-44 py-1 text-xs"
                value={saved.folder_id ?? ""}
                onChange={(e) => {
                  const fid = e.target.value || null;
                  moveSolution(saved.id, fid);
                  setSaved({ ...saved, folder_id: fid });
                }}
                aria-label="Save to folder"
              >
                <option value="">Saved to History</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    Folder: {f.name}
                  </option>
                ))}
              </select>
            )
          }
        />
      )}
    </div>
  );
}
