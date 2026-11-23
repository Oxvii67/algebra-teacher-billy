"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  applyTokens,
  CUSTOM_STORAGE_KEY,
  CUSTOM_TOKENS_KEY,
  type CustomColors,
  DEFAULT_CUSTOM,
  THEME_STORAGE_KEY,
  type ThemeId,
  DEFAULT_THEME,
  tokensFor,
} from "@/lib/themes";

interface ThemeCtx {
  theme: ThemeId;
  custom: CustomColors;
  setTheme: (id: ThemeId) => void;
  setCustom: (c: CustomColors) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [custom, setCustomState] = useState<CustomColors>(DEFAULT_CUSTOM);

  useEffect(() => {
    try {
      const id = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null) ?? DEFAULT_THEME;
      const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
      const c = raw ? (JSON.parse(raw) as CustomColors) : DEFAULT_CUSTOM;
      setThemeState(id);
      setCustomState(c);
    } catch {
      /* storage unavailable: keep defaults */
    }
  }, []);

  const commit = useCallback((id: ThemeId, c: CustomColors) => {
    const t = tokensFor(id, c);
    applyTokens(t);
    document.documentElement.dataset.theme = id;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(c));
      if (id === "custom") localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(t));
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback(
    (id: ThemeId) => {
      setThemeState(id);
      commit(id, custom);
    },
    [commit, custom],
  );

  const setCustom = useCallback(
    (c: CustomColors) => {
      setCustomState(c);
      setThemeState("custom");
      commit("custom", c);
    },
    [commit],
  );

  return <Ctx.Provider value={{ theme, custom, setTheme, setCustom }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
