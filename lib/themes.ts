export type ThemeId = "paper" | "chalkboard" | "violet" | "sage" | "exam" | "custom";

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentFg: string;
  success: string;
  danger: string;
  warning: string;
  grid: string;
  scheme: "light" | "dark";
}

export interface ThemeDef {
  id: ThemeId;
  name: string;
  tokens: ThemeTokens;
}

export const THEMES: ThemeDef[] = [
  {
    id: "paper",
    name: "Clean Paper Light",
    tokens: {
      bg: "#f7f6f2",
      surface: "#ffffff",
      surface2: "#efede6",
      text: "#1c1b19",
      muted: "#6b6862",
      border: "#dcd8cf",
      accent: "#1d4ed8",
      accentFg: "#ffffff",
      success: "#15803d",
      danger: "#b91c1c",
      warning: "#b45309",
      grid: "#e6e2d8",
      scheme: "light",
    },
  },
  {
    id: "chalkboard",
    name: "Midnight Chalkboard Dark",
    tokens: {
      bg: "#0f1714",
      surface: "#16211d",
      surface2: "#1e2c27",
      text: "#ecf2ee",
      muted: "#97a8a0",
      border: "#2c3d36",
      accent: "#f5d76e",
      accentFg: "#1a1a1a",
      success: "#6ee7a8",
      danger: "#fca5a5",
      warning: "#fcd34d",
      grid: "#22322c",
      scheme: "dark",
    },
  },
  {
    id: "violet",
    name: "Royal Violet Purple",
    tokens: {
      bg: "#151027",
      surface: "#1e1736",
      surface2: "#2a2048",
      text: "#f1edff",
      muted: "#a89fc9",
      border: "#3a2f60",
      accent: "#a78bfa",
      accentFg: "#140d2b",
      success: "#86efac",
      danger: "#fda4af",
      warning: "#fcd34d",
      grid: "#2a2148",
      scheme: "dark",
    },
  },
  {
    id: "sage",
    name: "Forest Sage Green",
    tokens: {
      bg: "#eef2ec",
      surface: "#f9fbf7",
      surface2: "#e1e8dc",
      text: "#1b261c",
      muted: "#5c6b5d",
      border: "#c9d4c3",
      accent: "#2f6b3a",
      accentFg: "#ffffff",
      success: "#2f6b3a",
      danger: "#a3332b",
      warning: "#a16207",
      grid: "#d9e2d3",
      scheme: "light",
    },
  },
  {
    id: "exam",
    name: "High-Contrast Exam",
    tokens: {
      bg: "#ffffff",
      surface: "#ffffff",
      surface2: "#f0f0f0",
      text: "#000000",
      muted: "#333333",
      border: "#000000",
      accent: "#000000",
      accentFg: "#ffffff",
      success: "#006400",
      danger: "#b00000",
      warning: "#7a4a00",
      grid: "#cccccc",
      scheme: "light",
    },
  },
];

export interface CustomColors {
  bg: string;
  text: string;
  accent: string;
}

export const DEFAULT_CUSTOM: CustomColors = {
  bg: "#fdfaf3",
  text: "#222222",
  accent: "#c2410c",
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const out = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function customTokens(c: CustomColors): ThemeTokens {
  const dark = luminance(c.bg) < 0.35;
  return {
    bg: c.bg,
    surface: mix(c.bg, dark ? "#ffffff" : "#ffffff", dark ? 0.05 : 0.6),
    surface2: mix(c.bg, c.text, 0.08),
    text: c.text,
    muted: mix(c.text, c.bg, 0.4),
    border: mix(c.bg, c.text, 0.2),
    accent: c.accent,
    accentFg: luminance(c.accent) > 0.45 ? "#111111" : "#ffffff",
    success: dark ? "#6ee7a8" : "#15803d",
    danger: dark ? "#fca5a5" : "#b91c1c",
    warning: dark ? "#fcd34d" : "#b45309",
    grid: mix(c.bg, c.text, 0.1),
    scheme: dark ? "dark" : "light",
  };
}

export function tokensFor(id: ThemeId, custom: CustomColors): ThemeTokens {
  if (id === "custom") return customTokens(custom);
  return (THEMES.find((t) => t.id === id) ?? THEMES[0]).tokens;
}

export function applyTokens(t: ThemeTokens) {
  const r = document.documentElement;
  r.style.setProperty("--bg", t.bg);
  r.style.setProperty("--surface", t.surface);
  r.style.setProperty("--surface-2", t.surface2);
  r.style.setProperty("--text", t.text);
  r.style.setProperty("--muted", t.muted);
  r.style.setProperty("--border", t.border);
  r.style.setProperty("--accent", t.accent);
  r.style.setProperty("--accent-fg", t.accentFg);
  r.style.setProperty("--success", t.success);
  r.style.setProperty("--danger", t.danger);
  r.style.setProperty("--warning", t.warning);
  r.style.setProperty("--grid", t.grid);
  r.style.colorScheme = t.scheme;
}

export const THEME_STORAGE_KEY = "atai.theme";
export const CUSTOM_STORAGE_KEY = "atai.theme.custom";

export const CUSTOM_TOKENS_KEY = "atai.theme.customTokens";

/** Inline script that applies the stored theme before first paint. */
export function themeBootScript(): string {
  const all: Record<string, ThemeTokens> = {};
  THEMES.forEach((t) => (all[t.id] = t.tokens));
  return `(function(){try{
var T=${JSON.stringify(all)};
var id=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"paper";
var t=T[id];
if(id==="custom"){t=JSON.parse(localStorage.getItem(${JSON.stringify(CUSTOM_TOKENS_KEY)})||"null");}
if(!t)t=T.paper;
var r=document.documentElement,m={bg:"--bg",surface:"--surface",surface2:"--surface-2",text:"--text",muted:"--muted",border:"--border",accent:"--accent",accentFg:"--accent-fg",success:"--success",danger:"--danger",warning:"--warning",grid:"--grid"};
for(var k in m)r.style.setProperty(m[k],t[k]);r.style.colorScheme=t.scheme;r.dataset.theme=id;
}catch(e){}})();`;
}
