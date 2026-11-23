import type { Part, Turn } from "./ai";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Backup providers, used only after every Gemini model is out of quota, overloaded, or slow.
 * Both speak the OpenAI chat-completions API. Each turns on only when its key is set:
 *   GROQ_API_KEY        https://console.groq.com/keys
 *   OPENROUTER_API_KEY  https://openrouter.ai/settings/keys
 * Server-only: this module is imported by lib/server/ai.ts, which only route handlers import.
 */

if (typeof window !== "undefined") throw new Error("lib/server/backup.ts must never run in the browser.");

interface Backup {
  provider: "groq" | "openrouter";
  model: string;
  vision: boolean;
}

/** Tried in this order. Text-only models are skipped for photo problems. */
const BACKUPS: Backup[] = [
  { provider: "groq", model: "openai/gpt-oss-120b", vision: false },
  { provider: "groq", model: "qwen/qwen3.8-27b", vision: true },
  { provider: "openrouter", model: "nvidia/nemotron-3.5-super-vl:free", vision: true },
  { provider: "openrouter", model: "google/gemma-4-31b-it:free", vision: true },
  { provider: "openrouter", model: "openrouter/free", vision: true },
];

const ENDPOINT = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
} as const;

const ATTEMPT_TIMEOUT_MS = 25_000;

function keyFor(p: Backup["provider"]): string | undefined {
  const k = p === "groq" ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
  return k?.trim() || undefined;
}

/** "provider:model" or "provider" -> epoch ms until which it is skipped. Per server instance. */
const bench = new Map<string, number>();
const benched = (id: string) => (bench.get(id) ?? 0) > Date.now();

export function hasBackups(): boolean {
  return BACKUPS.some((b) => keyFor(b.provider));
}

type ChatContent = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

function toContent(parts: Part[]): ChatContent {
  if (parts.every((p) => "text" in p)) return parts.map((p) => (p as { text: string }).text).join("\n");
  return parts.map((p) =>
    "text" in p ? { type: "text" as const, text: p.text } : { type: "image_url" as const, image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } },
  );
}

export class BackupError extends Error {}

/**
 * One completion from the first backup that answers. Throws BackupError when none is configured,
 * every one is benched, or the deadline passes.
 */
export async function backupComplete(opts: {
  system: string;
  contents: Turn[];
  temperature: number;
  /** When set, the reply must be one JSON object matching this schema. */
  schema?: unknown;
  deadline: number;
}): Promise<string> {
  const hasImage = opts.contents.some((t) => t.parts.some((p) => "inlineData" in p));
  const system = opts.schema
    ? `${opts.system}\n\nReply with exactly one JSON object and nothing else. It must match this JSON Schema:\n${JSON.stringify(opts.schema)}`
    : opts.system;
  const messages = [
    { role: "system", content: system },
    ...opts.contents.map((t) => ({ role: t.role === "model" ? "assistant" : "user", content: toContent(t.parts) })),
  ];

  let last = "no backup provider is configured";
  for (const b of BACKUPS) {
    const key = keyFor(b.provider);
    const id = `${b.provider}:${b.model}`;
    if (!key || (hasImage && !b.vision) || benched(id) || benched(b.provider)) continue;
    const left = opts.deadline - Date.now();
    if (left < 4_000) break;

    // Strict JSON mode first; if the provider's JSON validator rejects a long answer, ask the same
    // model again without it. parseJson in ai.ts extracts and repairs the JSON either way.
    for (const strictJson of opts.schema ? [true, false] : [false]) {
      const left2 = opts.deadline - Date.now();
      if (left2 < 4_000) break;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.min(ATTEMPT_TIMEOUT_MS, left2));
      try {
        const res = await fetch(ENDPOINT[b.provider], {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            ...(b.provider === "openrouter" ? { "HTTP-Referer": SITE_URL, "X-Title": SITE_NAME } : {}),
          },
          body: JSON.stringify({
            model: b.model,
            messages,
            temperature: opts.temperature,
            max_tokens: 8192,
            ...(strictJson ? { response_format: { type: "json_object" } } : {}),
          }),
        });
        const body = await res.text();
        if (!res.ok) {
          last = `${id} ${res.status} ${body.slice(0, 300)}`;
          console.error(`[backup] ${last}`);
          if (strictJson && res.status === 400 && /generate JSON|json_validate|failed_generation/i.test(body)) continue; // retry without strict mode
          if (res.status === 401 || res.status === 403) bench.set(b.provider, Date.now() + 6 * 60 * 60_000); // bad key: skip the provider
          else if (res.status === 429 || res.status === 413) bench.set(id, Date.now() + (Number(res.headers.get("retry-after")) || 60) * 1000 + 2_000);
          else if (res.status === 404) bench.set(id, Date.now() + 60 * 60_000);
          else bench.set(id, Date.now() + 30_000);
          break;
        }
        const data = JSON.parse(body) as { choices?: { message?: { content?: string | null } }[] };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) {
          last = `${id} returned an empty reply`;
          bench.set(id, Date.now() + 30_000);
          break;
        }
        console.warn(`[backup] served by ${id}${strictJson ? "" : " (plain JSON)"}`);
        return text;
      } catch (err) {
        last = `${id} ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[backup] ${last}`);
        bench.set(id, Date.now() + 3 * 60_000); // timed out or the network failed
        break;
      } finally {
        clearTimeout(timer);
      }
    }
  }
  throw new BackupError(last);
}
