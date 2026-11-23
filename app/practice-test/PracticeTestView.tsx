"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, LoaderCircle, Printer, RotateCcw, Upload, X } from "lucide-react";
import { MathBlock, MathInline, MathText } from "@/components/math/Math";
import { StepList } from "@/components/solve/StepList";
import { compressAll } from "@/lib/image-compress";
import { useData } from "@/lib/data/DataProvider";
import { uid } from "@/lib/data/local";
import { answersMatch } from "@/lib/grade";
import type { PracticeTest, TestLevel } from "@/lib/types";

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
  const [level, setLevel] = useState<TestLevel>("same");
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
        body: JSON.stringify({ images, text, level }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Test generation failed.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let data: { title: string; level: TestLevel; questions: PracticeTest["questions"] } | null = null;
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
            | { type: "result"; title: string; level: TestLevel; questions: PracticeTest["questions"] }
            | { type: "error"; error: string };
          if (ev.type === "progress") setProgress({ stage: ev.stage, done: ev.done, total: ev.total });
          else if (ev.type === "error") throw new Error(ev.error);
          else data = ev;
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
          router.replace("/practice-test");
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Practice test</h1>
        <p className="mt-2 text-muted">Paste up to 10 homework problems. Billy writes a graded test on the same skills.</p>
      </header>

      <section className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="typed">
            Problems, one per line
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

        {error && (
          <p className="callout text-sm" style={{ ["--rule" as string]: "var(--warning)" }}>
            {error}
          </p>
        )}
        {progress && <ProgressTrack progress={progress} />}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy || (!images.length && !text.trim())} onClick={generate}>
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {busy ? "Writing your test" : "Write my test"}
          </button>
        </div>
      </section>
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
  return answersMatch(response, q.answer);
}

function TestRunner({
  test,
  onChange,
  onGraded,
  onNew,
  printKey,
  setPrintKey,
}: {
  test: PracticeTest;
  onChange: (t: PracticeTest) => void;
  onGraded: (t: PracticeTest) => void;
  onNew: () => void;
  printKey: boolean;
  setPrintKey: (v: boolean) => void;
}) {
  const graded = test.score !== null;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const respond = (qid: string, v: string) => {
    if (graded) return;
    onChange({ ...test, responses: { ...test.responses, [qid]: v } });
  };

  const grade = () => {
    const score = test.questions.reduce((n, q) => n + (isCorrect(q, test.responses[q.id] ?? "") ? q.points : 0), 0);
    const t = { ...test, score };
    onChange(t);
    onGraded(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const retake = () => onChange({ ...test, responses: {}, score: null });
  const answered = test.questions.filter((q) => (test.responses[q.id] ?? "").trim()).length;
  const pct = graded && test.max_score ? Math.round(((test.score ?? 0) / test.max_score) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">{test.level === "ap" ? "AP level" : test.level === "hard" ? "Harder" : "Same level"}</p>
          <h1 className="page-title">{test.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {test.questions.length} questions, {test.max_score} points. Show your work on paper.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-ghost cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={printKey} onChange={(e) => setPrintKey(e.target.checked)} />
            Answer key in print
          </label>
          <button className="btn-ghost" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </button>
          <button className="btn-ghost" onClick={onNew}>
            New test
          </button>
        </div>
      </header>

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
            <button className="btn-ghost ml-auto" onClick={retake}>
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
          </div>
        </section>
      )}

      <div className="print-area space-y-4">
        <h1 className="hidden display-tight text-xl font-semibold print:block">{test.title}</h1>
        <p className="hidden text-sm print:block">Name: ______________________ Date: ____________ Score: ______ / {test.max_score}</p>
        {test.questions.map((q, n) => {
          const r = test.responses[q.id] ?? "";
          const ok = graded && isCorrect(q, r);
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

                  {q.type === "multiple_choice" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.choices.map((c, i) => {
                        const chosen = r === String(i);
                        const isKey = q.answer === String(i);
                        return (
                          <label
                            key={i}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${
                              graded && isKey ? "border-success bg-success/10" : graded && chosen ? "border-danger bg-danger/10" : chosen ? "border-accent bg-surface-2" : "border-line hover:bg-surface-2"
                            } ${printKey && isKey ? "print:font-bold print:underline" : ""}`}
                          >
                            <input type="radio" name={q.id} className="accent-[var(--accent)] print:hidden" checked={chosen} onChange={() => respond(q.id, String(i))} disabled={graded} />
                            <span className="font-semibold">{String.fromCharCode(65 + i)}.</span>
                            <MathInline latex={c} />
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-print space-y-1.5">
                      <input
                        className="input font-mono"
                        value={r}
                        onChange={(e) => respond(q.id, e.target.value)}
                        disabled={graded}
                        placeholder="Your answer, e.g. 1/2, 3"
                      />
                      {r.trim() && (
                        <div className="text-sm text-muted">
                          Reads as: <MathInline latex={r.replace(/\*/g, "\\cdot ").replace(/sqrt\(([^()]+)\)/g, "\\sqrt{$1}")} />
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
                      {!ok && (
                        <div className="text-sm">
                          Correct answer: <MathInline latex={q.answerLatex} />
                        </div>
                      )}
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
          <button className="btn-primary" onClick={grade} disabled={answered === 0}>
            <Check className="h-4 w-4" /> Submit and grade
          </button>
        </div>
      )}
    </div>
  );
}
