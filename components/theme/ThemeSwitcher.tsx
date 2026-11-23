"use client";

import { Check, Palette } from "lucide-react";
import { THEMES, type CustomColors } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, custom, setTheme, setCustom } = useTheme();

  const update = (key: keyof CustomColors, value: string) => setCustom({ ...custom, [key]: value });

  return (
    <div className="space-y-4">
      <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={`flex items-center gap-3 rounded-lg border p-2.5 text-left text-sm transition-colors ${
              theme === t.id ? "border-accent ring-2 ring-accent/40" : "border-line hover:bg-surface-2"
            }`}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
              style={{ background: t.tokens.bg, borderColor: t.tokens.border }}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: t.tokens.accent }} />
            </span>
            <span className="flex-1 font-medium">{t.name}</span>
            {theme === t.id && <Check className="h-4 w-4 text-accent" />}
          </button>
        ))}
      </div>

      <div className={`rounded-lg border p-3 ${theme === "custom" ? "border-accent ring-2 ring-accent/40" : "border-line"}`}>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Palette className="h-4 w-4" /> Custom Colors
          {theme === "custom" && <Check className="ml-auto h-4 w-4 text-accent" />}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["bg", "Background"],
              ["text", "Text"],
              ["accent", "Accent"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex flex-col items-center gap-1.5 text-xs text-muted">
              <input
                type="color"
                value={custom[key]}
                onChange={(e) => update(key, e.target.value)}
                className="h-9 w-full cursor-pointer rounded-md border border-line bg-transparent"
                aria-label={`Custom ${label} color`}
              />
              {label}
            </label>
          ))}
        </div>
        {theme !== "custom" && (
          <button type="button" className="btn-ghost btn-sm mt-3 w-full" onClick={() => setCustom(custom)}>
            Use custom colors
          </button>
        )}
      </div>
    </div>
  );
}
