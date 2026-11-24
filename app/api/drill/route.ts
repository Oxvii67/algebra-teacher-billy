import { errorResponse, generateJson, requireKey } from "@/lib/server/ai";
import { guard } from "@/lib/server/guard";
import { DRILL_INSTRUCTIONS, TEACHER_PERSONA } from "@/lib/server/prompts";
import { DRILL_SCHEMA } from "@/lib/server/schemas";
import type { Drill } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const refused = guard(req, "drill", "heavy");
  if (refused) return refused;
  try {
    const apiKey = requireKey(process.env.GEMINI_API_KEY);
    const body = (await req.json().catch(() => ({}))) as { topic?: string };
    const topic = String(body.topic ?? "").slice(0, 120);
    const d = await generateJson<Drill>(apiKey, {
      system: `${TEACHER_PERSONA}\n\n${DRILL_INSTRUCTIONS}`,
      contents: [{ text: topic ? `Topic: ${topic}` : "Topic: any Algebra 2 topic. Vary it." }],
      schema: DRILL_SCHEMA,
      temperature: 0.9,
      thinkingBudget: 1024,
      strong: true,
      quick: true,
    });
    const steps = (d.steps ?? []).slice(0, 8);
    const idx = Number(d.mistakeIndex);
    if (steps.length < 3 || !Number.isInteger(idx) || idx < 1 || idx >= steps.length) {
      return Response.json({ error: "Generated drill was malformed." }, { status: 502 });
    }
    return Response.json({ ...d, steps, mistakeIndex: idx } satisfies Drill);
  } catch (err) {
    return errorResponse(err);
  }
}
