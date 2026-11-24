"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { MathBlock, MathText } from "@/components/math/Math";
import { WorksheetText } from "@/components/math/WorksheetText";
import { useData } from "@/lib/data/DataProvider";
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

export function TutorView() {
  const params = useSearchParams();
  const problem = params.get("p") ?? "";
  const { recordActivity } = useData();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chips, setChips] = useState<string[]>(STARTERS);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    if (problem) setChips(["Walk me through the first step", "I think I know the first move", "What skill do I need here?"]);
  }, [problem]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, problemLatex: problem || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The teacher did not respond.");
      const r = data as TutorReply;
      setMessages([...next, { role: "assistant", content: r.reply }]);
      setChips(r.chips.length ? r.chips : chips);
      if (r.verdict === "correct") recordActivity({ xp: 5, skill: r.skill, correct: true });
      else if (r.verdict === "incorrect") recordActivity({ xp: 1, skill: r.skill, correct: false });
      else if (r.verdict === "partial") recordActivity({ xp: 2, skill: r.skill });
    } catch (e) {
      setError((e as Error).message);
      setMessages(messages);
      setInput(content);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setChips(STARTERS);
    setError(null);
  };

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col gap-4 lg:h-[calc(100dvh-10.5rem)]">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Tutoring session</p>
          <h1 className="page-title mt-1">Ask Billy</h1>
          <p className="mt-1 text-sm text-muted">Ask any math question. Argue with a right answer and he will show you exactly where you are wrong.</p>
        </div>
        {messages.length > 0 && (
          <button className="btn-ghost btn-sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> New session
          </button>
        )}
      </header>

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
          {error && (
            <p className="callout text-sm" style={{ ["--rule" as string]: "var(--warning)" }}>
              {error}
            </p>
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
              className="shrink-0 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm transition-[border-color,color,transform] duration-150 hover:-translate-y-px hover:border-accent hover:text-accent disabled:opacity-50"
            >
              <MathText text={c} inline />
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
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your answer or question. Math like x^2 - 4 is fine."
            disabled={busy}
            maxLength={2000}
          />
          <button type="submit" className="btn-primary h-9 w-9 rounded-full p-0" disabled={busy || !input.trim()} aria-label="Send">
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
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
