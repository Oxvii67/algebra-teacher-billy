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
  /** Warm secondary highlight: margin rules, streaks, emphasis marks. */
  highlight: string;
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
  blurb: string;
  tokens: ThemeTokens;
}

/** Theme for visitors who have never picked one. */
export const DEFAULT_THEME: ThemeId = "chalkboard";

export const THEMES: ThemeDef[] = [
  {
    id: "paper",
    name: "Studio Daylight",
    blurb: "Bright white, friendly violet, a pop of coral.",
    tokens: {
      bg: "#fcfbff",
      surface: "#ffffff",
      surface2: "#f3f1fd",
      text: "#1e1b33",
      muted: "#6a6782",
      border: "rgba(76, 61, 160, 0.10)",
      accent: "#5b4cf5",
      accentFg: "#ffffff",
      highlight: "#ff7a45",
      success: "#16a34a",
      danger: "#dc2f45",
      warning: "#d97706",
      grid: "#eeecfa",
      shadow: "#3b2f8f",
      scheme: "light",
    },
  },
  {
    id: "chalkboard",
    name: "Midnight Black",
    blurb: "True black with violet ink. The default.",
    tokens: {
      bg: "#000000",
      surface: "#0e0e11",
      surface2: "#18181d",
      text: "#ededf0",
      muted: "#9c9ea8",
      border: "rgba(255, 255, 255, 0.08)",
      accent: "#8b7dff",
      accentFg: "#0b0820",
      highlight: "#f0a24a",
      success: "#5cc994",
      danger: "#ff8a7a",
      warning: "#f2b45a",
      grid: "#15151a",
      shadow: "#000000",
      scheme: "dark",
    },
  },
  {
    id: "violet",
    name: "Royal Indigo",
    blurb: "Deep ink with a periwinkle accent.",
    tokens: {
      bg: "#110f24",
      surface: "#18162f",
      surface2: "#211e3d",
      text: "#eeecfb",
      muted: "#a6a1c7",
      border: "rgba(238, 236, 251, 0.1)",
      accent: "#a5b4fc",
      accentFg: "#110f24",
      highlight: "#f9b77a",
      success: "#7ad7a4",
      danger: "#ff9aa8",
      warning: "#f9c46b",
      grid: "#1f1c3a",
      shadow: "#000000",
      scheme: "dark",
    },
  },
  {
    id: "sage",
    name: "Botanical Sage",
    blurb: "Pressed-leaf greens on soft linen.",
    tokens: {
      bg: "#f4f5ef",
      surface: "#ffffff",
      surface2: "#ebeee4",
      text: "#17201a",
      muted: "#56625a",
      border: "rgba(23, 32, 26, 0.09)",
      accent: "#2f6b45",
      accentFg: "#ffffff",
      highlight: "#b8621b",
      success: "#2f6b45",
      danger: "#b42318",
      warning: "#9a5b0b",
      grid: "#e7ebdf",
      shadow: "#25301f",
      scheme: "light",
    },
  },
  {
    id: "exam",
    name: "High-Contrast Exam",
    blurb: "Black on white. Nothing extra.",
    tokens: {
      bg: "#ffffff",
      surface: "#ffffff",
      surface2: "#f0f0f0",
      text: "#000000",
      muted: "#262626",
      border: "#000000",
      accent: "#0033a0",
      accentFg: "#ffffff",
      highlight: "#8a4b00",
      success: "#005a1e",
      danger: "#a30000",
      warning: "#6b4000",
      grid: "#c4c4c4",
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
  bg: "#f7f5f0",
  text: "#1b1a17",
  accent: "#0f766e",
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
    highlight: dark ? "#f2b45a" : "#c2610c",
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
  r.style.setProperty("--highlight", t.highlight ?? t.warning);
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
var id=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${JSON.stringify(DEFAULT_THEME)};
var t=T[id];
if(id==="custom"){t=JSON.parse(localStorage.getItem(${JSON.stringify(CUSTOM_TOKENS_KEY)})||"null");}
if(!t)t=T[${JSON.stringify(DEFAULT_THEME)}];
var r=document.documentElement,m={bg:"--bg",surface:"--surface",surface2:"--surface-2",text:"--text",muted:"--muted",border:"--border",accent:"--accent",accentFg:"--accent-fg",highlight:"--highlight",success:"--success",danger:"--danger",warning:"--warning",grid:"--grid",shadow:"--shadow"};
for(var k in m)if(t[k])r.style.setProperty(m[k],t[k]);r.style.colorScheme=t.scheme;r.dataset.theme=id;
}catch(e){}})();`;
}
