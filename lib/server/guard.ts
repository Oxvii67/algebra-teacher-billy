/**
 * First check in every API route: is this a browser on our own site, at a human pace, with a sane
 * body? Vercel absorbs network floods; this stops one script from spending the shared AI allowance.
 *
 * Counts live in memory per server instance, so they are a brake, not an exact quota. Limits are
 * per device and, more loosely, per network, because a whole school can share one address, and a class set of
 * identical tablets looks like a single device.
 */

type Cost = "heavy" | "light";

const WINDOW_MS = 60_000;
const LIMITS: Record<Cost, { device: number; network: number; instance: number }> = {
  // Solving, tests, drills: long AI calls.
  heavy: { device: 30, network: 90, instance: 240 },
  // Chat, answer checks, lesson search.
  light: { device: 90, network: 240, instance: 600 },
};
const MAX_BYTES: Record<Cost, number> = { heavy: 32_000_000, light: 600_000 };
const MAX_KEYS = 20_000;

const hits = new Map<string, { count: number; reset: number }>();

function take(key: string, limit: number, now: number): number {
  let h = hits.get(key);
  if (!h || h.reset <= now) {
    if (hits.size >= MAX_KEYS) {
      for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
      // Still full of live keys: a flood from many addresses. Drop the oldest so memory stays bounded.
      for (const k of hits.keys()) {
        if (hits.size < MAX_KEYS) break;
        hits.delete(k);
      }
    }
    h = { count: 0, reset: now + WINDOW_MS };
    hits.set(key, h);
  }
  h.count++;
  return h.count > limit ? Math.max(1, Math.ceil((h.reset - now) / 1000)) : 0;
}

/** Vercel sets x-real-ip itself, so a client cannot forge it. IPv6 is grouped by /64, one household or device. */
function network(req: Request): string {
  const ip = (req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [head, tail = ""] = ip.split("::");
  const left = head.split(":").filter(Boolean);
  const right = tail.split(":").filter(Boolean);
  const full = ip.includes("::") ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left;
  return full.slice(0, 4).join(":");
}

function sameSite(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const refuse = (status: number, error: string, retryAfter?: number) =>
  Response.json({ error, code: status === 429 ? "rate_limited" : undefined, retryAfter }, { status, headers: retryAfter ? { "Retry-After": String(retryAfter) } : {} });

/** Returns a response to send back when the request should not go through, otherwise null. */
export function guard(req: Request, route: string, cost: Cost): Response | null {
  // Browsers always send Origin on a POST, so a request without our own Origin is a script or another site.
  if (!sameSite(req)) return refuse(403, "This request did not come from the site. Refresh the page and try again.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES[cost]) return refuse(413, "That is too large to send. Use smaller or fewer images.");

  const now = Date.now();
  const l = LIMITS[cost];
  const net = network(req);
  const device = `${net}|${(req.headers.get("user-agent") ?? "").slice(0, 160)}`;
  // Device first: a throttled device must not use up its whole school's share.
  const wait = take(`d|${route}|${device}`, l.device, now) || take(`n|${cost}|${net}`, l.network, now);
  if (wait) return refuse(429, `That is a lot of requests at once. Wait ${wait} second${wait === 1 ? "" : "s"} and send it again; your work on this page is kept.`, wait);
  const busy = take(`i|${cost}`, l.instance, now);
  if (busy) return refuse(503, "Billy is handling a rush right now. Try again in a minute; your work on this page is kept.", busy);
  return null;
}
