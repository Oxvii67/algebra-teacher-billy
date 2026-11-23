import { errorResponse, generateJson, imagePart, type Part, requireKey } from "@/lib/server/ai";
import { TEACHER_PERSONA, TEST_INSTRUCTIONS } from "@/lib/server/prompts";
import { TEST_SCHEMA } from "@/lib/server/schemas";
import type { TestLevel, TestQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type RawQuestion = Omit<TestQuestion, "id">;
interface RawTest {
  title: string;
  questions: RawQuestion[];
}

const LEVELS: TestLevel[] = ["same", "hard", "ap"];
/** Source problems per model call. Batches run concurrently, capped so a full test is at most 4 calls. */
const PER_BATCH = 5;
const MAX_BATCHES = 2;

export type TestProgress =
  | { type: "progress"; stage: "reading" | "verifying" | "writing"; done: number; total: number }
  | { type: "result"; title: string; level: TestLevel; questions: TestQuestion[] }
  | { type: "error"; error: string; status: number; retryAfter?: number };

type Source = { kind: "image"; dataUrl: string } | { kind: "text"; text: string };

function batches(sources: Source[]): Source[][] {
  const size = Math.max(PER_BATCH, Math.ceil(sources.length / MAX_BATCHES));
  const out: Source[][] = [];
  for (let i = 0; i < sources.length; i += size) out.push(sources.slice(i, i + size));
  return out;
}

function batchParts(level: TestLevel, batch: Source[]): Part[] {
  const parts: Part[] = [{ text: `Level: ${level}. ${batch.length} source problem${batch.length === 1 ? "" : "s"} follow. Write exactly ${batch.length} question${batch.length === 1 ? "" : "s"}.` }];
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

function normalize(questions: RawQuestion[]): TestQuestion[] {
  return questions.slice(0, 12).map((q, i) => {
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
  let apiKey: string;
  let level: TestLevel;
  let sources: Source[];
  try {
    apiKey = requireKey(process.env.GEMINI_API_KEY);
    const body = (await req.json()) as { images?: string[]; text?: string; level?: TestLevel };
    level = LEVELS.includes(body.level as TestLevel) ? (body.level as TestLevel) : "same";
    const images = (body.images ?? []).filter((x) => typeof x === "string").slice(0, 10);
    const text = String(body.text ?? "").slice(0, 6000).trim();
    if (!images.length && !text) return Response.json({ error: "Add at least one problem." }, { status: 400 });
    const total = images.reduce((n, s) => n + s.length, 0);
    if (total > 30_000_000) return Response.json({ error: "Images are too large. Crop them or send fewer." }, { status: 413 });
    const typed = text
      .split(/\n\s*\n|\n/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10 - images.length);
    sources = [...images.map((dataUrl) => ({ kind: "image" as const, dataUrl })), ...typed.map((t) => ({ kind: "text" as const, text: t }))];
    if (!sources.length) return Response.json({ error: "Add at least one problem." }, { status: 400 });
    // Validate every image before any quota is spent.
    images.forEach((img) => imagePart(img));
  } catch (err) {
    return errorResponse(err);
  }

  const groups = batches(sources);
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: TestProgress) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      let done = 0;
      send({ type: "progress", stage: "reading", done: 0, total: groups.length });
      try {
        const settled = await Promise.allSettled(
          groups.map(async (g, i) => {
            const out = await generateJson<RawTest>(apiKey, {
              system: `${TEACHER_PERSONA}\n\n${TEST_INSTRUCTIONS}`,
              contents: batchParts(level, g),
              schema: TEST_SCHEMA,
              temperature: 0.5,
            });
            done++;
            send({ type: "progress", stage: "verifying", done, total: groups.length });
            return { i, out };
          }),
        );
        const ok = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
        const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
        // Keep what succeeded; fail only if nothing did.
        if (!ok.length && failed) throw failed.reason;
        send({ type: "progress", stage: "writing", done, total: groups.length });
        const ordered = ok.sort((a, b) => a.i - b.i);
        const questions = normalize(ordered.flatMap((r) => r.out.questions ?? []));
        if (!questions.length) {
          send({ type: "error", error: "No questions could be built from those problems.", status: 502 });
        } else {
          const title = ordered.map((r) => r.out.title).find(Boolean) ?? "Practice Test";
          send({ type: "result", title, level, questions });
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
