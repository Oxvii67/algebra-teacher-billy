import { errorResponse, generateJson, imagePart, type Part, requireKey } from "@/lib/server/ai";
import { guard } from "@/lib/server/guard";
import { CHALLENGE_INSTRUCTIONS, SOLVE_INSTRUCTIONS, TEACHER_PERSONA } from "@/lib/server/prompts";
import { CHALLENGE_SCHEMA, VERIFIED_SCHEMA, type VerifiedDraft } from "@/lib/server/schemas";
import { answersOtherSubject, isOtherSubject, NOT_MATH_ERROR } from "@/lib/server/scope";
import { numericCheck } from "@/lib/mathCheck";
import { bestVideoFor } from "@/lib/videos";
import type { ChallengeResult, SolveResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_IMAGE_CHARS = 11_000_000;

interface Body {
  mode?: "solve" | "challenge";
  input?: { kind: "image"; dataUrl: string; note?: string } | { kind: "text"; latex: string; note?: string };
  problemLatex?: string;
  topic?: string;
}

function problemParts(input: NonNullable<Body["input"]>): Part[] {
  const note = input.note?.trim() ? `\nStudent instruction: ${input.note.trim().slice(0, 300)}` : "";
  if (input.kind === "image") {
    if (typeof input.dataUrl !== "string") throw Object.assign(new Error("The image did not upload. Add it again."), { status: 400 });
    if (input.dataUrl.length > MAX_IMAGE_CHARS) throw Object.assign(new Error("Image is too large."), { status: 400 });
    return [{ text: `The student's problem is in this image.${note}` }, imagePart(input.dataUrl)];
  }
  const latex = String(input.latex ?? "").slice(0, 4000);
  if (!latex.trim()) throw Object.assign(new Error("Empty problem."), { status: 400 });
  return [{ text: `The student's problem (LaTeX): ${latex}${note}` }];
}

function finalize(d: VerifiedDraft, localCheck: ReturnType<typeof numericCheck>): SolveResult {
  const verification = { ...d.verification };
  if (localCheck.ran && !localCheck.passed) {
    verification.verified = false;
    verification.corrections = [
      ...verification.corrections,
      "An independent numeric substitution did not return zero for every listed solution. Treat this answer with caution and check it by hand.",
    ];
  } else if (localCheck.ran && localCheck.passed) {
    verification.check = `${verification.check}\n\nIndependent numeric check: each solution was substituted into $\\text{left} - \\text{right}$ and returned $0$.`;
  }
  return {
    problemLatex: d.problemLatex,
    problemSummary: d.problemSummary,
    topic: d.topic,
    skills: d.skills ?? [],
    prerequisites: (d.prerequisites ?? []).slice(0, 3).map((p) => {
      const v = bestVideoFor(`${p.skill} ${p.videoQuery}`) ?? bestVideoFor(d.topic);
      return { ...p, videoId: v?.id ?? null, videoTitle: v ? `${v.title} (${v.channel})` : null };
    }),
    steps: d.steps ?? [],
    finalAnswerLatex: d.finalAnswerLatex,
    finalAnswerPlain: d.finalAnswerPlain,
    verification,
    simplerMethod: d.simplerMethod?.steps?.length ? d.simplerMethod : null,
    commonMistakes: d.commonMistakes ?? [],
    graphExpressions: (d.graphExpressions ?? []).filter((e) => typeof e === "string" && e.trim()).slice(0, 3),
  };
}

export async function POST(req: Request) {
  const refused = guard(req, "solve", "heavy");
  if (refused) return refused;
  try {
    const apiKey = requireKey(process.env.GEMINI_API_KEY);
    const body = (await req.json()) as Body;

    if (body.mode === "challenge") {
      const latex = String(body.problemLatex ?? "").slice(0, 4000);
      if (!latex.trim()) return Response.json({ error: "Missing problem." }, { status: 400 });
      const out = await generateJson<ChallengeResult>(apiKey, {
        system: `${TEACHER_PERSONA}\n\n${CHALLENGE_INSTRUCTIONS}`,
        contents: [{ text: `Original problem (LaTeX): ${latex}\nTopic: ${String(body.topic ?? "").slice(0, 200)}` }],
        schema: CHALLENGE_SCHEMA,
        temperature: 0.8,
        thinkingBudget: 1024,
        strong: true,
        quick: true,
      });
      return Response.json(out);
    }

    if (!body.input) return Response.json({ error: "Missing input." }, { status: 400 });
    const parts = problemParts(body.input);

    if (isOtherSubject(`${body.input.kind === "text" ? body.input.latex : ""} ${body.input.note ?? ""}`)) {
      return Response.json({ error: NOT_MATH_ERROR }, { status: 422 });
    }

    // One structured call: the model solves, substitutes its answer back in, and self-corrects.
    const verified = await generateJson<VerifiedDraft>(apiKey, {
      system: `${TEACHER_PERSONA}\n\n${SOLVE_INSTRUCTIONS}`,
      contents: parts,
      schema: VERIFIED_SCHEMA,
      temperature: 0.2,
      thinkingBudget: 3072,
      strong: true,
    });

    if (verified.isMath === false || answersOtherSubject(JSON.stringify([verified.topic, verified.skills, verified.problemSummary, verified.steps]))) return Response.json({ error: NOT_MATH_ERROR }, { status: 422 });

    // The numeric substitution runs locally, so it costs no quota.
    const result = finalize(verified, numericCheck(verified.numericCheck));
    return Response.json(result);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 400) return Response.json({ error: (err as Error).message }, { status: 400 });
    return errorResponse(err);
  }
}
