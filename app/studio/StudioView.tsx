"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { StudioInput } from "@/components/studio/StudioInput";
import { SolutionView } from "@/components/solve/SolutionView";
import { useData } from "@/lib/data/DataProvider";
import { currentOwner, useStore } from "@/lib/session/store";
import { studioLive, studioSession, type StudioTab } from "@/lib/session/studio";
import type { SolveInput, SolveResult } from "@/lib/types";
import { exampleBySlug } from "@/lib/examples";
import { compressImage } from "@/lib/image-compress";

const STAGES = ["Reading the problem", "Working every step", "Plugging the answer back in", "Matching prerequisite lessons"];
const STAGE_MS = 3500;
/** The newest solve wins the page; an older one still lands in the Binder. */
let latestRun = 0;

export function StudioView() {
  const { saveSolution, moveSolution, folders, solutions, recordActivity, ready } = useData();
  const session = useStore(studioSession);
  const { busy, startedAt, error } = useStore(studioLive);
  const [stage, setStage] = useState(0);
  const params = useSearchParams();
  const example = exampleBySlug(params.get("example"));
  // A problem typed on the home page arrives as ?q= and starts solving at once.
  const q = params.get("q")?.trim().slice(0, 4000) ?? "";
  const modeParam = params.get("mode");
  const [arrivalQ] = useState(q);
  const started = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  /** Until saved work is known, an arrival with a new problem never flashes the old solution. */
  const arriving = !!q || !!modeParam;
  const result = example?.result ?? (arriving ? null : session.result);
  const saved = !example && session.savedId ? (solutions.find((s) => s.id === session.savedId) ?? null) : null;
  const tab: StudioTab = arrivalQ && !ready ? "type" : session.tab;

  useEffect(() => {
    if (!busy) return;
    const tick = () => setStage(Math.min(STAGES.length - 1, Math.floor((Date.now() - startedAt) / STAGE_MS)));
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [busy, startedAt]);

  /** Runs to the end even if the student leaves the page; the solution is waiting when they return. */
  const solve = async (input: SolveInput) => {
    const run = ++latestRun;
    const owner = currentOwner();
    studioLive.set(() => ({ busy: true, startedAt: Date.now(), error: null }));
    if (example) {
      studioSession.set((s) => ({ ...s, result: example.result, savedId: null, challenge: null }));
      window.history.replaceState(null, "", "/studio");
    }
    let failed: string | null = null;
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "solve", input: input.kind === "image" ? { ...input, dataUrl: await compressImage(input.dataUrl) } : input }),
      });
      const data = await res.json().catch(() => ({ error: "The server returned an unreadable response." }));
      if (!res.ok) throw new Error(data.error ?? "Solve failed.");
      const r = data as SolveResult;
      if (run === latestRun) studioSession.set((s) => ({ ...s, result: r, savedId: null, challenge: null }), owner);
      const row = await saveSolution(r);
      studioSession.set((s) => (s.result === r ? { ...s, savedId: row.id } : s), owner);
      recordActivity({ xp: 15, skill: r.topic });
      if (run === latestRun) requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      failed = (e as Error).message;
    } finally {
      if (run === latestRun) studioLive.set((s) => ({ ...s, busy: false, error: failed }));
    }
  };

  const startNew = () => {
    studioSession.set((s) => ({ ...s, result: null, savedId: null, challenge: null }));
    studioLive.set((s) => ({ ...s, error: null }));
    if (example) window.history.replaceState(null, "", "/studio");
  };

  // Wait for sign-in state, so the solution is saved to the right place.
  useEffect(() => {
    if (!ready || started.current || example || !arriving) return;
    started.current = true;
    startNew();
    const t: StudioTab | null = q ? "type" : modeParam === "draw" || modeParam === "type" || modeParam === "image" ? modeParam : null;
    if (t) studioSession.set((s) => ({ ...s, tab: t }));
    // Drop the parameters so a refresh or the back button does not solve (and spend quota on) it again.
    window.history.replaceState(null, "", "/studio");
    if (q) void solve({ kind: "text", latex: q });
    // run once per arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, q, modeParam, example]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Solve a problem</h1>
          <p className="mt-2 text-muted">{example ? "A worked example. Read the reason beside each line." : "One problem at a time. Add a screenshot, draw it, or use the keypad."}</p>
        </div>
        {result && (
          <button type="button" className="btn-ghost" onClick={startNew}>
            <RotateCcw className="h-4 w-4" /> New problem
          </button>
        )}
      </header>

      <div hidden={!!result}>
        <StudioInput
          onSubmit={solve}
          busy={busy || !ready}
          tab={tab}
          onTab={(t) => studioSession.set((s) => ({ ...s, tab: t }))}
          owner={ready ? currentOwner() : null}
          initialLatex={arrivalQ}
        />
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
          // Remounts for a new problem, so its tabs and hints start closed.
          key={result.problemLatex}
          savedChallenge={session.challenge}
          onChallenge={example ? undefined : (c) => studioSession.set((s) => (s.result === result ? { ...s, challenge: c } : s))}
          onSolveChallenge={(latex) => solve({ kind: "text", latex })}
          toolbar={
            saved && (
              <select
                className="input w-44 py-1 text-xs"
                value={saved.folder_id ?? ""}
                onChange={(e) => {
                  const fid = e.target.value || null;
                  void moveSolution(saved.id, fid);
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
