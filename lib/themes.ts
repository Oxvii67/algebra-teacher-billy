export type ThemeId = "paper" | "chalkboard" | "violet" | "sage" | "crimson" | "exam" | "custom";

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentFg: string;
  /** Accent for text and thin lines, when the accent itself is too close to the surface. Defaults to accent. */
  accentInk?: string;
  /** Accent for fills that carry text in accentFg. Defaults to accent. */
  accentSolid?: string;
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
    blurb: "Off-white paper, near-black ink, blue pen.",
    tokens: {
      bg: "#f6f6f4",
      surface: "#ffffff",
      surface2: "#efefec",
      text: "#18181a",
      muted: "#5d5d63",
      border: "rgba(24, 24, 26, 0.11)",
      accent: "#1f5fe0",
      accentFg: "#ffffff",
      highlight: "#c2410c",
      success: "#15803d",
      danger: "#c0262d",
      warning: "#b45309",
      grid: "#ececea",
      shadow: "#18181a",
      scheme: "light",
    },
  },
  {
    id: "chalkboard",
    name: "Midnight Obsidian",
    blurb: "Near-black with blue ink. The default.",
    tokens: {
      bg: "#070708",
      surface: "#111113",
      surface2: "#1a1a1d",
      text: "#ededee",
      muted: "#9a9aa2",
      border: "rgba(255, 255, 255, 0.1)",
      accent: "#5b9bff",
      accentFg: "#04101f",
      highlight: "#f59e5b",
      success: "#5cc994",
      danger: "#ff8a7a",
      warning: "#f2b45a",
      grid: "#151518",
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
    // Maroon surfaces, white type. Vermillion fills; a lighter coral of the same hue wherever it is
    // text or a thin line, because #e34234 itself is only 3:1 on the maroon card.
    id: "crimson",
    name: "Crimson & Maroon",
    blurb: "Maroon with vermillion ink.",
    tokens: {
      bg: "#2b060b",
      surface: "#6b0f1a",
      surface2: "#4a0a12",
      text: "#ffffff",
      muted: "#f2d3cf",
      border: "rgba(255, 255, 255, 0.2)",
      accent: "#e34234",
      accentFg: "#ffffff",
      accentInk: "#ffa28f",
      accentSolid: "#d93a2c",
      highlight: "#ffcf8a",
      success: "#86efac",
      danger: "#ffb0c0",
      warning: "#fcd34d",
      grid: "#8c2c33",
      shadow: "#000000",
      scheme: "dark",
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

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}

/** Lightens or darkens a color only as far as needed to reach the given contrast on a background. Hex only. */
export function legibleOn(color: string, bg: string, min = 3.5): string {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(bg)) return color;
  const target = contrast("#ffffff", bg) > contrast("#000000", bg) ? "#ffffff" : "#000000";
  for (let t = 0; t < 1; t += 0.05) {
    const c = mix(color, target, t);
    if (contrast(c, bg) >= min) return c;
  }
  return target;
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
  r.style.setProperty("--accent-ink", t.accentInk ?? t.accent);
  r.style.setProperty("--accent-solid", t.accentSolid ?? t.accent);
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
  // Themes that omit accentInk/accentSolid fall back to the :root defaults in globals.css, which follow --accent.
  return `(function(){try{
var T=${JSON.stringify(all)};
var id=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${JSON.stringify(DEFAULT_THEME)};
var t=T[id];
if(id==="custom"){t=JSON.parse(localStorage.getItem(${JSON.stringify(CUSTOM_TOKENS_KEY)})||"null");}
if(!t)t=T[${JSON.stringify(DEFAULT_THEME)}];
var r=document.documentElement,m={bg:"--bg",surface:"--surface",surface2:"--surface-2",text:"--text",muted:"--muted",border:"--border",accent:"--accent",accentFg:"--accent-fg",accentInk:"--accent-ink",accentSolid:"--accent-solid",highlight:"--highlight",success:"--success",danger:"--danger",warning:"--warning",grid:"--grid",shadow:"--shadow"};
for(var k in m)if(t[k])r.style.setProperty(m[k],t[k]);r.style.colorScheme=t.scheme;r.dataset.theme=id;
}catch(e){}})();`;
}
