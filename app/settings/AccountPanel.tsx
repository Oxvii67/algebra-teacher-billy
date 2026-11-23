"use client";

import Link from "next/link";
import { useData } from "@/lib/data/DataProvider";
import { xpForLevel } from "@/lib/progress";

export function AccountPanel() {
  const { user, profile, mode, signOut } = useData();
  const lo = xpForLevel(profile.level);
  const hi = xpForLevel(profile.level + 1);
  const pct = Math.min(100, Math.round(((profile.xp - lo) / Math.max(1, hi - lo)) * 100));
  const skills = Object.entries(profile.skill_mastery).sort((a, b) => b[1] - a[1]);

  return (
    <section className="card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{user ? user.email : "Guest mode"}</h2>
          <p className="text-sm text-muted">
            {mode === "cloud" ? "Progress syncs to your account." : "Progress is stored in this browser. Sign in and it moves into your account."}
          </p>
        </div>
        {user ? (
          <button className="btn-ghost" onClick={() => signOut()}>
            Sign out
          </button>
        ) : (
          <Link className="btn-primary" href="/login">
            Sign in
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Level" value={profile.level} />
        <Stat label="XP" value={profile.xp} />
        <Stat label="Streak" value={`${profile.streak_days} day${profile.streak_days === 1 ? "" : "s"}`} />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Level {profile.level}</span>
          <span>
            {profile.xp - lo} / {hi - lo} XP to level {profile.level + 1}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <h3 className="label mb-2">Skill mastery</h3>
        {skills.length === 0 ? (
          <p className="text-sm text-muted">Solve problems, take drills, and finish tests to build a mastery record.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {skills.slice(0, 16).map(([k, v]) => (
              <li key={k} className="text-sm">
                <div className="flex justify-between">
                  <span className="truncate capitalize">{k}</span>
                  <span className="text-muted">{v}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full" style={{ width: `${v}%`, background: v >= 70 ? "var(--success)" : v >= 40 ? "var(--warning)" : "var(--danger)" }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
