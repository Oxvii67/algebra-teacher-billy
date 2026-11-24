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

type Prereq = SolveResult["prerequisites"][number];

/** One prerequisite: the skill, why it matters, a worked example, and the lesson only when asked for. */
function Prerequisite({ p }: { p: Prereq }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{p.skill}</h3>
          <MathText text={p.why} className="mt-1 text-muted" />
          {p.example && <MathText text={p.example} className="mt-2 text-[15px]" />}
        </div>
        {p.videoId ? (
          <button type="button" className="btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <BookOpen className="h-4 w-4" aria-hidden="true" /> {open ? "Hide lesson" : "Watch lesson"}
          </button>
        ) : (
          <a
            className="btn-ghost btn-sm"
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent("Khan Academy " + p.videoQuery)}`}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" /> Find a lesson
          </a>
        )}
      </div>
      {open && p.videoId && (
        <div className="mt-4 max-w-xl">
          <VideoEmbed id={p.videoId} title={p.videoTitle ?? p.skill} />
        </div>
      )}
    </li>
  );
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
  savedChallenge,
  onChallenge,
}: {
  result: SolveResult;
  /** Called when the student wants the challenge problem solved in full. */
  onSolveChallenge?: (latex: string) => void;
  toolbar?: React.ReactNode;
  /** A harder version kept by the page; without onChallenge it lasts only while this is open. */
  savedChallenge?: ChallengeResult | null;
  onChallenge?: (c: ChallengeResult) => void;
}) {
  const [tab, setTab] = useState<"teacher" | "simpler">("teacher");
  const [localChallenge, setLocalChallenge] = useState<ChallengeResult | null>(null);
  const challenge = onChallenge ? (savedChallenge ?? null) : localChallenge;
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
      (onChallenge ?? setLocalChallenge)(data as ChallengeResult);
    } catch (e) {
      setChallengeErr((e as Error).message);
    } finally {
      setChallengeBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* (a) Detected problem */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label">{result.topic || "Problem"}</span>
          <div className="ml-auto flex flex-wrap gap-2">{toolbar}</div>
        </div>
        <MathBlock latex={result.problemLatex} className="mt-2 text-lg" />
        {result.problemSummary && <MathText text={result.problemSummary} className="mt-1 text-muted" />}
        {result.skills.length > 0 && <p className="mt-3 text-[13px] text-muted">Skills: {result.skills.join(", ")}</p>}
      </section>

      {/* (b) Prerequisite skills: one line each, lesson video on request */}
      {result.prerequisites.length > 0 && (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">Know these first</h2>
          <p className="mt-1 text-muted">If one is shaky, fix it before the steps below.</p>
          <ul className="mt-4 divide-y divide-line">
            {result.prerequisites.map((p, i) => (
              <Prerequisite key={i} p={p} />
            ))}
          </ul>
        </section>
      )}

      {/* (c) + (e) Teacher solution and simpler way */}
      <section className="card p-6">
        <div className="tab-track mb-6 flex w-full sm:w-auto" role="tablist" aria-label="Solution method">
          <button type="button" role="tab" aria-selected={tab === "teacher"} className={`tab flex-1 justify-center sm:flex-none ${tab === "teacher" ? "tab-active" : ""}`} onClick={() => setTab("teacher")}>
            Billy's solution
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "simpler"}
            className={`tab flex-1 justify-center sm:flex-none ${tab === "simpler" ? "tab-active" : ""}`}
            onClick={() => setTab("simpler")}
          >
            <Zap className="h-4 w-4" aria-hidden="true" /> Faster way
          </button>
        </div>
        {tab === "teacher" ? (
          <StepList steps={result.steps} />
        ) : result.simplerMethod ? (
          <div>
            <h3 className="mb-4 font-semibold">{result.simplerMethod.title}</h3>
            <StepList steps={result.simplerMethod.steps} />
          </div>
        ) : (
          <p className="text-muted">No faster method is worth learning here. The steps in Billy's solution are the ones to know.</p>
        )}
      </section>

      {/* (d) Verified final answer */}
      <section className={`card p-6 ${v.verified ? "border-success/45" : "border-warning/45"}`}>
        <div className="flex flex-wrap items-center gap-2">
          {v.verified ? (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Answer, checked
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" /> Answer, check not finished
            </span>
          )}
          <div className="ml-auto">
            <CopyButton text={result.finalAnswerPlain || result.finalAnswerLatex} label="Copy" />
          </div>
        </div>
        <MathBlock latex={result.finalAnswerLatex} className="mt-2 text-xl" />
        <details className="group mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-muted hover:text-text">How Billy checked it</summary>
          <MathText text={v.check} className="mt-2" />
          {v.corrections.length > 0 && (
            <div className="mt-3">
              <div className="label mb-1">Fixed while checking</div>
              <ul className="list-disc space-y-1 pl-5">
                {v.corrections.map((c, i) => (
                  <li key={i}>
                    <MathText text={c} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className="mt-3 text-[13px] text-muted underline underline-offset-4 hover:text-text" onClick={() => navigator.clipboard?.writeText(result.finalAnswerLatex).catch(() => {})}>
            Copy as LaTeX
          </button>
        </details>
      </section>

      {result.commonMistakes.length > 0 && (
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em]">
            <TriangleAlert className="h-4 w-4 text-warning" aria-hidden="true" /> Common traps
          </h2>
          <ul className="mt-4 space-y-3">
            {result.commonMistakes.map((m, i) => (
              <li key={i} className="flex gap-3">
                <span className="num mt-0.5 w-4 shrink-0 text-[13px] text-muted">{i + 1}</span>
                <MathText text={m} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* (f) Challenge and (g) graph */}
      <section className="flex flex-wrap gap-2 pt-2">
        <button type="button" className="btn-primary" onClick={getChallenge} disabled={challengeBusy}>
          {challengeBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronsUp className="h-4 w-4" />}
          Try a harder one
        </button>
        <Link href={`/tutor?p=${encodeURIComponent(result.problemLatex)}`} className="btn-ghost">
          <MessageSquare className="h-4 w-4" aria-hidden="true" /> Ask Billy about it
        </Link>
        {result.graphExpressions.length > 0 && (
          <Link href={calculatorHref(result.graphExpressions)} className="btn-ghost">
            <Calculator className="h-4 w-4" aria-hidden="true" /> Graph it
          </Link>
        )}
      </section>
      {challengeErr && <p className="text-sm text-danger">{challengeErr}</p>}

      {challenge && (
        <section className="card p-6">
          <div className="label">Harder version</div>
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
          {showHint && <MathText text={challenge.hint} className="mt-4 rounded-[10px] bg-surface-2 px-4 py-3 text-sm" />}
          {showAnswer && <MathBlock latex={challenge.answerLatex} className="mt-4 rounded-[10px] bg-surface-2 px-4 py-2" />}
        </section>
      )}
    </div>
  );
}
