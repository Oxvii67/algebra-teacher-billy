"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useData } from "@/lib/data/DataProvider";
import { useLevelProgress } from "@/components/shell/StudyMeter";

export function MasteryBars({ limit = 6 }: { limit?: number }) {
  const { profile } = useData();
  const skills = Object.entries(profile.skill_mastery)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (!skills.length) return null;
  return (
    <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {skills.map(([k, v]) => {
        const tone = v >= 70 ? "var(--success)" : v >= 40 ? "var(--warning)" : "var(--danger)";
        return (
          <li key={k}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-semibold first-letter:uppercase">{k}</span>
              <span className="shrink-0 tabular-nums text-muted">{v}%</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={v}
              aria-label={`${k} mastery`}
            >
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(3, v)}%`, background: tone }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function HomeProgress() {
  const { ready } = useData();
  const { profile, into, need, pct } = useLevelProgress();
  const hasSkills = Object.keys(profile.skill_mastery).length > 0;
  if (!ready) return null;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="progress-title">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <h2 id="progress-title" className="display-tight text-xl font-extrabold">
            Your progress
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {profile.xp === 0 ? "Every solved problem, drill, and test builds this record." : "Keep the streak alive: one problem a day counts."}
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div>
            <div className="text-xs font-semibold text-muted">Study streak</div>
            <div className={`flex items-center gap-1 text-2xl font-black tabular-nums ${profile.streak_days ? "text-warning" : "text-muted"}`}>
              <Flame className="h-6 w-6" />
              {profile.streak_days}
            </div>
          </div>
          <div className="min-w-[180px]">
            <div className="flex justify-between text-xs font-semibold text-muted">
              <span>Level {profile.level}</span>
              <span className="tabular-nums">
                {into}/{need} XP
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 border-t border-line pt-5">
        {hasSkills ? (
          <MasteryBars />
        ) : (
          <p className="text-sm">
            No mastery record yet.{" "}
            <Link href="/drill" className="font-semibold text-accent underline-offset-2 hover:underline">
              Take a 60-second drill
            </Link>{" "}
            to start one.
          </p>
        )}
      </div>
    </section>
  );
}
