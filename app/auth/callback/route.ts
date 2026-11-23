import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  // Behind Vercel's proxy, trust the forwarded host so the redirect stays on the domain the user is on.
  const fwdHost = request.headers.get("x-forwarded-host");
  const origin = fwdHost ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${fwdHost}` : url.origin;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/binder";

  const fail = (detail?: string | null) => {
    const to = new URL("/login", origin);
    to.searchParams.set("error", "oauth");
    if (detail) to.searchParams.set("error_description", detail.slice(0, 200));
    if (dest !== "/binder") to.searchParams.set("next", dest);
    return NextResponse.redirect(to);
  };

  // Google or Supabase reported a problem before handing back a code.
  const upstream = searchParams.get("error_description") ?? searchParams.get("error");
  if (upstream) return fail(upstream);
  if (!code) return fail("No sign-in code was returned.");

  const supabase = await getSupabaseServer();
  if (!supabase) return fail("Accounts are not configured on the server.");

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error(`[auth] code exchange failed: ${error.message}`);
    // The PKCE verifier cookie lives on the domain sign-in started from; a different domain cannot finish it.
    return fail(/verifier/i.test(error.message) ? "Start sign-in again from this page." : error.message);
  }
  return NextResponse.redirect(new URL(dest, origin));
}
