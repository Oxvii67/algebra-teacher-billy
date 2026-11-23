"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useData } from "@/lib/data/DataProvider";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, signOut } = useData();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(params.get("error") ? "Google sign-in did not complete. Try again." : null);
  const sb = getSupabaseBrowser();

  if (!sb) {
    return (
      <div className="card mx-auto max-w-md p-6">
        <h1 className="font-serif text-2xl font-semibold">Accounts are not configured</h1>
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
        <h1 className="font-serif text-2xl font-semibold">Signed in</h1>
        <p className="mt-2 text-sm text-muted">{user.email}</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={() => router.push("/history")}>
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
      else router.push("/history");
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Check your email to confirm the account, then sign in.");
      else router.push("/history");
    }
    setBusy(false);
  };

  const google = async () => {
    setBusy(true);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMsg(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="card mx-auto max-w-md p-6">
      <h1 className="font-serif text-2xl font-semibold">{mode === "signin" ? "Sign in" : "Create an account"}</h1>
      <p className="mt-1 text-sm text-muted">Anything you saved as a guest moves into your account automatically.</p>

      <button type="button" onClick={google} disabled={busy} className="btn-ghost mt-5 w-full">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

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
