"use client";

import Link from "next/link";
import { User } from "lucide-react";

export function AccountBadge({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      href="/settings"
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text ${collapsed ? "justify-center px-2" : ""}`}
    >
      <User className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">Guest</span>}
    </Link>
  );
}
