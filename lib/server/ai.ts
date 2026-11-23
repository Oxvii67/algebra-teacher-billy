import { GoogleGenAI } from "@google/genai";
import { backupComplete, hasBackups } from "./backup";

/**
 * Server-side Gemini helpers. The API key is read by route handlers in app/api/** and passed in;
 * this module never reads it, so nothing here can leak a key to the client bundle.
 *
 * Quota policy: the free tier meters every model separately, so requests rotate through a pool of
 * models. A model that answers 429 (quota), 503 (overloaded), or 404 (retired) is benched for a
 * while and skipped, so a worn-out model costs nothing on later requests. Requests run one model at
 * a time, never fanned out, and stop when the pool or the time budget runs out.
 */

/** Primary model. GEMINI_MODEL (server-only, optional) overrides it. */
export const MODEL = "gemini-3.6-flash";
/** Rotation order after the primary: full flash models first, then the lite models. */
const POOL = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
/** The primary may think for a while; a fallback that has not answered by then is likely queued. */
const PRIMARY_TIMEOUT_MS = 40_000;
const FALLBACK_TIMEOUT_MS = 22_000;
/** Kept under the shortest route maxDuration (60s) so the platform never cuts a request off. */
const TOTAL_BUDGET_MS = 55_000;

/** Lite models reject thinkingBudget 0, so they get no thinking config at all. */
function thinkingFor(model: string, budget: number | undefined) {
  if (budget === undefined || /lite/i.test(model)) return undefined;
  return { thinkingBudget: budget };
}

function pool(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || MODEL;
  return [primary, ...POOL.filter((m) => m !== primary)];
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

/** Seconds the upstream asked us to wait, if it said (RetryInfo.retryDelay, e.g. "27s"). */
function retryDelaySeconds(err: unknown): number | undefined {
  const m = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(errText(err));
  return m ? Math.ceil(Number(m[1])) : undefined;
}

function logUpstream(model: string, attempt: number, err: unknown) {
  console.error(`[gemini] model=${model} attempt=${attempt} status=${upstreamStatus(err) ?? "n/a"} ${errText(err).slice(0, 600)}`);
}

/** model -> epoch ms until which it is skipped. Lives per server instance. */
const bench = new Map<string, number>();

function benchFor(err: unknown): number | null {
  const s = upstreamStatus(err);
  if (isRateLimit(err)) {
    // A daily cap will not lift for hours; a per-minute cap lifts after the delay Google names.
    if (/PerDay/i.test(errText(err))) return 60 * 60_000;
    return ((retryDelaySeconds(err) ?? 60) + 2) * 1000;
  }
  if (s === 404 || /NOT_FOUND|no longer available|not supported for generateContent/i.test(errText(err))) return 6 * 60 * 60_000;
  if (s === 503 || /UNAVAILABLE|overloaded|high demand/i.test(errText(err))) return 30_000;
  if (/AbortError|aborted|timed out/i.test(errText(err))) return 3 * 60_000;
  return null;
}

async function once<T>(model: string, fn: (model: string, signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fn(model, ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

function minutesUntilFree(): number {
  const soonest = Math.min(...pool().map((m) => bench.get(m) ?? 0));
  return Math.max(1, Math.ceil((soonest - Date.now()) / 60_000));
}

/** Walk the pool, skipping benched models, until one answers or the deadline nears. */
async function withModel<T>(fn: (model: string, signal: AbortSignal) => Promise<T>, deadline: number): Promise<T> {
  const all = pool();
  const candidates = all.filter((m) => (bench.get(m) ?? 0) <= Date.now());
  for (const model of candidates) {
    // Leave room for a backup provider when one is configured: 15s, or 30% of a short budget.
    const remaining = deadline - Date.now();
    const left = remaining - (hasBackups() ? Math.min(15_000, remaining * 0.3) : 0);
    if (left < 5_000) break;
    const ms = Math.min(model === all[0] ? PRIMARY_TIMEOUT_MS : FALLBACK_TIMEOUT_MS, left);
    try {
      const out = await once(model, fn, ms);
      if (model !== all[0]) console.warn(`[gemini] served by ${model}`);
      return out;
    } catch (err) {
      logUpstream(model, candidates.indexOf(model) + 1, err);
      const benchMs = benchFor(err);
      if (benchMs === null) throw err; // bad request or bad key: not a model problem, so do not rotate
      bench.set(model, Date.now() + benchMs);
    }
  }
  if (all.every((m) => (bench.get(m) ?? 0) > Date.now())) {
    const mins = minutesUntilFree();
    throw new AiError(
      `Billy's free AI allowance is used up on every model for now. Try again in about ${mins} minute${mins === 1 ? "" : "s"}; your work on this page is kept.`,
      429,
      mins * 60,
    );
  }
  throw new AiError("Every AI model Billy uses is busy right now. Send it again in a moment; your work on this page is kept.", 503, 10);
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
  if (status === 404 || /NOT_FOUND|no longer available/i.test(msg)) {
    return new AiError("The AI model Billy uses is unavailable. Set GEMINI_MODEL on the server to a current Gemini model.", 502);
  }
  return new AiError("The AI request failed. Try again in a moment.");
}

/**
 * Gemini first; if every Gemini model fails, one pass through the backup providers. When the
 * backups fail too, the Gemini error is reported, since it says when the allowance frees up.
 */
async function withBackup(
  gemini: () => Promise<string>,
  backup: { system: string; contents: Turn[]; temperature: number; schema?: unknown; deadline: number },
): Promise<string> {
  try {
    return await gemini();
  } catch (err) {
    if (!hasBackups()) throw err;
    try {
      return await backupComplete(backup);
    } catch (backupErr) {
      console.error(`[backup] no backup answered: ${backupErr instanceof Error ? backupErr.message : String(backupErr)}`);
      throw err;
    }
  }
}

export async function generateJson<T>(
  apiKey: string,
  opts: {
    system: string;
    contents: Turn[] | Part[];
    schema: unknown;
    temperature?: number;
    thinkingBudget?: number;
    /** Total time for every attempt, Gemini and backups. Keep it under the route's maxDuration. */
    budgetMs?: number;
  },
): Promise<T> {
  const ai = client(apiKey);
  const contents = (opts.contents.length && "role" in (opts.contents[0] as object)
    ? opts.contents
    : [{ role: "user", parts: opts.contents as Part[] }]) as Turn[];
  const deadline = Date.now() + Math.min(opts.budgetMs ?? TOTAL_BUDGET_MS, TOTAL_BUDGET_MS);
  // A second pass is spent only on output that came back unusable, never on upstream errors.
  for (let attempt = 0; ; attempt++) {
    try {
      const text = await withBackup(
        async () => {
          const res = await withModel(
            (model, abortSignal) =>
              ai.models.generateContent({
                model,
                contents,
                config: {
                  abortSignal,
                  systemInstruction: opts.system,
                  responseMimeType: "application/json",
                  responseJsonSchema: opts.schema,
                  temperature: opts.temperature ?? 0.2,
                  thinkingConfig: thinkingFor(model, opts.thinkingBudget),
                },
              }),
            deadline,
          );
          return res.text ?? "";
        },
        { system: opts.system, contents, temperature: opts.temperature ?? 0.2, schema: opts.schema, deadline },
      );
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
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  try {
    const text = await withBackup(
      async () => {
        const res = await withModel(
          (model, abortSignal) =>
            client(apiKey).models.generateContent({
              model,
              contents: opts.contents,
              config: {
                abortSignal,
                systemInstruction: opts.system,
                temperature: opts.temperature ?? 0.5,
                thinkingConfig: thinkingFor(model, opts.thinkingBudget),
              },
            }),
          deadline,
        );
        return res.text ?? "";
      },
      { system: opts.system, contents: opts.contents, temperature: opts.temperature ?? 0.5, deadline },
    );
    return cleanText(text);
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
