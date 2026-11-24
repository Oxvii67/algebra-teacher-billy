"use client";

import { asRecord, createLive, createSession } from "./store";
import type { ChallengeResult, SolveResult } from "@/lib/types";

export type StudioTab = "image" | "draw" | "type";

export interface StudioSession {
  tab: StudioTab;
  result: SolveResult | null;
  /** The Binder entry for result. */
  savedId: string | null;
  challenge: ChallengeResult | null;
}

function isResult(v: unknown): v is SolveResult {
  const r = asRecord(v);
  return (
    typeof r.problemLatex === "string" &&
    ["steps", "skills", "prerequisites", "commonMistakes", "graphExpressions"].every((k) => Array.isArray(r[k])) &&
    Array.isArray(asRecord(r.verification).corrections)
  );
}

export const studioSession = createSession<StudioSession>({
  name: "studio",
  initial: { tab: "image", result: null, savedId: null, challenge: null },
  revive: (raw) => {
    const r = asRecord(raw);
    return {
      tab: r.tab === "draw" || r.tab === "type" ? r.tab : "image",
      result: isResult(r.result) ? r.result : null,
      savedId: typeof r.savedId === "string" ? r.savedId : null,
      challenge: typeof asRecord(r.challenge).problemLatex === "string" ? (r.challenge as ChallengeResult) : null,
    };
  },
});

export const studioLive = createLive<{ busy: boolean; startedAt: number; error: string | null }>({ busy: false, startedAt: 0, error: null });
