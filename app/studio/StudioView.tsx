"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { StudioInput, type StudioTab } from "@/components/studio/StudioInput";
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
  const params = useSearchParams();
  const example = exampleBySlug(params.get("example"));
  // A problem typed on the home page arrives as ?q= and starts solving at once.
  const q = params.get("q")?.trim().slice(0, 4000) ?? "";
  const modeParam = params.get("mode");
  const initialTab: StudioTab = q ? "type" : modeParam === "draw" || modeParam === "type" ? modeParam : "image";
  const startedQ = useRef(false);
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

  useEffect(() => {
    if (!q || startedQ.current || example) return;
    startedQ.current = true;
    void solve({ kind: "text", latex: q });
    // solve is stable for this purpose; run once per arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, example]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Solve a problem</h1>
          <p className="mt-2 text-muted">{example && result === example.result ? "A worked example. Read the reason beside each line." : "One problem at a time. Add a screenshot, draw it, or use the keypad."}</p>
        </div>
        {result && (
          <button type="button" className="btn-ghost" onClick={() => setResult(null)}>
            <RotateCcw className="h-4 w-4" /> New problem
          </button>
        )}
      </header>

      <div hidden={!!result}>
        <StudioInput onSubmit={solve} busy={busy} initialTab={initialTab} initialLatex={q} />
      </div>

      {busy && (
        <div className="card flex items-center gap-3 p-4" role="status" aria-live="polite">
          <LoaderCircle className="h-5 w-5 animate-spin text-accent" />
          <div>
            <div className="font-medium">{STAGES[stage]}</div>
            <div className="text-[13px] text-muted">Usually 8 to 20 seconds. Billy checks the answer before you see it.</div>
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
