import { errorResponse, generateJson, imagePart, type Part, requireKey } from "@/lib/server/ai";
import { CHALLENGE_INSTRUCTIONS, SOLVE_INSTRUCTIONS, TEACHER_PERSONA, VERIFY_INSTRUCTIONS } from "@/lib/server/prompts";
import { CHALLENGE_SCHEMA, type DraftSolution, SOLVE_SCHEMA, VERIFIED_SCHEMA, type VerifiedDraft } from "@/lib/server/schemas";
import { numericCheck } from "@/lib/mathCheck";
import { bestVideoFor } from "@/lib/videos";
import type { ChallengeResult, SolveResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

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
    if (typeof input.dataUrl !== "string" || input.dataUrl.length > MAX_IMAGE_CHARS) throw Object.assign(new Error("Image is too large."), { status: 400 });
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
      });
      return Response.json(out);
    }

    if (!body.input) return Response.json({ error: "Missing input." }, { status: 400 });
    const parts = problemParts(body.input);

    // Pass 1: solve.
    const draft = await generateJson<DraftSolution>(apiKey, {
      system: `${TEACHER_PERSONA}\n\n${SOLVE_INSTRUCTIONS}`,
      contents: parts,
      schema: SOLVE_SCHEMA,
      temperature: 0.2,
    });
    const firstCheck = numericCheck(draft.numericCheck);

    // Pass 2: verify every line and substitute back in.
    const checkNote = firstCheck.ran
      ? firstCheck.passed
        ? "An automatic numeric substitution of the draft's solutions returned zero residuals."
        : `An automatic numeric substitution FAILED for the draft: ${JSON.stringify(firstCheck.details)}. Find the error.`
      : "No automatic numeric check was possible for the draft.";
    const verified = await generateJson<VerifiedDraft>(apiKey, {
      system: `${TEACHER_PERSONA}\n\n${VERIFY_INSTRUCTIONS}`,
      contents: [...parts, { text: `Draft solution JSON:\n${JSON.stringify(draft)}\n\n${checkNote}` }],
      schema: VERIFIED_SCHEMA,
      temperature: 0.1,
    });

    const result = finalize(verified, numericCheck(verified.numericCheck));
    return Response.json(result);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 400) return Response.json({ error: (err as Error).message }, { status: 400 });
    return errorResponse(err);
  }
}
