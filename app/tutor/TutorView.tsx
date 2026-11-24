"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { MathBlock, MathText } from "@/components/math/Math";
import { WorksheetText } from "@/components/math/WorksheetText";
import { SavedNote } from "@/components/shell/SavedNote";
import { useData } from "@/lib/data/DataProvider";
import { uid } from "@/lib/data/local";
import { mathSpeech } from "@/lib/mathSpeech";
import { currentOwner, useStore } from "@/lib/session/store";
import { chatTitle, deleteChat, openChat, type Thread, tidy, tutorLive, tutorSession } from "@/lib/session/tutor";
import { useReadyText } from "@/lib/session/useReadyText";
import type { ChatMessage, TutorReply } from "@/lib/types";

const STARTERS = [
  "How do I factor a trinomial?",
  "Explain the logarithm rules",
  "I do not understand completing the square",
  "How do I solve rational equations?",
  "How do I solve exponential equations?",
  "How do I find domain and range?",
];

const OPENING = "I'm Billy. Ask me any math question and I'll work it out, every step. Math only. Try anything else and I'll have something to say about it.";

const PROBLEM_CHIPS = ["Walk me through the first step", "I think I know the first move", "What skill do I need here?"];

const setDraft = (draft: string) => tutorSession.set((s) => ({ ...s, draft }));

export function TutorView() {
  const params = useSearchParams();
  const arrival = params.get("p") ?? "";
  const { recordActivity, ready } = useData();
  const session = useStore(tutorSession);
  const live = useStore(tutorLive);
  const thread = session.threads.find((t) => t.id === session.activeId) ?? null;
  const problem = arrival || thread?.problem || "";
  const messages = arrival && thread?.problem !== arrival ? [] : (thread?.messages ?? []);
  const { busy, error } = (thread && live[thread.id]) || { busy: false, error: null };
  const chips = thread?.chips.length ? thread.chips : problem ? PROBLEM_CHIPS : STARTERS;
  const past = session.threads.filter((t) => t.messages.length);
  /** Sent, but the answer never came: the page was closed mid-reply, or the request failed. */
  const unanswered = !busy && messages[messages.length - 1]?.role === "user";
  const [input, setInput] = useReadyText(ready, session.draft, setDraft);
  const endRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    if (!messages.length && !busy) return;
    endRef.current?.scrollIntoView({ behavior: scrolled.current ? "smooth" : "instant", block: "end" });
    scrolled.current = true;
  }, [messages.length, busy, thread?.id]);

  // Arriving with a problem reopens the chat about it, or starts one.
  useEffect(() => {
    if (!ready || !arrival) return;
    tutorSession.set((s) => {
      const found = s.threads.find((t) => t.problem === arrival);
      if (found) return tidy({ ...s, activeId: found.id });
      const fresh: Thread = { id: uid(), problem: arrival, messages: [], chips: [], updated: Date.now() };
      return tidy({ ...s, threads: [fresh, ...s.threads], activeId: fresh.id });
    });
    window.history.replaceState(null, "", "/tutor");
  }, [arrival, ready]);

  /** Runs to the end even if the student leaves the page; the reply is waiting when they return. */
  const ask = async (id: string, history: ChatMessage[], about: string) => {
    const owner = currentOwner();
    const setLive = (v: { busy: boolean; error: string | null }) => tutorLive.set((l) => ({ ...l, [id]: v }));
    const patch = (fn: (t: Thread) => Thread) =>
      tutorSession.set((s) => tidy({ ...s, threads: s.threads.map((t) => (t.id === id ? { ...fn(t), updated: Date.now() } : t)) }), owner);
    setLive({ busy: true, error: null });
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-24), problemLatex: about || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The teacher did not respond.");
      const r = data as TutorReply;
      patch((t) => ({ ...t, messages: [...t.messages, { role: "assistant", content: r.reply }], chips: r.chips.length ? r.chips : t.chips }));
      setLive({ busy: false, error: null });
      if (r.verdict === "correct") recordActivity({ xp: 5, skill: r.skill, correct: true });
      else if (r.verdict === "incorrect") recordActivity({ xp: 1, skill: r.skill, correct: false });
      else if (r.verdict === "partial") recordActivity({ xp: 2, skill: r.skill });
    } catch (e) {
      setLive({ busy: false, error: (e as Error).message });
    }
  };

  const send = (text: string) => {
    const content = text.trim();
    if (!content || busy || !ready) return;
    const id = thread?.id ?? uid();
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    tutorSession.set((s) => {
      const base: Thread = s.threads.find((t) => t.id === id) ?? { id, problem, messages: [], chips: [], updated: 0 };
      return tidy({ ...s, activeId: id, draft: "", threads: [{ ...base, messages: next, updated: Date.now() }, ...s.threads.filter((t) => t.id !== id)] });
    });
    void ask(id, next, problem);
  };

  const remove = (t: Thread) => {
    if (window.confirm("Delete this chat? It cannot be brought back.")) deleteChat(t.id);
  };

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col gap-4 lg:h-[calc(100dvh-10.5rem)]">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Tutoring session</p>
          <h1 className="page-title mt-1">Ask Billy</h1>
          <p className="mt-1 text-sm text-muted">Ask any math question. Argue with a right answer and he will show you exactly where you are wrong.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto lg:hidden">
          <select
            className="input h-9 min-w-0 flex-1 py-1 text-xs sm:w-52 sm:flex-none"
            aria-label="Saved chats"
            value={messages.length ? thread!.id : ""}
            disabled={!past.length}
            onChange={(e) => openChat(e.target.value || null)}
          >
            {!messages.length && <option value="">{past.length ? `Saved chats (${past.length})` : "No saved chats yet"}</option>}
            {past.map((t) => (
              <option key={t.id} value={t.id}>
                {chatTitle(t)}
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <>
              <button type="button" className="btn-ghost btn-sm" aria-label="Delete this chat" onClick={() => thread && remove(thread)} disabled={busy}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => openChat(null)}>
                <Plus className="h-3.5 w-3.5" /> New chat
              </button>
            </>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="card hidden min-h-0 flex-col lg:flex" aria-label="Saved chats">
          <div className="flex items-center justify-between gap-2 border-b border-line p-3">
            <h2 className="text-sm font-semibold">Saved chats</h2>
            <button type="button" className="btn-ghost btn-sm" onClick={() => openChat(null)} disabled={!messages.length}>
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          </div>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
            {ready && !past.length && <li className="px-2 py-3 text-[13px] text-muted">Ask a question and the chat shows up here. It stays when you leave.</li>}
            {past.map((t) => {
              const active = t.id === thread?.id && messages.length > 0;
              return (
                <li key={t.id} className={`flex items-center rounded-lg ${active ? "bg-surface-2" : "hover:bg-surface-2"}`}>
                  <button type="button" aria-current={active ? "true" : undefined} onClick={() => openChat(t.id)} className="min-w-0 flex-1 px-2.5 py-2 text-left">
                    <span className={`block truncate text-sm ${active ? "font-medium text-text" : "text-muted"}`}>{chatTitle(t)}</span>
                    <span className="block text-xs text-muted">
                      {live[t.id]?.busy ? "Billy is writing" : new Date(t.updated).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="p-2 text-muted hover:text-danger disabled:opacity-40"
                    aria-label={`Delete chat: ${chatTitle(t)}`}
                    disabled={live[t.id]?.busy}
                    onClick={() => remove(t)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line p-3">
            <SavedNote>Saved on this device</SavedNote>
          </div>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          {problem && (
            <div className="callout">
              <span className="label">Working on</span>
              <MathBlock latex={problem} />
            </div>
          )}

          <div className="card graph-paper-faint flex-1 overflow-y-auto px-4 py-5 sm:px-7">
            <div className="mx-auto max-w-3xl space-y-6">
              <Entry role="assistant" content={OPENING} n={0} />
              {messages.map((m, i) => (
                <Entry key={i} role={m.role} content={m.content} n={m.role === "assistant" ? messages.slice(0, i + 1).filter((x) => x.role === "assistant").length : 0} />
              ))}
              {busy && (
                <div className="flex items-center gap-3 pl-[2.75rem] text-sm text-muted" aria-live="polite">
                  <span className="flex gap-1" aria-hidden="true">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:300ms]" />
                  </span>
                  Billy is writing
                </div>
              )}
              {unanswered && (
                <div className="callout flex flex-wrap items-center justify-between gap-3 text-sm" role="status" style={{ ["--rule" as string]: "var(--warning)" }}>
                  <span className="min-w-0 flex-1">{error ?? "Billy did not get to answer this one."}</span>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => thread && void ask(thread.id, messages, problem)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Ask again
                  </button>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={busy}
                  onClick={() => send(c.replace(/\$/g, ""))}
                  className="relative shrink-0 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm transition-[border-color,color,transform] duration-150 hover:-translate-y-px hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {/[$\\]/.test(c) ? (
                    <>
                      <span aria-hidden="true">
                        <MathText text={c} inline />
                      </span>
                      <span className="sr-only">{mathSpeech(c)}</span>
                    </>
                  ) : (
                    <MathText text={c} inline />
                  )}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-4 transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                aria-label="Your math question"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Your answer or question. Math like x^2 - 4 is fine."
                disabled={busy}
                maxLength={2000}
              />
              <button type="submit" className="btn-primary h-9 w-9 rounded-full p-0" disabled={busy || !ready || !input.trim()} aria-label="Send">
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
            <div className="lg:hidden">
              <SavedNote>Chats save on this device by themselves.</SavedNote>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Entry({ role, content, n }: ChatMessage & { n: number }) {
  if (role !== "assistant") {
    return (
      <div className="step-in flex justify-end">
        <div className="max-w-[85%] rounded-[16px] rounded-br-[6px] bg-surface-2 px-4 py-2.5 text-sm leading-relaxed">
          <span className="whitespace-pre-wrap">{content}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="step-in grid grid-cols-[2.75rem_minmax(0,1fr)]">
      <span className="num pr-3 pt-0.5 text-right text-xs text-muted">{n === 0 ? "--" : String(n).padStart(2, "0")}</span>
      <div className="billy-note min-w-0 border-l border-highlight/40 pl-4">
        <div className="billy-name eyebrow mb-1.5 text-text">Billy</div>
        <WorksheetText text={content} className="text-[0.95rem] leading-relaxed" />
      </div>
    </div>
  );
}
