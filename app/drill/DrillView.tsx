"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Play, RefreshCw, Target, Timer, X } from "lucide-react";
import { MathBlock, MathText } from "@/components/math/Math";
import { CURATED_DRILLS } from "@/lib/drills";
import { useData } from "@/lib/data/DataProvider";
import type { Drill } from "@/lib/types";

const SECONDS = 60;
type Phase = "idle" | "loading" | "running" | "done";

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function DrillView() {
  const { recordActivity } = useData();
  const [phase, setPhase] = useState<Phase>("idle");
  const [drill, setDrill] = useState<Drill | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [picked, setPicked] = useState<number | null>(null);
  const [useAi, setUseAi] = useState(false);
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [stats, setStats] = useState({ played: 0, correct: 0, streak: 0 });
  const queue = useRef<Drill[]>([]);
  const lastTopic = useRef<string | null>(null);

  const nextCurated = (): Drill => {
    if (!queue.current.length) queue.current = shuffle(CURATED_DRILLS).filter((d) => d.topic !== lastTopic.current);
    return queue.current.shift()!;
  };

  const start = async () => {
    setPicked(null);
    setNote(null);
    let d: Drill | null = null;
    if (useAi) {
      setPhase("loading");
      try {
        const res = await fetch("/api/drill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        d = data as Drill;
      } catch {
        setNote("A fresh drill could not be generated. Here is one from the class bank.");
      }
    }
    d = d ?? nextCurated();
    lastTopic.current = d.topic;
    setDrill(d);
    setLeft(SECONDS);
    setPhase("running");
  };

  const finish = useCallback(
    (choice: number | null) => {
      if (!drill) return;
      setPicked(choice);
      setPhase("done");
      const correct = choice === drill.mistakeIndex;
      setStats((s) => ({ played: s.played + 1, correct: s.correct + (correct ? 1 : 0), streak: correct ? s.streak + 1 : 0 }));
      recordActivity({ xp: correct ? 10 + Math.floor(left / 6) : 2, skill: drill.topic, correct });
    },
    [drill, left, recordActivity],
  );

  useEffect(() => {
    if (phase !== "running") return;
    if (left <= 0) {
      finish(null);
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left, finish]);

  const correct = drill && picked === drill.mistakeIndex;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Spot Billy&apos;s mistake</h1>
          <p className="mt-1 text-muted">One step below is wrong. You have {SECONDS} seconds to click it.</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span>
            <span className="font-semibold">{stats.correct}</span>
            <span className="text-muted">/{stats.played} found</span>
          </span>
          <span>
            <span className="font-semibold">{stats.streak}</span> <span className="text-muted">streak</span>
          </span>
        </div>
      </header>

      {(phase === "idle" || phase === "done") && (
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            <RefreshCw className="h-4 w-4" /> Get a new drill
          </label>
          {useAi && <input className="input sm:w-64" placeholder="Topic (optional), e.g. logarithms" value={topic} onChange={(e) => setTopic(e.target.value)} />}
          <button className="btn-primary sm:ml-auto" onClick={start}>
            <Play className="h-4 w-4" /> {phase === "idle" ? "Start drill" : "Next drill"}
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="card flex items-center gap-3 p-4 text-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-accent" /> Writing a solution with a planted mistake.
        </div>
      )}
      {note && <p className="text-sm text-muted">{note}</p>}

      {drill && phase !== "loading" && (
        <section className="card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="label">{drill.topic}</span>
            {phase === "running" && (
              <span className={`ml-auto flex items-center gap-1.5 font-mono text-lg font-semibold ${left <= 10 ? "text-danger" : ""}`}>
                <Timer className="h-5 w-5" /> {left}s
              </span>
            )}
          </div>
          {phase === "running" && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-accent transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} />
            </div>
          )}

          <ol className="mt-4 space-y-2">
            {drill.steps.map((s, i) => {
              const isMistake = i === drill.mistakeIndex;
              const reveal = phase === "done";
              const state = reveal ? (isMistake ? "mistake" : picked === i ? "wrongpick" : "plain") : "plain";
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={phase !== "running" || i === 0}
                    onClick={() => finish(i)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      state === "mistake"
                        ? "border-danger bg-danger/10"
                        : state === "wrongpick"
                          ? "border-warning bg-warning/10"
                          : phase === "running" && i > 0
                            ? "border-line hover:border-accent hover:bg-surface-2"
                            : "border-line"
                    }`}
                  >
                    <span className="mt-1 w-12 shrink-0 text-xs font-semibold text-muted">{i === 0 ? "Given" : `Step ${i}`}</span>
                    <span className="block min-w-0 flex-1">
                      <MathBlock as="span" latex={s.latex} />
                      <MathText inline text={s.explanation} className="text-sm text-muted" />
                    </span>
                    {reveal && isMistake && <X className="mt-1 h-5 w-5 shrink-0 text-danger" />}
                  </button>
                </li>
              );
            })}
          </ol>

          {phase === "done" && (
            <div className={`mt-5 rounded-lg border-2 p-4 ${correct ? "border-success" : "border-danger"}`}>
              <div className={`flex items-center gap-2 font-semibold ${correct ? "text-success" : "text-danger"}`}>
                {correct ? <Check className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                {correct ? `Found it with ${left} seconds left.` : picked === null ? "Time is up." : `No. Step ${picked} is correct. The mistake is step ${drill.mistakeIndex}.`}
              </div>
              <p className="mt-2 text-sm font-medium">Trap: {drill.trap}</p>
              <MathText text={drill.explanation} className="mt-1 text-sm" />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-surface-2 p-3">
                  <div className="label">Correct line</div>
                  <MathBlock latex={drill.correctedLatex} />
                </div>
                <div className="rounded-md bg-surface-2 p-3">
                  <div className="label">Correct answer</div>
                  <MathBlock latex={drill.correctAnswerLatex} />
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
