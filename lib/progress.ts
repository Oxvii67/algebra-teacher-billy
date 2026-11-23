import type { Profile } from "./types";

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

export function xpForLevel(level: number): number {
  return 50 * (level - 1) * (level - 1);
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export interface Activity {
  xp: number;
  skill?: string;
  /** true = demonstrated the skill, false = missed it, undefined = exposure only. */
  correct?: boolean;
}

export function applyActivity(p: Profile, a: Activity): Profile {
  const t = today();
  let streak = p.streak_days;
  if (!p.last_active_date) streak = 1;
  else {
    const gap = daysBetween(p.last_active_date, t);
    if (gap === 1) streak += 1;
    else if (gap > 1) streak = 1;
    else if (streak === 0) streak = 1;
  }
  const mastery = { ...p.skill_mastery };
  if (a.skill) {
    const key = a.skill.trim().toLowerCase().slice(0, 60);
    const cur = mastery[key] ?? 0;
    const next = a.correct === true ? cur + (100 - cur) * 0.25 : a.correct === false ? cur * 0.8 : cur + (100 - cur) * 0.05;
    mastery[key] = Math.round(next);
  }
  const xp = p.xp + Math.max(0, Math.round(a.xp));
  return { ...p, xp, level: levelForXp(xp), streak_days: streak, last_active_date: t, skill_mastery: mastery };
}

export function mergeProfiles(a: Profile, b: Profile): Profile {
  const mastery: Record<string, number> = { ...a.skill_mastery };
  for (const [k, v] of Object.entries(b.skill_mastery)) mastery[k] = Math.max(mastery[k] ?? 0, v);
  const xp = a.xp + b.xp;
  const dates = [a.last_active_date, b.last_active_date].filter(Boolean) as string[];
  return {
    ...a,
    xp,
    level: levelForXp(xp),
    streak_days: Math.max(a.streak_days, b.streak_days),
    last_active_date: dates.sort().pop() ?? null,
    skill_mastery: mastery,
  };
}
