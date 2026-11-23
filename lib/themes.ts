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
  /** Base color for elevation shadows. */
  shadow: string;
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
      bg: "#f4f6fa",
      surface: "#ffffff",
      surface2: "#eaeef5",
      text: "#14213d",
      muted: "#56607a",
      border: "#cfd7e4",
      accent: "#2346d6",
      accentFg: "#ffffff",
      success: "#1d7a4c",
      danger: "#c8322b",
      warning: "#9a5a06",
      grid: "#dfe6f1",
      shadow: "#14213d",
      scheme: "light",
    },
  },
  {
    id: "chalkboard",
    name: "Midnight Chalkboard Dark",
    tokens: {
      bg: "#17241f",
      surface: "#1f2f29",
      surface2: "#283b34",
      text: "#eef3ea",
      muted: "#a9bab0",
      border: "#3d5349",
      accent: "#f2d16b",
      accentFg: "#17241f",
      success: "#8fe3b0",
      danger: "#ff9d90",
      warning: "#f6c768",
      grid: "#2b3f37",
      shadow: "#000000",
      scheme: "dark",
    },
  },
  {
    id: "violet",
    name: "Royal Violet Purple",
    tokens: {
      bg: "#15112a",
      surface: "#1f1939",
      surface2: "#2a2250",
      text: "#f3efff",
      muted: "#b3aad8",
      border: "#443a70",
      accent: "#b9a0ff",
      accentFg: "#15112a",
      success: "#8fe8b4",
      danger: "#ffa3b5",
      warning: "#f8cf6f",
      grid: "#2a2249",
      shadow: "#000000",
      scheme: "dark",
    },
  },
  {
    id: "sage",
    name: "Forest Sage Green",
    tokens: {
      bg: "#edf2eb",
      surface: "#fbfdf9",
      surface2: "#e0e9dc",
      text: "#17271b",
      muted: "#506352",
      border: "#bfcfbb",
      accent: "#2a6638",
      accentFg: "#ffffff",
      success: "#2a6638",
      danger: "#b0352c",
      warning: "#8a5a06",
      grid: "#d6e1d1",
      shadow: "#17271b",
      scheme: "light",
    },
  },
  {
    id: "exam",
    name: "High-Contrast Exam",
    tokens: {
      bg: "#ffffff",
      surface: "#ffffff",
      surface2: "#eeeeee",
      text: "#000000",
      muted: "#2e2e2e",
      border: "#000000",
      accent: "#0033a0",
      accentFg: "#ffffff",
      success: "#005a1e",
      danger: "#a30000",
      warning: "#6b4000",
      grid: "#bdbdbd",
      shadow: "#000000",
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
  bg: "#f3f7f9",
  text: "#102a33",
  accent: "#0e7c86",
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
    shadow: dark ? "#000000" : c.text,
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
  r.style.setProperty("--shadow", t.shadow ?? (t.scheme === "dark" ? "#000000" : t.text));
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
var r=document.documentElement,m={bg:"--bg",surface:"--surface",surface2:"--surface-2",text:"--text",muted:"--muted",border:"--border",accent:"--accent",accentFg:"--accent-fg",success:"--success",danger:"--danger",warning:"--warning",grid:"--grid",shadow:"--shadow"};
for(var k in m)if(t[k])r.style.setProperty(m[k],t[k]);r.style.colorScheme=t.scheme;r.dataset.theme=id;
}catch(e){}})();`;
}
