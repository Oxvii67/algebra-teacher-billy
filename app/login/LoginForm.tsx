"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { useData } from "@/lib/data/DataProvider";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, signOut } = useData();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(() => {
    if (!params.get("error")) return null;
    const detail = params.get("error_description");
    return detail ? `Google sign-in did not complete: ${detail}` : "Google sign-in did not complete. Try again.";
  });
  // Only offer Google when the Supabase project actually has the provider switched on.
  const [googleOn, setGoogleOn] = useState(false);
  const sb = getSupabaseBrowser();
  const nextParam = params.get("next");
  const dest = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/binder";

  useEffect(() => {
    if (!sb) return;
    let live = true;
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { external?: Record<string, boolean> } | null) => live && setGoogleOn(Boolean(d?.external?.google)))
      .catch(() => live && setGoogleOn(false));
    // Coming back with the browser Back button restores this page from cache with the spinner still on.
    const reset = (e: PageTransitionEvent) => e.persisted && setBusy(false);
    window.addEventListener("pageshow", reset);
    return () => {
      live = false;
      window.removeEventListener("pageshow", reset);
    };
  }, [sb]);

  if (!sb) {
    return (
      <div className="card mx-auto max-w-md p-6">
        <h1 className="page-title">Accounts are not configured</h1>
        <p className="mt-2 text-sm text-muted">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in. Guest mode keeps working and
          saves everything on this device.
        </p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="card mx-auto max-w-md p-6">
        <h1 className="page-title">Signed in</h1>
        <p className="mt-2 text-sm text-muted">{user.email}</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={() => router.push("/binder")}>
            Go to History
          </button>
          <button className="btn-ghost" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else router.push(dest);
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}` },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Check your email to confirm the account, then sign in.");
      else router.push(dest);
    }
    setBusy(false);
  };

  const google = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setMsg(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="card mx-auto max-w-md p-6">
      <h1 className="page-title">{mode === "signin" ? "Sign in" : "Create an account"}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Anything you saved as a guest moves into your account automatically.</p>

      {googleOn && (
        <>
          <button type="button" onClick={google} disabled={busy} className="btn-ghost w-full">
            <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-3">
        <input className="input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input
          className="input"
          type="password"
          required
          minLength={6}
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
        {msg && <p className="text-sm text-danger">{msg}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button type="button" className="mt-4 text-sm text-accent hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Need an account? Create one." : "Already have an account? Sign in."}
      </button>
    </div>
  );
}
