"use client";

import Link from "next/link";
import { Flame, LogIn, User } from "lucide-react";
import { useData } from "@/lib/data/DataProvider";

export function AccountBadge({ collapsed }: { collapsed?: boolean }) {
  const { user, profile, ready } = useData();
  const name = user ? (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Student" : "Guest";

  if (collapsed) {
    return (
      <Link
        href={user ? "/settings" : "/login"}
        className="flex items-center justify-center rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
        title={user ? `${name} - Level ${profile.level}` : "Sign in"}
      >
        {user ? <User className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
      </Link>
    );
  }

  return (
    <Link href={user ? "/settings" : "/login"} className="block rounded-lg border border-line p-2.5 hover:bg-surface-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {user ? <User className="h-4 w-4 shrink-0" /> : <LogIn className="h-4 w-4 shrink-0" />}
        <span className="truncate">{ready ? name : "Loading"}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
        <span>Lv {profile.level}</span>
        <span>{profile.xp} XP</span>
        <span className="flex items-center gap-1">
          <Flame className="h-3 w-3" />
          {profile.streak_days}d
        </span>
      </div>
      {!user && <div className="mt-1 text-xs text-accent">Sign in to sync</div>}
    </Link>
  );
}
