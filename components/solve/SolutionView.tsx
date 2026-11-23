"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Calculator,
  Check,
  Copy,
  Eye,
  Lightbulb,
  LoaderCircle,
  MessageSquare,
  ShieldCheck,
  ChevronsUp,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { MathBlock, MathText } from "@/components/math/Math";
import { VideoEmbed } from "@/components/video/VideoEmbed";
import type { ChallengeResult, SolveResult } from "@/lib/types";
import { StepList } from "./StepList";

export function calculatorHref(exprs: string[]): string {
  const q = new URLSearchParams();
  exprs.forEach((e) => q.append("e", e));
  return `/calculator?${q.toString()}`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}

export function SolutionView({
  result,
  onSolveChallenge,
  toolbar,
}: {
  result: SolveResult;
  /** Called when the student wants the challenge problem solved in full. */
  onSolveChallenge?: (latex: string) => void;
  toolbar?: React.ReactNode;
}) {
  const [tab, setTab] = useState<"teacher" | "simpler">("teacher");
  const [challenge, setChallenge] = useState<ChallengeResult | null>(null);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [challengeErr, setChallengeErr] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const v = result.verification;

  const getChallenge = async () => {
    setChallengeBusy(true);
    setChallengeErr(null);
    setShowHint(false);
    setShowAnswer(false);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "challenge", problemLatex: result.problemLatex, topic: result.topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setChallenge(data as ChallengeResult);
    } catch (e) {
      setChallengeErr((e as Error).message);
    } finally {
      setChallengeBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* (a) Detected problem */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label">Problem</span>
          {result.topic && <span className="pill py-0.5 text-xs">{result.topic}</span>}
          <div className="ml-auto flex flex-wrap gap-2">{toolbar}</div>
        </div>
        <MathBlock latex={result.problemLatex} className="mt-2 text-lg" />
        {result.problemSummary && <MathText text={result.problemSummary} className="mt-1 text-sm text-muted" />}
        {result.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.skills.map((s) => (
              <span key={s} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                {s}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* (b) Prerequisite skills */}
      {result.prerequisites.length > 0 && (
        <section className="card p-5 sm:p-6">
          <div className="eyebrow">Before you start</div>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="h-5 w-5 text-accent" /> Prerequisite skills
          </h2>
          <p className="mt-1 text-sm text-muted">If any of these is shaky, fix it first. The rest of the solution depends on it.</p>
          <div className="mt-4 space-y-4">
            {result.prerequisites.map((p, i) => (
              <div key={i} className="grid gap-4 border-t border-line pt-4 first:border-t-0 first:pt-0 lg:grid-cols-[1fr_320px]">
                <div className="min-w-0">
                  <h3 className="flex items-baseline gap-2.5 font-semibold">
                    <span className="num text-xs text-highlight">{String(i + 1).padStart(2, "0")}</span>
                    {p.skill}
                  </h3>
                  <MathText text={p.why} className="mt-1 text-sm" />
                  <div className="callout mt-3">
                    <div className="label mb-1">Quick example</div>
                    <MathText text={p.example} className="text-sm" />
                  </div>
                </div>
                {p.videoId ? (
                  <div>
                    <VideoEmbed id={p.videoId} title={p.videoTitle ?? p.skill} />
                  </div>
                ) : (
                  <a
                    className="btn-ghost self-start"
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent("Khan Academy " + p.videoQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Find a lesson on YouTube
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* (c) + (e) Teacher solution and simpler way */}
      <section className="card p-5 sm:p-6">
        <div className="tab-track mb-5 flex w-full sm:w-auto">
          <button type="button" className={`tab flex-1 justify-center ${tab === "teacher" ? "tab-active" : ""}`} onClick={() => setTab("teacher")}>
            Billy's solution
          </button>
          <button
            type="button"
            className={`tab flex-1 justify-center ${tab === "simpler" ? "tab-active" : ""}`}
            onClick={() => setTab("simpler")}
          >
            <Zap className="h-4 w-4" /> Faster way
          </button>
        </div>
        {tab === "teacher" ? (
          <StepList steps={result.steps} />
        ) : result.simplerMethod ? (
          <div>
            <h3 className="mb-3 font-semibold">{result.simplerMethod.title}</h3>
            <StepList steps={result.simplerMethod.steps} />
          </div>
        ) : (
          <p className="text-sm text-muted">There is no meaningfully faster method for this problem. The standard method above is the one to know.</p>
        )}
      </section>

      {/* (d) Verified final answer */}
      <section className="card p-5 sm:p-6" style={{ borderLeft: `3px solid ${v.verified ? "var(--success)" : "var(--warning)"}` }}>
        <div className="flex flex-wrap items-center gap-2">
          {v.verified ? (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <ShieldCheck className="h-5 w-5" /> Verified final answer
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
              <TriangleAlert className="h-5 w-5" /> Final answer, verification incomplete
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <CopyButton text={result.finalAnswerPlain || result.finalAnswerLatex} label="Copy answer" />
            <CopyButton text={result.finalAnswerLatex} label="Copy LaTeX" />
          </div>
        </div>
        <MathBlock latex={result.finalAnswerLatex} className="mt-2 text-xl" />
        <details className="mt-3 rounded-[10px] border border-line bg-surface p-3 text-sm">
          <summary className="cursor-pointer font-medium">How this was checked</summary>
          <MathText text={v.check} className="mt-2" />
          {v.corrections.length > 0 && (
            <div className="mt-3">
              <div className="label mb-1">Corrections made during verification</div>
              <ul className="list-disc space-y-1 pl-5">
                {v.corrections.map((c, i) => (
                  <li key={i}>
                    <MathText text={c} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      </section>

      {result.commonMistakes.length > 0 && (
        <section className="callout" style={{ ["--rule" as string]: "var(--danger)" }}>
          <h2 className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="h-5 w-5 text-danger" /> Traps on this problem
          </h2>
          <ul className="mt-3 space-y-2">
            {result.commonMistakes.map((m, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="num mt-0.5 shrink-0 text-xs text-danger">{String(i + 1).padStart(2, "0")}</span>
                <MathText text={m} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* (f) Challenge and (g) graph */}
      <section className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={getChallenge} disabled={challengeBusy}>
          {challengeBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronsUp className="h-4 w-4" />}
          Challenge me: Honors version
        </button>
        <Link href={`/tutor?p=${encodeURIComponent(result.problemLatex)}`} className="btn-ghost">
          <MessageSquare className="h-4 w-4" /> Work through it with Billy
        </Link>
        {result.graphExpressions.length > 0 && (
          <Link href={calculatorHref(result.graphExpressions)} className="btn-ghost">
            <Calculator className="h-4 w-4" /> Open in graphing calculator
          </Link>
        )}
      </section>
      {challengeErr && <p className="text-sm text-danger">{challengeErr}</p>}

      {challenge && (
        <section className="card-raised p-5 sm:p-6">
          <div className="label">Honors challenge</div>
          <MathBlock latex={challenge.problemLatex} className="mt-2 text-lg" />
          <MathText text={challenge.whyHarder} className="mt-1 text-sm text-muted" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setShowHint((s) => !s)}>
              <Lightbulb className="h-3.5 w-3.5" /> {showHint ? "Hide hint" : "Hint"}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setShowAnswer((s) => !s)}>
              <Eye className="h-3.5 w-3.5" /> {showAnswer ? "Hide answer" : "Check my answer"}
            </button>
            {onSolveChallenge && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => onSolveChallenge(challenge.problemLatex)}>
                Show full solution
              </button>
            )}
          </div>
          {showHint && <MathText text={challenge.hint} className="callout mt-3 text-sm" />}
          {showAnswer && <MathBlock latex={challenge.answerLatex} className="callout mt-3" />}
        </section>
      )}
    </div>
  );
}
