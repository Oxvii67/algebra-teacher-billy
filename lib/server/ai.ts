import { GoogleGenAI } from "@google/genai";

/**
 * Server-side Gemini helpers. The API key is read by route handlers in app/api/** and passed in;
 * this module never touches process.env, so nothing here can leak a key to the client bundle.
 */

/** Primary model per spec. GEMINI_MODEL (server-only, optional) overrides it. */
export const MODEL = "gemini-2.5-flash";
/** Fallbacks for keys where the primary model is retired or overloaded, fastest first. */
const FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash"];
const ATTEMPT_TIMEOUT_MS = 75_000;
let resolvedModel: string | null = null;

function modelChain(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim() || MODEL;
  const chain = [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)];
  return resolvedModel ? [resolvedModel, ...chain.filter((m) => m !== resolvedModel)] : chain;
}

/** Errors where trying the next model in the chain is the right move. */
function shouldFallThrough(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /"code":\s*(404|503)|NOT_FOUND|UNAVAILABLE|no longer available|is not found|not supported for generateContent|high demand|overloaded|AbortError|aborted|timed out/i.test(msg);
}

/** Calls fn with the first model in the chain that exists for this key, remembering the winner. */
async function withModel<T>(fn: (model: string, signal: AbortSignal) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const m of modelChain()) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS);
    try {
      const out = await fn(m, ctrl.signal);
      resolvedModel = m;
      return out;
    } catch (err) {
      last = err;
      if (resolvedModel === m) resolvedModel = null;
      if (!shouldFallThrough(err)) throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw last;
}

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
export type Turn = { role: "user" | "model"; parts: Part[] };

export class AiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

const clients = new Map<string, GoogleGenAI>();
function client(apiKey: string): GoogleGenAI {
  let c = clients.get(apiKey);
  if (!c) {
    c = new GoogleGenAI({ apiKey });
    clients.set(apiKey, c);
  }
  return c;
}

const DATA_URL = /^data:(image\/(?:png|jpe?g|webp|gif|heic|heif));base64,([A-Za-z0-9+/=]+)$/;

export function imagePart(dataUrl: string): Part {
  const m = DATA_URL.exec(dataUrl);
  if (!m) throw new AiError("Unsupported image format. Use PNG, JPG, or WEBP.", 400);
  return { inlineData: { mimeType: m[1] === "image/jpg" ? "image/jpeg" : m[1], data: m[2] } };
}

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu;
const APOLOGY = /\b(I['’]m sorry|I am sorry|I apologi[sz]e|Sorry,|My apologies)[^.!?]*[.!?]?\s*/gi;

export function cleanText(s: string): string {
  return s.replace(EMOJI, "").replace(APOLOGY, "").replace(/[ \t]+\n/g, "\n");
}

/** Recursively strips emojis and robotic apologies from every string in a JSON value. */
export function cleanDeep<T>(v: T): T {
  if (typeof v === "string") return cleanText(v) as T;
  if (Array.isArray(v)) return v.map(cleanDeep) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = cleanDeep(x);
    return out as T;
  }
  return v;
}

function parseJson<T>(raw: string): T {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t) as T;
  } catch {
    const s = t.indexOf("{");
    const e = t.lastIndexOf("}");
    if (s >= 0 && e > s) return JSON.parse(t.slice(s, e + 1)) as T;
    throw new AiError("The model returned malformed JSON.");
  }
}

function wrapError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  if (/API key|PERMISSION_DENIED|401|403/i.test(msg)) return new AiError("The Gemini API key was rejected. Check GEMINI_API_KEY.", 500);
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return new AiError("The AI is rate limited right now. Wait a minute and try again.", 429);
  if (/503|UNAVAILABLE|overloaded/i.test(msg)) return new AiError("The AI service is overloaded. Try again in a moment.", 503);
  return new AiError("The AI request failed: " + msg.slice(0, 200));
}

export async function generateJson<T>(
  apiKey: string,
  opts: {
    system: string;
    contents: Turn[] | Part[];
    schema: unknown;
    temperature?: number;
    thinkingBudget?: number;
  },
): Promise<T> {
  const ai = client(apiKey);
  const contents = (opts.contents.length && "role" in (opts.contents[0] as object)
    ? opts.contents
    : [{ role: "user", parts: opts.contents as Part[] }]) as Turn[];
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await withModel((model, abortSignal) =>
        ai.models.generateContent({
        model,
        contents,
        config: {
          abortSignal,
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: opts.schema,
          temperature: opts.temperature ?? 0.2,
          thinkingConfig: opts.thinkingBudget !== undefined ? { thinkingBudget: opts.thinkingBudget } : undefined,
        },
        }),
      );
      const text = res.text;
      if (!text) throw new AiError("The model returned an empty response.");
      return cleanDeep(parseJson<T>(text));
    } catch (err) {
      lastErr = err;
      const e = wrapError(err);
      if (e.status !== 502) throw e;
    }
  }
  throw wrapError(lastErr);
}

export async function generateText(
  apiKey: string,
  opts: { system: string; contents: Turn[]; temperature?: number; thinkingBudget?: number },
): Promise<string> {
  try {
    const res = await withModel((model, abortSignal) =>
      client(apiKey).models.generateContent({
        model,
        contents: opts.contents,
        config: {
          abortSignal,
          systemInstruction: opts.system,
          temperature: opts.temperature ?? 0.5,
          thinkingConfig: opts.thinkingBudget !== undefined ? { thinkingBudget: opts.thinkingBudget } : undefined,
        },
      }),
    );
    return cleanText(res.text ?? "");
  } catch (err) {
    throw wrapError(err);
  }
}

export function requireKey(key: string | undefined): string {
  if (!key) throw new AiError("GEMINI_API_KEY is not set on the server.", 500);
  return key;
}

export function errorResponse(err: unknown): Response {
  const e = wrapError(err);
  return Response.json({ error: e.message }, { status: e.status });
}
