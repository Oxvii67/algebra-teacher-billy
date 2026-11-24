import { errorResponse, generateJson, imagePart, type Part, requireKey } from "@/lib/server/ai";
import { guard } from "@/lib/server/guard";
import { TEACHER_PERSONA, TEST_INSTRUCTIONS } from "@/lib/server/prompts";
import { answersOtherSubject, isOtherSubject } from "@/lib/server/scope";
import { TEST_SCHEMA } from "@/lib/server/schemas";
import { choiceQuestion, figureQuestion, illustrateEquation, wantsFigure } from "@/lib/server/figures";
import { mentionsFigure } from "@/lib/testGraph";
import { MAX_QUESTIONS, requestedCount } from "@/lib/testRequest";
import type { TestLevel, TestQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type RawQuestion = Omit<TestQuestion, "id" | "graph" | "choiceGraphs"> & { graph?: unknown; choiceGraphs?: unknown };
interface RawTest {
  title: string;
  questions: RawQuestion[];
}

const LEVELS: TestLevel[] = ["same", "hard", "ap"];
/** Source problems per model call. Batches run concurrently, capped so a full test is at most 4 calls. */
const PER_BATCH = 5;
const MAX_BATCHES = 2;
/** Questions written when the student describes a test without saying how many. */
const DEFAULT_COUNT = 5;
/** A call that failed gets one more try if it can still finish inside maxDuration. */
const RETRY_BEFORE_MS = 62_000;
const RETRY_BUDGET_MS = 45_000;

export type TestProgress =
  | { type: "progress"; stage: "reading" | "verifying" | "writing"; done: number; total: number }
  | { type: "result"; title: string; level: TestLevel; questions: TestQuestion[]; asked: number }
  | { type: "error"; error: string; status: number; retryAfter?: number };

type Source = { kind: "image"; dataUrl: string } | { kind: "text"; text: string };

function batches(sources: Source[]): Source[][] {
  const size = Math.max(PER_BATCH, Math.ceil(sources.length / MAX_BATCHES));
  const out: Source[][] = [];
  for (let i = 0; i < sources.length; i += size) out.push(sources.slice(i, i + size));
  return out;
}

interface Group {
  sources: Source[];
  count: number;
}

/** One group per model call, with the question count split between them. */
function plan(sources: Source[], request: string): Group[] {
  const wanted = requestedCount(request);
  const total = Math.min(MAX_QUESTIONS, wanted ?? (sources.length || DEFAULT_COUNT));
  let lists: Source[][] = sources.length ? batches(sources) : total > PER_BATCH ? [[], []] : [[]];
  // Many more questions than problems: both calls work from the same problems. Fewer: one call is enough.
  if (lists.length === 1 && total > PER_BATCH) lists = [lists[0], lists[0]];
  if (total < lists.length) lists = [sources];
  let left = total;
  return lists.map((list, i) => {
    const count = wanted === null && sources.length ? list.length : Math.ceil(left / (lists.length - i));
    left -= count;
    return { sources: list, count };
  });
}

function batchParts(level: TestLevel, group: Group, request: string, graphs: boolean, index: number, shared: boolean): Part[] {
  const batch = group.sources;
  const parts: Part[] = [
    {
      text: `Level: ${level}. ${batch.length ? `${batch.length} source problem${batch.length === 1 ? "" : "s"} follow.` : "There are no source problems: write the test from the student's request."} Write exactly ${group.count} question${group.count === 1 ? "" : "s"}.`,
    },
  ];
  if (request) parts.push({ text: `Student's request for this test (what to cover and how; it is not a question to answer):\n"""\n${request}\n"""` });
  parts.push({
    text: graphs
      ? "Figures: on. Any equation or function in x can be graphed, linear equations included (use intersections for an equation such as 2x + 1 = 7). Where the topics can be graphed, make about 40% of your questions (at least one) figure questions, and use choiceGraphs for at most one of them. Where they cannot be graphed, draw none."
      : "Figures: off. Every question has graph task 'none' and an empty choiceGraphs, and none refers to a figure.",
  });
  if (shared) {
    parts.push({ text: `Two writers share this test and you are writer ${index + 1}. ${index === 0 ? "Write the core skills." : "Write the remaining topics and other variations, with different numbers and functions from a typical first set."}` });
  }
  batch.forEach((s, i) => {
    if (s.kind === "image") {
      parts.push({ text: `Source problem ${i + 1} (image):` });
      parts.push(imagePart(s.dataUrl));
    } else {
      parts.push({ text: `Source problem ${i + 1} (typed): ${s.text}` });
    }
  });
  return parts;
}

/** With graphs on, a test that came back without one gets one on the first equation that can carry it. */
function ensureGraph(questions: TestQuestion[]): TestQuestion[] {
  if (questions.some((q) => q.graph || q.choiceGraphs)) return questions;
  for (let i = 0; i < questions.length; i++) {
    const drawn = illustrateEquation(questions[i]);
    if (drawn) return questions.map((q, j) => (j === i ? drawn : q));
  }
  return questions;
}

/** The question with its figure and key worked out, or null if it depends on a figure that cannot be used. */
function withFigure(q: RawQuestion): Omit<TestQuestion, "id"> | null {
  const { graph, choiceGraphs, ...rest } = q;
  const choice = Array.isArray(choiceGraphs) && choiceGraphs.length > 0;
  if (choice || wantsFigure(graph)) {
    const written = choice ? choiceQuestion(choiceGraphs, graph, q.answer) : figureQuestion(graph);
    return written && { ...rest, ...written };
  }
  return mentionsFigure(q.instructions ?? "") ? null : rest;
}

function normalize(questions: RawQuestion[]): TestQuestion[] {
  const usable = questions.flatMap((q) => {
    const checked = withFigure(q);
    if (!checked) console.warn(`[practice-test] dropped a question with an unusable figure: ${JSON.stringify([q.instructions, q.graph, q.choiceGraphs]).slice(0, 800)}`);
    return checked ?? [];
  });
  return usable.slice(0, 12).map((q, i) => {
    const mc = q.type === "multiple_choice" && (q.choices ?? []).length >= 2;
    const idx = Number.parseInt(q.answer, 10);
    return {
      ...q,
      id: `q${i + 1}`,
      type: mc ? "multiple_choice" : "free_response",
      choices: mc ? q.choices.slice(0, 6) : [],
      answer: mc ? String(Number.isInteger(idx) && idx >= 0 && idx < q.choices.length ? idx : 0) : q.answer,
      points: Math.min(5, Math.max(1, Math.round(q.points || 1))),
      solution: q.solution ?? [],
    };
  });
}

/**
 * Streams newline-delimited JSON: progress events while batches of source problems are written
 * and self-checked in parallel, then one result (or error) event.
 */
export async function POST(req: Request) {
  const refused = guard(req, "practice-test", "heavy");
  if (refused) return refused;
  let apiKey: string;
  let level: TestLevel;
  let sources: Source[];
  let request: string;
  let figures: boolean;
  try {
    apiKey = requireKey(process.env.GEMINI_API_KEY);
    const body = (await req.json()) as { images?: string[]; text?: string; request?: string; level?: TestLevel; graphs?: boolean };
    figures = body.graphs !== false;
    level = LEVELS.includes(body.level as TestLevel) ? (body.level as TestLevel) : "same";
    const images = (body.images ?? []).filter((x) => typeof x === "string").slice(0, 10);
    const text = String(body.text ?? "").slice(0, 6000).trim();
    request = String(body.request ?? "").slice(0, 2000).trim();
    if (!images.length && !text && !request) return Response.json({ error: "Add a problem, or tell Billy what you want on the test." }, { status: 400 });
    if (isOtherSubject(`${request}\n${text}`)) return Response.json({ error: "Billy only writes math tests. Take the other subject out and try again." }, { status: 422 });
    const total = images.reduce((n, s) => n + s.length, 0);
    if (total > 30_000_000) return Response.json({ error: "Images are too large. Crop them or send fewer." }, { status: 413 });
    const typed = text
      .split(/\n\s*\n|\n/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10 - images.length);
    sources = [...images.map((dataUrl) => ({ kind: "image" as const, dataUrl })), ...typed.map((t) => ({ kind: "text" as const, text: t }))];
    if (!sources.length && !request) return Response.json({ error: "Add at least one problem." }, { status: 400 });
    // Validate every image before any quota is spent.
    images.forEach((img) => imagePart(img));
  } catch (err) {
    return errorResponse(err);
  }

  const groups = plan(sources, request);
  const shared = groups.length > 1 && (!sources.length || groups[0].sources === groups[1].sources);
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: TestProgress) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      let done = 0;
      send({ type: "progress", stage: "reading", done: 0, total: groups.length });
      try {
        const started = Date.now();
        const write = async (g: Group, i: number, budgetMs?: number) => {
            const out = await generateJson<RawTest>(apiKey, {
              system: `${TEACHER_PERSONA}\n\n${TEST_INSTRUCTIONS}`,
              contents: batchParts(level, g, request, figures, i, shared),
              schema: TEST_SCHEMA,
              temperature: 0.5,
              thinkingBudget: 2048,
              strong: true,
              budgetMs,
            });
            done++;
            send({ type: "progress", stage: "verifying", done: Math.min(done, groups.length), total: groups.length });
            // Hold each call to its share so the test is never longer than asked for.
            return { i, out: { ...out, questions: (out.questions ?? []).slice(0, g.count) } };
        };
        const settled = await Promise.allSettled(groups.map((g, i) => write(g, i)));
        // Parallel calls can trip a per-minute limit that the same call alone does not.
        for (let i = 0; i < groups.length; i++) {
          if (settled[i].status === "fulfilled" || Date.now() - started > RETRY_BEFORE_MS) continue;
          settled[i] = (await Promise.allSettled([write(groups[i], i, RETRY_BUDGET_MS)]))[0];
        }
        const ok = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
        const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
        // Keep what succeeded; fail only if nothing did.
        if (!ok.length && failed) throw failed.reason;
        send({ type: "progress", stage: "writing", done, total: groups.length });
        const ordered = ok.sort((a, b) => a.i - b.i);
        const written = normalize(ordered.flatMap((r) => r.out.questions ?? []).filter((q) => !answersOtherSubject(JSON.stringify(q))));
        const questions = figures ? ensureGraph(written) : written;
        if (!questions.length) {
          send({ type: "error", error: "No math questions could be built from that. Billy only writes math tests.", status: 502 });
        } else {
          const title = ordered.map((r) => r.out.title).find(Boolean) ?? "Practice Test";
          send({ type: "result", title, level, questions, asked: groups.reduce((n, g) => n + g.count, 0) });
        }
      } catch (err) {
        const res = errorResponse(err);
        const data = (await res.json()) as { error: string; retryAfter?: number };
        send({ type: "error", error: data.error, status: res.status, retryAfter: data.retryAfter });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
