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

/** Streak and level XP. "pill" sits in the header, "full" in the mobile sheet. */
export function StudyMeter({ variant }: { variant: "full" | "pill" }) {
  const { user, ready } = useData();
  const { profile, into, need, pct } = useLevelProgress();
  const streakOn = profile.streak_days > 0;

  if (variant === "pill") {
    // Nothing earned yet: keep the header clear for a first-time visitor.
    if (profile.xp === 0) return null;
    return (
      <Link
        href={user ? "/settings" : "/login"}
        className="group flex h-9 items-center gap-2.5 rounded-full border border-line bg-surface pl-2.5 pr-3 transition-colors hover:border-[color-mix(in_srgb,var(--text)_25%,var(--border))]"
        aria-label={`${profile.streak_days}-day streak, level ${profile.level}, ${into} of ${need} XP`}
      >
        <span className={`flex items-center gap-1 text-[13px] font-semibold num ${streakOn ? "text-highlight" : "text-muted"}`}>
          <Flame className="h-3.5 w-3.5" strokeWidth={2.4} />
          {profile.streak_days}
        </span>
        <span className="h-4 w-px bg-line" aria-hidden="true" />
        <span className="flex items-center gap-2">
          <span className="num text-[12px] font-medium text-muted">
            Lv <span className="text-text">{profile.level}</span>
          </span>
          <span className="hidden h-1 w-12 overflow-hidden rounded-full bg-surface-2 sm:block">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link href={user ? "/settings" : "/login"} className="block rounded-[14px] border border-line p-3.5 transition-colors hover:border-accent/50">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold">Level {profile.level}</span>
        <span className={`num flex items-center gap-1 text-sm font-medium ${streakOn ? "text-highlight" : "text-muted"}`} title="Study streak">
          <Flame className="h-4 w-4" />
          {profile.streak_days} day{profile.streak_days === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={into} aria-label="XP toward next level">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span className="num">
          {into} / {need} XP
        </span>
        <span>{ready ? (user ? "Synced" : "Sign in to sync") : ""}</span>
      </div>
    </Link>
  );
}
