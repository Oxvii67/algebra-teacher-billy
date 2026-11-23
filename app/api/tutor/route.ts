import { errorResponse, generateJson, requireKey, type Turn } from "@/lib/server/ai";
import { TEACHER_PERSONA, TUTOR_INSTRUCTIONS } from "@/lib/server/prompts";
import { TUTOR_SCHEMA } from "@/lib/server/schemas";
import type { ChatMessage, TutorReply } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const apiKey = requireKey(process.env.GEMINI_API_KEY);
    const body = (await req.json()) as { messages?: ChatMessage[]; problemLatex?: string };
    const messages = (body.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-24)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return Response.json({ error: "Send a message first." }, { status: 400 });
    }
    // Gemini requires the conversation to start with a user turn.
    while (messages.length && messages[0].role !== "user") messages.shift();

    const contents: Turn[] = messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
    const context = body.problemLatex?.trim()
      ? `\nThe session is about this problem (LaTeX): ${body.problemLatex.trim().slice(0, 2000)}`
      : "";

    const out = await generateJson<TutorReply>(apiKey, {
      system: `${TEACHER_PERSONA}\n\n${TUTOR_INSTRUCTIONS}${context}`,
      contents,
      schema: TUTOR_SCHEMA,
      temperature: 0.5,
    });
    return Response.json({
      reply: out.reply,
      chips: (out.chips ?? []).filter(Boolean).slice(0, 4),
      verdict: out.verdict ?? "none",
      skill: out.skill ?? "",
    } satisfies TutorReply);
  } catch (err) {
    return errorResponse(err);
  }
}
