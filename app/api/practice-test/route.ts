import { errorResponse, generateJson, imagePart, type Part, requireKey } from "@/lib/server/ai";
import { TEACHER_PERSONA, TEST_INSTRUCTIONS, TEST_VERIFY_INSTRUCTIONS } from "@/lib/server/prompts";
import { TEST_SCHEMA } from "@/lib/server/schemas";
import type { TestLevel, TestQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

type RawQuestion = Omit<TestQuestion, "id">;
interface RawTest {
  title: string;
  questions: RawQuestion[];
}

const LEVELS: TestLevel[] = ["same", "hard", "ap"];

export async function POST(req: Request) {
  try {
    const apiKey = requireKey(process.env.GEMINI_API_KEY);
    const body = (await req.json()) as { images?: string[]; text?: string; level?: TestLevel };
    const level: TestLevel = LEVELS.includes(body.level as TestLevel) ? (body.level as TestLevel) : "same";
    const images = (body.images ?? []).filter((x) => typeof x === "string").slice(0, 10);
    const text = String(body.text ?? "").slice(0, 6000).trim();
    if (!images.length && !text) return Response.json({ error: "Add at least one problem." }, { status: 400 });
    const total = images.reduce((n, s) => n + s.length, 0);
    if (total > 30_000_000) return Response.json({ error: "Images are too large. Crop them or send fewer." }, { status: 413 });

    const parts: Part[] = [{ text: `Level: ${level}. Source problems follow.` }];
    images.forEach((img, i) => {
      parts.push({ text: `Source problem image ${i + 1}:` });
      parts.push(imagePart(img));
    });
    if (text) parts.push({ text: `Typed source problems (one per line or separated by blank lines):\n${text}` });

    const draft = await generateJson<RawTest>(apiKey, {
      system: `${TEACHER_PERSONA}\n\n${TEST_INSTRUCTIONS}`,
      contents: parts,
      schema: TEST_SCHEMA,
      temperature: 0.6,
    });
    const verified = await generateJson<RawTest>(apiKey, {
      system: `${TEACHER_PERSONA}\n\n${TEST_VERIFY_INSTRUCTIONS}`,
      contents: [{ text: `Level: ${level}\nDraft test JSON:\n${JSON.stringify(draft)}` }],
      schema: TEST_SCHEMA,
      temperature: 0.1,
    });

    const questions: TestQuestion[] = (verified.questions ?? []).slice(0, 12).map((q, i) => {
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
    if (!questions.length) return Response.json({ error: "No questions could be built from those problems." }, { status: 502 });
    return Response.json({ title: verified.title || "Practice Test", level, questions });
  } catch (err) {
    return errorResponse(err);
  }
}
