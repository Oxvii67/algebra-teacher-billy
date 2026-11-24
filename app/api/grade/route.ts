import { errorResponse, generateJson, requireKey } from "@/lib/server/ai";
import { guard } from "@/lib/server/guard";
import { TEACHER_PERSONA } from "@/lib/server/prompts";
import { GRADE_INSTRUCTIONS, GRADE_SCHEMA } from "@/lib/server/gradePrompt";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Item {
  id: string;
  instructions: string;
  promptLatex: string;
  answer: string;
  answerLatex: string;
  response: string;
}

interface Review {
  id: string;
  correct: boolean;
  readAsLatex: string;
  note: string;
}

const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

/** Second look at answers the instant grader could not match: is it the same math, written differently? */
export async function POST(req: Request) {
  const refused = guard(req, "grade", "light");
  if (refused) return refused;
  try {
    const apiKey = requireKey(process.env.GEMINI_API_KEY);
    const body = (await req.json()) as { items?: Partial<Item>[] };
    const items: Item[] = (Array.isArray(body.items) ? body.items : [])
      .slice(0, 12)
      .map((x) => ({
        id: clip(x?.id, 40),
        instructions: clip(x?.instructions, 1500),
        promptLatex: clip(x?.promptLatex, 1500),
        answer: clip(x?.answer, 500),
        answerLatex: clip(x?.answerLatex, 500),
        response: clip(x?.response, 500).trim(),
      }))
      .filter((x) => x.id && x.response);
    if (!items.length) return Response.json({ error: "There are no answers to review." }, { status: 400 });

    const out = await generateJson<{ reviews: Review[] }>(apiKey, {
      system: `${TEACHER_PERSONA}\n\n${GRADE_INSTRUCTIONS}`,
      contents: [{ text: JSON.stringify(items) }],
      schema: GRADE_SCHEMA,
      temperature: 0,
      thinkingBudget: 1024,
      budgetMs: 45_000,
      quick: true,
      strong: true,
    });
    const ids = new Set(items.map((x) => x.id));
    const reviews = (Array.isArray(out.reviews) ? out.reviews : [])
      .filter((r) => r && ids.has(r.id) && typeof r.correct === "boolean")
      .map((r) => ({ id: r.id, correct: r.correct, readAsLatex: clip(r.readAsLatex, 500), note: clip(r.note, 600) }));
    return Response.json({ reviews });
  } catch (err) {
    return errorResponse(err);
  }
}
