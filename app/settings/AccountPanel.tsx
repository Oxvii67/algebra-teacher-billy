"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useData } from "@/lib/data/DataProvider";
import { MasteryBars } from "@/components/home/HomeProgress";
import { useLevelProgress } from "@/components/shell/StudyMeter";

export function AccountPanel() {
  const { user, mode, signOut } = useData();
  const { profile, into, need, pct } = useLevelProgress();
  const hasSkills = Object.keys(profile.skill_mastery).length > 0;

  return (
    <section className="card space-y-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{user ? user.email : "Guest mode"}</h2>
          <p className="text-sm text-muted">
            {mode === "cloud" ? "Progress syncs to your account." : "Progress is saved in this browser. Sign in and it moves into your account."}
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
        <Stat label="Total XP" value={profile.xp} />
        <Stat
          label="Study streak"
          value={
            <span className={`inline-flex items-center gap-1 ${profile.streak_days ? "text-warning" : ""}`}>
              <Flame className="h-5 w-5" />
              {profile.streak_days}
            </span>
          }
        />
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted">
          <span>Level {profile.level}</span>
          <span className="tabular-nums">
            {into} / {need} XP to level {profile.level + 1}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-bold">Topic mastery</h3>
        {hasSkills ? <MasteryBars limit={16} /> : <p className="text-sm text-muted">Solve problems, take drills, and finish tests to build a mastery record.</p>}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="text-xl font-black tabular-nums">{value}</div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}
