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
              <span className="num shrink-0 text-xs text-muted">{v}%</span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2"
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
    <section className="grid gap-8 border-t border-text pt-6 md:grid-cols-12" aria-labelledby="progress-title">
      <div className="md:col-span-4">
        <h2 id="progress-title" className="font-display text-2xl font-semibold tracking-[-0.03em]">
          Your progress
        </h2>
        <p className="mt-2 max-w-xs text-sm text-muted">
          {profile.xp === 0 ? "Every solved problem, drill, and test builds this record." : "One problem a day keeps the streak alive."}
        </p>
      </div>
      <div className="md:col-span-8">
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <dt className="eyebrow">Streak</dt>
            <dd className={`mt-1 flex items-baseline gap-1.5 font-display text-4xl font-semibold tracking-[-0.04em] ${profile.streak_days ? "text-highlight" : ""}`}>
              {profile.streak_days}
              <span className="text-sm font-normal tracking-normal text-muted">day{profile.streak_days === 1 ? "" : "s"}</span>
              {profile.streak_days > 0 && <Flame className="h-5 w-5 self-center" />}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Level</dt>
            <dd className="mt-1 font-display text-4xl font-semibold tracking-[-0.04em]">{profile.level}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="eyebrow">Next level</dt>
            <dd className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="num mt-2 text-xs text-muted">
                {into} / {need} XP
              </div>
            </dd>
          </div>
        </dl>
        <div className="mt-8">
          {hasSkills ? (
            <MasteryBars />
          ) : (
            <p className="callout text-sm">
              No mastery record yet.{" "}
              <Link href="/drill" className="font-semibold text-accent underline-offset-2 hover:underline">
                Take a 60-second drill
              </Link>{" "}
              to start one.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
