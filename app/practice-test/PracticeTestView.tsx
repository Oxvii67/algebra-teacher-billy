"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Check, ChevronDown, Eye, EyeOff, LoaderCircle, Printer, RotateCcw, Upload, X } from "lucide-react";
import { MathBlock, MathInline, MathText } from "@/components/math/Math";
import { TestGraph } from "@/components/math/TestGraph";
import { StepList } from "@/components/solve/StepList";
import { compressAll } from "@/lib/image-compress";
import { useData } from "@/lib/data/DataProvider";
import { uid } from "@/lib/data/local";
import { answersMatch, previewLatex } from "@/lib/grade";
import { graphOfLatex } from "@/lib/latexExpr";
import { describeGraph } from "@/lib/testGraph";
import { DictateButton } from "@/components/studio/DictateButton";
import type { AnswerReview, PracticeTest, TestLevel } from "@/lib/types";

const GraphCalculator = dynamic(() => import("@/components/calculator/GraphCalculator").then((m) => m.GraphCalculator), {
  ssr: false,
  loading: () => <p className="card p-5 text-sm text-muted">Opening the calculator.</p>,
});

const LEVELS: { id: TestLevel; name: string; desc: string }[] = [
  { id: "same", name: "Same level", desc: "Same skills, new numbers." },
  { id: "hard", name: "Harder", desc: "One extra step on each problem." },
  { id: "ap", name: "AP level", desc: "Multi-step, exam-style questions." },
];

const MAX = 10;

export function PracticeTestView() {
  const params = useSearchParams();
  const router = useRouter();
  const { tests, saveTest, recordActivity, ready } = useData();
  const [images, setImages] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [request, setRequest] = useState("");
  const [shortNote, setShortNote] = useState<string | null>(null);
  const [voiceProblem, setVoiceProblem] = useState<string | null>(null);
  const [level, setLevel] = useState<TestLevel>("same");
  const [graphs, setGraphs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ stage: Stage; done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<PracticeTest | null>(null);
  const [printKey, setPrintKey] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const id = params.get("id");
  useEffect(() => {
    if (!id || !ready) return;
    const t = tests.find((x) => x.id === id);
    if (t) setTest(t);
  }, [id, tests, ready]);

  const addFiles = useCallback(async (files: Blob[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    let urls: string[];
    try {
      urls = await compressAll(imgs);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setImages((prev) => {
      const next = [...prev, ...urls].slice(0, MAX);
      if (prev.length + urls.length > MAX) setError(`A test takes at most ${MAX} problems. Extra images were skipped.`);
      return next;
    });
  }, []);

  useEffect(() => {
    if (test) return;
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) {
        e.preventDefault();
        void addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles, test]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setProgress({ stage: "reading", done: 0, total: 1 });
    try {
      const res = await fetch("/api/practice-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, text, request, level, graphs }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Test generation failed.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let data: { title: string; level: TestLevel; questions: PracticeTest["questions"]; asked?: number } | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as
            | { type: "progress"; stage: Stage; done: number; total: number }
            | { type: "result"; title: string; level: TestLevel; questions: PracticeTest["questions"]; asked?: number }
            | { type: "error"; error: string };
          if (ev.type === "progress") setProgress({ stage: ev.stage, done: ev.done, total: ev.total });
          else if (ev.type === "error") throw new Error(ev.error);
          else data = ev;
        }
      }
      // A final event without a trailing newline still counts.
      const tail = (buf + dec.decode()).trim();
      if (tail) {
        try {
          const ev = JSON.parse(tail) as { type: string; error?: string };
          if (ev.type === "error") throw new Error(ev.error);
          if (ev.type === "result") data = ev as unknown as typeof data;
        } catch (err) {
          if (err instanceof Error && !(err instanceof SyntaxError)) throw err;
        }
      }
      if (!data) throw new Error("The connection closed before the test was finished. Try again.");
      const t: PracticeTest = {
        id: uid(),
        title: data.title,
        level: data.level,
        questions: data.questions,
        responses: {},
        score: null,
        max_score: data.questions.reduce((n: number, q: { points: number }) => n + q.points, 0),
        created_at: new Date().toISOString(),
      };
      const got = data.questions.length;
      setShortNote(data.asked && got < data.asked ? `Billy finished ${got} of the ${data.asked} questions you asked for. The test below is complete as it stands; make a new one later for the rest.` : null);
      setTest(t);
      await saveTest(t);
      router.replace(`/practice-test?id=${t.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  if (test) {
    return (
      <TestRunner
        test={test}
        printKey={printKey}
        setPrintKey={setPrintKey}
        note={shortNote}
        onChange={(t) => {
          setTest(t);
          void saveTest(t);
        }}
        onGraded={(t) => {
          const pct = t.max_score ? (t.score ?? 0) / t.max_score : 0;
          recordActivity({ xp: Math.round(10 + 40 * pct) });
          t.questions.forEach((q) => {
            const ok = isCorrect(q, t.responses[q.id] ?? "");
            recordActivity({ xp: 0, skill: q.skill, correct: ok });
          });
        }}
        onNew={() => {
          setTest(null);
          setImages([]);
          setText("");
          setRequest("");
          setShortNote(null);
          router.replace("/practice-test");
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Practice test</h1>
        <p className="mt-2 text-muted">Tell Billy what to test you on, paste up to 10 homework problems, or both.</p>
      </header>

      <section className="card space-y-4 p-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="label" htmlFor="request">
              Tell Billy what you want
            </label>
            <DictateButton
              disabled={busy}
              onProblem={setVoiceProblem}
              onText={(t) => setRequest((r) => (r.trim() ? `${r.trimEnd()} ${t}` : t).slice(0, 2000))}
            />
          </div>
          <textarea
            id="request"
            className="input mt-1.5"
            rows={3}
            maxLength={2000}
            value={request}
            disabled={busy}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="8 questions on domain and range of radical functions. No multiple choice. I keep mixing up the endpoints."
          />
          <p className="mt-1.5 text-[13px] text-muted" role={voiceProblem ? "alert" : undefined}>
            {voiceProblem ?? "Optional if you add problems below. Name the topics, how many questions (up to 10), and what trips you up."}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="typed">
            Problems to base it on, one per line
          </label>
          <textarea
            id="typed"
            className="input mt-1.5 font-mono"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"x^2 - 5x + 6 = 0\nlog_2(x) + log_2(x - 2) = 3"}
          />
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void addFiles(Array.from(e.dataTransfer.files));
          }}
          className="flex cursor-pointer flex-col items-center gap-1.5 rounded-[12px] border border-dashed border-line p-6 text-center transition-colors hover:border-text/30 hover:bg-surface-2"
        >
          <Upload className="h-5 w-5 text-muted" />
          <p className="font-medium">Or add screenshots of the problems</p>
          <p className="text-sm text-muted">
            Drop, click, or paste. {images.length} of {MAX} added. One problem per image works best.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {images.map((src, i) => (
              <div key={i} className="group relative overflow-hidden rounded-lg border border-line bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Problem ${i + 1}`} className="h-28 w-full object-contain" />
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs text-white">{i + 1}</span>
                <button
                  type="button"
                  aria-label={`Remove problem ${i + 1}`}
                  onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="label mb-2">Difficulty</div>
          <div className="tab-track grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevel(l.id)}
                aria-pressed={level === l.id}
                title={l.desc}
                className={`tab justify-center ${level === l.id ? "tab-active" : ""}`}
              >
                {l.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">{LEVELS.find((l) => l.id === level)?.desc}</p>
        </div>

        <label className="flex w-fit cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={graphs} onChange={(e) => setGraphs(e.target.checked)} />
          <span>
            <span className="text-sm font-medium">Include graphs</span>
            <span className="block text-[13px] text-muted">Some questions ask you to read a graph or pick the right one, when the topic can be graphed.</span>
          </span>
        </label>

        {error && (
          <p className="callout text-sm" style={{ ["--rule" as string]: "var(--warning)" }}>
            {error}
          </p>
        )}
        {progress && <ProgressTrack progress={progress} />}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy || (!images.length && !text.trim() && !request.trim())} onClick={generate}>
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {busy ? "Writing your test" : "Write my test"}
          </button>
        </div>
      </section>
    </div>
  );
}

/** After grading: what the question's own equation or function looks like. */
function SolutionGraph({ latex, n }: { latex: string; n: number }) {
  const graph = useMemo(() => graphOfLatex(latex), [latex]);
  if (!graph) return null;
  return (
    <div>
      <div className="label">{graph.curves.length === 2 ? "On a graph: the two sides meet at the solution" : "On a graph"}</div>
      <TestGraph graph={graph} name={`Graph for the solution of question ${n}`} />
    </div>
  );
}

type Stage = "reading" | "verifying" | "writing";
const STAGES: { id: Stage; label: string }[] = [
  { id: "reading", label: "Reading paper" },
  { id: "verifying", label: "Verifying algebra" },
  { id: "writing", label: "Writing steps" },
];

function ProgressTrack({ progress }: { progress: { stage: Stage; done: number; total: number } }) {
  const at = STAGES.findIndex((s) => s.id === progress.stage);
  return (
    <ol className="grid grid-cols-3 gap-2" role="status" aria-live="polite">
      {STAGES.map((s, i) => {
        const state = i < at ? "done" : i === at ? "active" : "todo";
        const pct = state === "done" ? 100 : state === "active" ? (s.id === "verifying" && progress.total > 1 ? Math.max(12, (progress.done / progress.total) * 100) : 55) : 0;
        return (
          <li key={s.id}>
            <div className="h-1 overflow-hidden rounded-full bg-surface-2">
              <div className={`h-full rounded-full bg-accent transition-[width] duration-700 ${state === "active" ? "animate-pulse" : ""}`} style={{ width: `${pct}%` }} />
            </div>
            <div className={`mt-2 text-[13px] ${state === "todo" ? "text-muted" : "font-semibold"}`}>
              {s.label}
              {state === "active" ? "..." : ""}
              {s.id === "verifying" && progress.total > 1 && state !== "todo" && (
                <span className="num ml-1.5 text-xs font-normal text-muted">
                  {progress.done}/{progress.total}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function isCorrect(q: PracticeTest["questions"][number], response: string): boolean {
  if (!response.trim()) return false;
  if (q.type === "multiple_choice") return response === q.answer;
  if (answersMatch(response, q.answer, { instructions: q.instructions })) return true;
  return reviewOf(q, response)?.correct ?? false;
}

/** Billy's review of this exact response, if there is one. */
function reviewOf(q: PracticeTest["questions"][number], response: string): AnswerReview | undefined {
  return q.review?.response === response ? q.review : undefined;
}

function scoreOf(t: PracticeTest): number {
  return t.questions.reduce((n, q) => n + (isCorrect(q, t.responses[q.id] ?? "") ? q.points : 0), 0);
}

/** Typed answers the instant grader could not match and Billy has not looked at yet. */
function needsReview(t: PracticeTest) {
  return t.questions.filter((q) => {
    const r = t.responses[q.id] ?? "";
    return q.type === "free_response" && r.trim() && !isCorrect(q, r) && !reviewOf(q, r);
  });
}

/** Sends unmatched answers to Billy and returns the test with the reviews attached. */
async function withReviews(t: PracticeTest): Promise<PracticeTest> {
  const items = needsReview(t).map((q) => ({
    id: q.id,
    instructions: q.instructions,
    promptLatex: q.promptLatex,
    answer: q.answer,
    answerLatex: q.answerLatex,
    response: t.responses[q.id],
    graph: q.graph ? describeGraph(q.graph) : undefined,
  }));
  if (!items.length) return t;
  const res = await fetch("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    signal: AbortSignal.timeout(58_000),
  });
  const data = (await res.json().catch(() => ({}))) as { reviews?: (Omit<AnswerReview, "response"> & { id: string })[]; error?: string };
  if (!res.ok || !data.reviews) throw new Error(data.error ?? "Billy could not review the answers.");
  const byId = new Map(data.reviews.map((r) => [r.id, r]));
  return {
    ...t,
    questions: t.questions.map((q) => {
      const r = byId.get(q.id);
      return r ? { ...q, review: { response: t.responses[q.id], correct: r.correct, readAsLatex: r.readAsLatex, note: r.note } } : q;
    }),
  };
}

function TestRunner({
  test,
  onChange,
  onGraded,
  onNew,
  printKey,
  setPrintKey,
  note,
}: {
  test: PracticeTest;
  onChange: (t: PracticeTest) => void;
  onGraded: (t: PracticeTest) => void;
  onNew: () => void;
  printKey: boolean;
  setPrintKey: (v: boolean) => void;
  note: string | null;
}) {
  const graded = test.score !== null;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [calculator, setCalculator] = useState<"unopened" | "open" | "closed">("unopened");

  const [grading, setGrading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const pending = graded ? needsReview(test) : [];

  // Tests graded by an older, stricter grader pick up the corrected score when opened.
  const earned = graded ? scoreOf(test) : null;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (earned !== null && earned !== test.score) onChangeRef.current({ ...test, score: earned });
  }, [earned, test]);

  const respond = (qid: string, v: string) => {
    if (graded || grading) return;
    onChange({ ...test, responses: { ...test.responses, [qid]: v } });
  };

  /** Grades the test, or rechecks a graded one. If Billy is unavailable, the instant grades stand and can be rechecked. */
  const grade = async () => {
    if (grading) return;
    const first = !graded;
    setGrading(true);
    setReviewError(null);
    let t = test;
    try {
      t = await withReviews(test);
      if (needsReview(t).length) setReviewError("Billy did not get to every answer.");
    } catch (e) {
      const m = (e as Error).name === "TimeoutError" ? "Billy took too long to review the answers." : (e as Error).message;
      setReviewError(m);
    } finally {
      setGrading(false);
    }
    t = { ...t, score: scoreOf(t) };
    onChange(t);
    if (first) {
      onGraded(t);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const retake = () => {
    setReviewError(null);
    onChange({ ...test, questions: test.questions.map(({ review: _review, ...q }) => q), responses: {}, score: null });
  };
  const answered = test.questions.filter((q) => (test.responses[q.id] ?? "").trim()).length;
  const pct = graded && test.max_score ? Math.round(((test.score ?? 0) / test.max_score) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">{test.level === "ap" ? "AP level" : test.level === "hard" ? "Harder" : "Same level"}</p>
          <h1 className="page-title">{test.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {test.questions.length} question{test.questions.length === 1 ? "" : "s"}, {test.max_score} point{test.max_score === 1 ? "" : "s"}. Show your work on paper.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={calculator === "open" ? "btn-primary" : "btn-ghost"} aria-expanded={calculator === "open"} aria-controls="test-calculator" onClick={() => setCalculator((c) => (c === "open" ? "closed" : "open"))}>
            <Calculator className="h-4 w-4" /> {calculator === "open" ? "Hide graphing" : "Graphing calculator"}
          </button>
          <label className="btn-ghost cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={printKey} onChange={(e) => setPrintKey(e.target.checked)} />
            Answer key in print
          </label>
          <button className="btn-ghost" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </button>
          <button className="btn-ghost" onClick={onNew} disabled={grading}>
            New test
          </button>
        </div>
      </header>

      {/* Kept mounted once opened, so hiding it does not clear the student's equations. */}
      {calculator !== "unopened" && (
        <section id="test-calculator" className="no-print" aria-label="Graphing calculator" hidden={calculator === "closed"}>
          <GraphCalculator initial={[""]} />
        </section>
      )}

      {note && !graded && (
        <p className="no-print callout text-sm" style={{ ["--rule" as string]: "var(--warning)" }}>
          {note}
        </p>
      )}

      {graded && (
        <section className={`no-print card border-2 p-5 ${pct >= 80 ? "border-success" : pct >= 60 ? "border-warning" : "border-danger"}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-4xl font-semibold">{pct}%</div>
            <div>
              <div className="font-semibold">
                {test.score} / {test.max_score} points
              </div>
              <div className="text-sm text-muted">
                {pct >= 90 ? "Strong work. Move up a level." : pct >= 70 ? "Solid, but the misses below are worth redoing by hand." : "Not there yet. Study each solution, then retake."}
              </div>
            </div>
            <button className="btn-ghost ml-auto" onClick={retake} disabled={grading}>
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
          </div>
          {pending.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm">
              <span className="min-w-0 flex-1" role="status">
                {reviewError ? `${reviewError} ` : ""}
                {pending.length === 1 ? "1 typed answer did not match the key exactly." : `${pending.length} typed answers did not match the key exactly.`} Billy can check whether the math is right.
              </span>
              <button className="btn-primary btn-sm" onClick={grade} disabled={grading}>
                {grading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                {grading ? "Billy is checking" : "Have Billy check"}
              </button>
            </div>
          )}
        </section>
      )}

      <div className="print-area space-y-4">
        <p className="hidden display-tight text-xl font-semibold print:block">{test.title}</p>
        <p className="hidden text-sm print:block">Name: ______________________ Date: ____________ Score: ______ / {test.max_score}</p>
        {test.questions.map((q, n) => {
          const r = test.responses[q.id] ?? "";
          const ok = graded && isCorrect(q, r);
          const review = graded ? reviewOf(q, r) : undefined;
          return (
            <section key={q.id} className={`card break-inside-avoid p-5 print:border-0 print:p-0 print:pb-6 ${graded ? (ok ? "border-success" : "border-danger") : ""}`}>
              <div className="flex items-start gap-3">
                <span className="font-semibold">{n + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>
                      {q.points} pt{q.points === 1 ? "" : "s"}
                    </span>
                    <span className="no-print">{q.skill}</span>
                    {graded && (
                      <span className={`no-print ml-auto flex items-center gap-1 font-semibold ${ok ? "text-success" : "text-danger"}`}>
                        {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {ok ? "Correct" : "Incorrect"}
                      </span>
                    )}
                  </div>
                  <MathText text={q.instructions} className="mt-1 text-sm" />
                  <MathBlock latex={q.promptLatex} className="my-2" />
                  {q.graph && <TestGraph graph={q.graph} name={`Graph for question ${n + 1}`} />}

                  {q.type === "multiple_choice" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.choices.map((c, i) => {
                        const chosen = r === String(i);
                        const isKey = q.answer === String(i);
                        return (
                          <label
                            key={i}
                            className={`flex cursor-pointer gap-2 rounded-lg border p-2.5 text-sm ${q.choiceGraphs ? "items-start" : "items-center"} ${
                              graded && isKey ? "border-success bg-success/10" : graded && chosen ? "border-danger bg-danger/10" : chosen ? "border-accent bg-surface-2" : "border-line hover:bg-surface-2"
                            } ${printKey && isKey ? "print:font-bold print:underline" : ""}`}
                          >
                            <input type="radio" name={q.id} className="accent-[var(--accent)] print:hidden" checked={chosen} onChange={() => respond(q.id, String(i))} disabled={graded || grading} />
                            <span className="font-semibold">{String.fromCharCode(65 + i)}.</span>
                            {q.choiceGraphs?.[i] ? <TestGraph graph={q.choiceGraphs[i]} name={`Graph ${c}`} small /> : <MathInline latex={c} />}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-print space-y-1.5">
                      <input
                        className="input font-mono"
                        aria-label={`Answer to question ${n + 1}`}
                        value={r}
                        onChange={(e) => respond(q.id, e.target.value)}
                        disabled={graded || grading}
                        placeholder="Your answer, e.g. 1/2, 3"
                      />
                      {r.trim() && (
                        <div className="text-sm text-muted">
                          Reads as: <MathInline latex={review?.readAsLatex || previewLatex(r)} />
                        </div>
                      )}
                    </div>
                  )}
                  {q.type === "free_response" && <div className="hidden h-24 print:block" />}

                  {printKey && (
                    <div className="hidden text-sm print:block">
                      Answer: <MathInline latex={q.answerLatex} />
                    </div>
                  )}

                  {graded && (
                    <div className="no-print mt-3 space-y-2">
                      {review?.note && (
                        <div className="callout py-2 text-sm" style={{ ["--rule" as string]: ok ? "var(--success)" : "var(--danger)" }}>
                          <span className="font-semibold">Billy: </span>
                          <MathText text={review.note} inline />
                        </div>
                      )}
                      {(!ok || review) && (
                        <div className="text-sm">
                          Correct answer: <MathInline latex={q.answerLatex} />
                        </div>
                      )}
                      {!q.graph && !q.choiceGraphs && <SolutionGraph latex={q.promptLatex} n={n + 1} />}
                      <button className="btn-ghost btn-sm" onClick={() => setOpen((o) => ({ ...o, [q.id]: !o[q.id] }))}>
                        {open[q.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {open[q.id] ? "Hide solution" : "Step-by-step solution"}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open[q.id] ? "rotate-180" : ""}`} />
                      </button>
                      {open[q.id] && <StepList steps={q.solution} />}
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {!graded && (
        <div className="no-print sticky bottom-20 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 shadow-lg md:bottom-4">
          <span className="text-sm text-muted">
            {answered}/{test.questions.length} answered
          </span>
          <button className="btn-primary" onClick={grade} disabled={answered === 0 || grading}>
            {grading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {grading ? "Billy is checking" : "Submit and grade"}
          </button>
        </div>
      )}
    </div>
  );
}
