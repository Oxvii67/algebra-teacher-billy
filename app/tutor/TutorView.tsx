"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GraduationCap, LoaderCircle, RotateCcw, Send, User } from "lucide-react";
import { MathBlock, MathText } from "@/components/math/Math";
import { useData } from "@/lib/data/DataProvider";
import type { ChatMessage, TutorReply } from "@/lib/types";

const STARTERS = [
  "Quiz me on factoring trinomials",
  "Quiz me on logarithm rules",
  "I do not understand completing the square",
  "Test me on solving rational equations",
  "Give me a hard exponential equation",
  "Quiz me on domain and range",
];

const OPENING = "State the problem you are working on, or pick a quiz below. I will not hand you answers. I will make you earn them.";

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
    <div className="flex h-[calc(100dvh-10rem)] flex-col gap-4 md:h-[calc(100dvh-5rem)]">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Teacher Chat</h1>
          <p className="mt-1 text-sm text-muted">Socratic method. Guess wrong and you will hear about it.</p>
        </div>
        {messages.length > 0 && (
          <button className="btn-ghost btn-sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> New session
          </button>
        )}
      </header>

      {problem && (
        <div className="card px-4 py-2">
          <span className="label">Working on</span>
          <MathBlock latex={problem} />
        </div>
      )}

      <div className="card flex-1 space-y-4 overflow-y-auto p-4">
        <Bubble role="assistant" content={OPENING} />
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Thinking
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div ref={endRef} />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              disabled={busy}
              onClick={() => send(c.replace(/\$/g, ""))}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:border-accent hover:bg-surface-2 disabled:opacity-50"
            >
              <MathText text={c} inline />
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className="input flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your answer or question. Math like x^2 - 4 is fine."
            disabled={busy}
            maxLength={2000}
          />
          <button type="submit" className="btn-primary" disabled={busy || !input.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ role, content }: ChatMessage) {
  const teacher = role === "assistant";
  return (
    <div className={`flex gap-3 ${teacher ? "" : "flex-row-reverse"}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${teacher ? "bg-accent text-accent-fg" : "bg-surface-2"}`}>
        {teacher ? <GraduationCap className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </span>
      <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${teacher ? "bg-surface-2" : "bg-accent/10"}`}>
        {teacher ? <MathText text={content} /> : <span className="whitespace-pre-wrap">{content}</span>}
      </div>
    </div>
  );
}
