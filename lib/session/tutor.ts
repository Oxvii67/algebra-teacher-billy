"use client";

import { asRecord, createLive, createSession } from "./store";
import type { ChatMessage } from "@/lib/types";

export interface Thread {
  id: string;
  /** LaTeX of the problem this chat was opened from, or "". */
  problem: string;
  messages: ChatMessage[];
  chips: string[];
  updated: number;
}

export interface TutorSession {
  threads: Thread[];
  /** Null is a fresh chat that has no messages yet. */
  activeId: string | null;
  draft: string;
}

const MAX_THREADS = 20;
const MAX_MESSAGES = 200;

function reviveThread(raw: unknown): Thread | null {
  const t = asRecord(raw);
  if (typeof t.id !== "string" || !Array.isArray(t.messages)) return null;
  const messages = (t.messages as unknown[])
    .map(asRecord)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }) as ChatMessage);
  return {
    id: t.id,
    problem: typeof t.problem === "string" ? t.problem : "",
    messages,
    chips: Array.isArray(t.chips) ? t.chips.filter((c): c is string => typeof c === "string") : [],
    updated: typeof t.updated === "number" ? t.updated : 0,
  };
}

/** Newest first. Chats with no messages are kept only while open. */
export function tidy(s: TutorSession): TutorSession {
  const threads = s.threads
    .filter((t) => t.messages.length || t.id === s.activeId)
    .sort((a, b) => b.updated - a.updated)
    .slice(0, MAX_THREADS)
    .map((t) => (t.messages.length > MAX_MESSAGES ? { ...t, messages: t.messages.slice(-MAX_MESSAGES) } : t));
  return { ...s, threads, activeId: threads.some((t) => t.id === s.activeId) ? s.activeId : null };
}

export const tutorSession = createSession<TutorSession>({
  name: "tutor",
  initial: { threads: [], activeId: null, draft: "" },
  revive: (raw) => {
    const r = asRecord(raw);
    return tidy({
      threads: (Array.isArray(r.threads) ? r.threads : []).map(reviveThread).filter((t): t is Thread => !!t),
      activeId: typeof r.activeId === "string" ? r.activeId : null,
      draft: typeof r.draft === "string" ? r.draft : "",
    });
  },
  merge: (a, g) => {
    const have = new Set(a.threads.map((t) => t.id));
    return tidy({ threads: [...a.threads, ...g.threads.filter((t) => !have.has(t.id))], activeId: g.activeId ?? a.activeId, draft: g.draft || a.draft });
  },
  trim: (s) => ({ ...s, threads: s.threads.slice(0, 5) }),
});

/** Per chat: whether Billy is writing, and the last failure. */
export const tutorLive = createLive<Record<string, { busy: boolean; error: string | null }>>({});
