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
            className={`flex items-center gap-3 rounded-[12px] border p-3 text-left text-sm transition-[border-color,box-shadow] duration-150 ${
              theme === t.id ? "border-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]" : "border-line hover:border-[color-mix(in_srgb,var(--text)_25%,var(--border))]"
            }`}
          >
            <span
              className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-[10px] border"
              style={{ background: t.tokens.bg, borderColor: t.tokens.border }}
            >
              <span className="absolute inset-x-1.5 top-1.5 h-3 rounded-[3px]" style={{ background: t.tokens.surface, border: `1px solid ${t.tokens.border}` }} />
              <span className="absolute bottom-1.5 left-1.5 h-2 w-4 rounded-full" style={{ background: t.tokens.accent }} />
              <span className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full" style={{ background: t.tokens.highlight }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t.name}</span>
              <span className="block truncate text-xs text-muted">{t.blurb}</span>
            </span>
            {theme === t.id && <Check className="h-4 w-4 text-accent" />}
          </button>
        ))}
      </div>

      <div className={`rounded-[12px] border p-3 ${theme === "custom" ? "border-accent" : "border-line"}`}>
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
