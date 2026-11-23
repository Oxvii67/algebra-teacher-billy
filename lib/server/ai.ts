import { GoogleGenAI } from "@google/genai";

/**
 * Server-side Gemini helpers. The API key is read by route handlers in app/api/** and passed in;
 * this module never reads it, so nothing here can leak a key to the client bundle.
 *
 * Quota policy: one request per attempt, never a fan-out. The primary model gets one retry after
 * a 2.5 second backoff on a 429. Only if that also fails with a quota, overload, or missing-model
 * error does a single request go to the lite model. Nothing else is retried upstream.
 */

/** Primary model. GEMINI_MODEL (server-only, optional) overrides it. */
export const MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
const RATE_LIMIT_BACKOFF_MS = 2_500;
const ATTEMPT_TIMEOUT_MS = 75_000;

function primaryModel(): string {
  return process.env.GEMINI_MODEL?.trim() || MODEL;
}

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
export type Turn = { role: "user" | "model"; parts: Part[] };

export class AiError extends Error {
  status: number;
  retryAfter?: number;
  constructor(message: string, status = 502, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
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

function errText(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

function upstreamStatus(err: unknown): number | null {
  const s = (err as { status?: unknown })?.status;
  if (typeof s === "number") return s;
  const m = /"code":\s*(\d{3})/.exec(errText(err));
  return m ? Number(m[1]) : null;
}

function isRateLimit(err: unknown): boolean {
  return upstreamStatus(err) === 429 || /RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(errText(err));
}

/** Errors where one request to the fallback model is worth spending. */
function shouldFallBack(err: unknown): boolean {
  if (isRateLimit(err)) return true;
  const s = upstreamStatus(err);
  return s === 404 || s === 503 || /NOT_FOUND|UNAVAILABLE|overloaded|high demand|not supported for generateContent|AbortError|aborted|timed out/i.test(errText(err));
}

/** Seconds the upstream asked us to wait, if it said (RetryInfo.retryDelay, e.g. "27s"). */
function retryDelaySeconds(err: unknown): number | undefined {
  const m = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(errText(err));
  return m ? Math.ceil(Number(m[1])) : undefined;
}

function logUpstream(model: string, attempt: string, err: unknown) {
  console.error(`[gemini] model=${model} attempt=${attempt} status=${upstreamStatus(err) ?? "n/a"} ${errText(err).slice(0, 2000)}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function once<T>(model: string, fn: (model: string, signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    return await fn(model, ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** At most three upstream requests: primary, primary after 2.5s (429 only), then lite. */
async function withModel<T>(fn: (model: string, signal: AbortSignal) => Promise<T>): Promise<T> {
  const primary = primaryModel();
  try {
    return await once(primary, fn);
  } catch (err) {
    logUpstream(primary, "1", err);
    let last = err;
    if (isRateLimit(err)) {
      await sleep(RATE_LIMIT_BACKOFF_MS);
      try {
        return await once(primary, fn);
      } catch (err2) {
        logUpstream(primary, "2-backoff", err2);
        last = err2;
      }
    }
    if (!shouldFallBack(last) || primary === FALLBACK_MODEL) throw last;
    try {
      const out = await once(FALLBACK_MODEL, fn);
      console.warn(`[gemini] served by fallback model ${FALLBACK_MODEL}`);
      return out;
    } catch (err3) {
      logUpstream(FALLBACK_MODEL, "fallback", err3);
      // Report the more informative of the two: a quota error on either wins over a generic one.
      throw isRateLimit(last) && !isRateLimit(err3) ? last : err3;
    }
  }
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

class MalformedOutput extends AiError {}

function parseJson<T>(raw: string): T {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t) as T;
  } catch {
    const s = t.indexOf("{");
    const e = t.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(t.slice(s, e + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    throw new MalformedOutput("The model returned malformed JSON.");
  }
}

function wrapError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const msg = errText(err);
  const status = upstreamStatus(err);
  if (status === 401 || status === 403 || /API key not valid|PERMISSION_DENIED/i.test(msg)) {
    return new AiError("The Gemini API key was rejected. Check GEMINI_API_KEY on the server.", 500);
  }
  if (isRateLimit(err)) {
    const wait = retryDelaySeconds(err) ?? 30;
    return new AiError(
      `Billy's AI quota is busy for the moment. Wait about ${wait} seconds and send it again; your work on this page is kept.`,
      429,
      wait,
    );
  }
  if (status === 503 || /UNAVAILABLE|overloaded|high demand/i.test(msg)) {
    return new AiError("The AI service is overloaded. Try again in a moment.", 503, 10);
  }
  if (/AbortError|aborted|timed out/i.test(msg)) return new AiError("The AI took too long to answer. Try again.", 504);
  return new AiError("The AI request failed. Try again in a moment.");
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
  // A second pass is spent only on output that came back unusable, never on upstream errors.
  for (let attempt = 0; ; attempt++) {
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
      if (!text) throw new MalformedOutput("The model returned an empty response.");
      return cleanDeep(parseJson<T>(text));
    } catch (err) {
      if (err instanceof MalformedOutput && attempt === 0) {
        console.error(`[gemini] ${err.message} Retrying once.`);
        continue;
      }
      throw wrapError(err);
    }
  }
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
  if (!(err instanceof AiError)) console.error(`[api] ${errText(err).slice(0, 2000)}`);
  const headers: Record<string, string> = {};
  if (e.retryAfter) headers["Retry-After"] = String(e.retryAfter);
  return Response.json({ error: e.message, code: e.status === 429 ? "rate_limited" : undefined, retryAfter: e.retryAfter }, { status: e.status, headers });
}
