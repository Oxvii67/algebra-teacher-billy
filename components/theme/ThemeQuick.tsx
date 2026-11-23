"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, SwatchBook } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

/** One-click theme switcher for the header. Full controls live in Settings. */
export function ThemeQuick() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Change theme"
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <SwatchBook className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div role="menu" className="step-in absolute right-0 top-11 z-50 w-64 rounded-[14px] border border-line bg-surface p-1.5 shadow-elev-3">
          <div className="eyebrow px-2.5 pb-1.5 pt-2">Theme</div>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === t.id}
              onClick={() => setTheme(t.id)}
              className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
            >
              <span className="relative flex h-7 w-7 shrink-0 overflow-hidden rounded-full border" style={{ background: t.tokens.bg, borderColor: t.tokens.border }}>
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-tl-full" style={{ background: t.tokens.accent }} />
                <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: t.tokens.highlight }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">{t.name}</span>
                <span className="block truncate text-xs text-muted">{t.blurb}</span>
              </span>
              {theme === t.id && <Check className="h-4 w-4 shrink-0 text-accent" />}
            </button>
          ))}
          <Link href="/settings" onClick={() => setOpen(false)} className="mt-1 block rounded-[10px] border-t border-line px-2.5 py-2 text-xs font-semibold text-muted hover:text-text">
            Custom colors in Settings
          </Link>
        </div>
      )}
    </div>
  );
}
