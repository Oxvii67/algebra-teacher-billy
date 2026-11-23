"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useData } from "@/lib/data/DataProvider";
import { xpForLevel } from "@/lib/progress";

export function useLevelProgress() {
  const { profile } = useData();
  const lo = xpForLevel(profile.level);
  const hi = xpForLevel(profile.level + 1);
  const into = profile.xp - lo;
  const need = Math.max(1, hi - lo);
  return { profile, into, need, pct: Math.min(100, Math.max(0, Math.round((into / need) * 100))) };
}

/** Streak and level XP bar. "full" sits in the sidebar, "bar" in the mobile header. */
export function StudyMeter({ variant }: { variant: "full" | "bar" | "icon" }) {
  const { user, ready } = useData();
  const { profile, into, need, pct } = useLevelProgress();
  const streakOn = profile.streak_days > 0;

  if (variant === "icon") {
    return (
      <Link href="/settings" className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface-2" title={`Level ${profile.level}, ${profile.streak_days}-day streak`}>
        <svg viewBox="0 0 36 36" className="absolute inset-0.5 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-2)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
        </svg>
        <span className="relative text-xs font-bold tabular-nums">{profile.level}</span>
      </Link>
    );
  }

  if (variant === "bar") {
    return (
      <Link href="/settings" className="flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-surface-2" aria-label={`Level ${profile.level}, ${pct} percent to next level, ${profile.streak_days}-day streak`}>
        <span className={`flex items-center gap-0.5 text-sm font-bold tabular-nums ${streakOn ? "text-warning" : "text-muted"}`}>
          <Flame className="h-4 w-4" />
          {profile.streak_days}
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[11px] font-bold leading-none">Lv {profile.level}</span>
          <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link href={user ? "/settings" : "/login"} className="block rounded-xl border border-line bg-surface-2/60 p-3 transition-colors hover:border-accent/50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Level {profile.level}</span>
        <span className={`flex items-center gap-1 text-sm font-bold tabular-nums ${streakOn ? "text-warning" : "text-muted"}`} title="Study streak">
          <Flame className="h-4 w-4" />
          {profile.streak_days} day{profile.streak_days === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={into} aria-label="XP toward next level">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span className="tabular-nums">
          {into} / {need} XP
        </span>
        <span>{ready ? (user ? "Synced" : "Sign in to sync") : ""}</span>
      </div>
    </Link>
  );
}
