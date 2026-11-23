/**
 * Hand-worked examples for the landing-page sandbox. Every step and every plotted feature was
 * checked by hand; nothing here calls the API.
 */

export interface SandboxPoint {
  x: number;
  y: number;
  label: string;
  kind: "point" | "hole";
}

export interface SandboxStep {
  /** Short margin note: what this line does. */
  note: string;
  latex: string;
  /** Plot feature ids this step is about, highlighted when the step is selected. */
  focus?: string[];
}

export interface SandboxExample {
  id: string;
  tab: string;
  topic: string;
  problemLatex: string;
  rule: { name: string; latex: string };
  steps: SandboxStep[];
  answerLatex: string;
  check: string;
  /** Plot window. */
  x: [number, number];
  y: [number, number];
  curves: { id: string; fn: (x: number) => number; domain?: [number, number]; tone: "accent" | "highlight" }[];
  vlines: { id: string; x: number; label: string }[];
  hlines: { id: string; y: number; label: string; tone?: "accent" | "highlight" | "muted" }[];
  points: (SandboxPoint & { id: string })[];
  studioHref: string;
}

const S3 = Math.sqrt(3);

export const SANDBOX: SandboxExample[] = [
  {
    id: "quadratic",
    tab: "Quadratic formula",
    topic: "Quadratic equations",
    problemLatex: "x^2 - 4x + 1 = 0",
    rule: { name: "Quadratic formula", latex: "x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
    steps: [
      { note: "Read the coefficients", latex: "a = 1,\\quad b = -4,\\quad c = 1" },
      { note: "Discriminant first", latex: "b^2 - 4ac = 16 - 4 = 12 > 0", focus: ["r1", "r2"] },
      { note: "Substitute", latex: "x = \\dfrac{4 \\pm \\sqrt{12}}{2}" },
      { note: "Simplify the radical", latex: "\\sqrt{12} = 2\\sqrt{3}" },
      { note: "Divide every term by 2", latex: "x = 2 \\pm \\sqrt{3}", focus: ["r1", "r2", "v"] },
    ],
    answerLatex: "x = 2 \\pm \\sqrt{3} \\approx 0.268,\\ 3.732",
    check: "Positive discriminant, so two real roots, symmetric about the axis $x = 2$.",
    x: [-1.5, 5.5],
    y: [-4, 6],
    curves: [{ id: "f", fn: (x) => x * x - 4 * x + 1, tone: "accent" }],
    vlines: [{ id: "v", x: 2, label: "x = 2" }],
    hlines: [],
    points: [
      { id: "r1", x: 2 - S3, y: 0, label: "2 - √3", kind: "point" },
      { id: "r2", x: 2 + S3, y: 0, label: "2 + √3", kind: "point" },
      { id: "v", x: 2, y: -3, label: "(2, -3)", kind: "point" },
    ],
    studioHref: "/studio?example=factoring-quadratics",
  },
  {
    id: "log",
    tab: "Logarithms",
    topic: "Logarithmic equations",
    problemLatex: "\\log_2(x + 3) + \\log_2(x - 3) = 4",
    rule: { name: "Product rule", latex: "\\log_b M + \\log_b N = \\log_b(MN)" },
    steps: [
      { note: "Domain before anything", latex: "x + 3 > 0 \\ \\text{and}\\ x - 3 > 0 \;\\Rightarrow\; x > 3", focus: ["d"] },
      { note: "Product rule", latex: "\\log_2\\big((x + 3)(x - 3)\\big) = 4" },
      { note: "Rewrite in exponential form", latex: "x^2 - 9 = 2^4 = 16", focus: ["k"] },
      { note: "Isolate and take roots", latex: "x^2 = 25 \;\\Rightarrow\; x = \\pm 5" },
      { note: "Reject what breaks the domain", latex: "x = -5 \\notin (3, \\infty)", focus: ["d", "p"] },
    ],
    answerLatex: "x = 5",
    check: "Check: $\\log_2 8 + \\log_2 2 = 3 + 1 = 4$. The curve meets $y = 4$ exactly once, at $x = 5$.",
    x: [1.5, 9],
    y: [-3, 6.5],
    curves: [{ id: "f", fn: (x) => Math.log2(x + 3) + Math.log2(x - 3), domain: [3.0005, 9], tone: "accent" }],
    vlines: [{ id: "d", x: 3, label: "x = 3" }],
    hlines: [{ id: "k", y: 4, label: "y = 4", tone: "highlight" }],
    points: [{ id: "p", x: 5, y: 4, label: "(5, 4)", kind: "point" }],
    studioHref: "/studio?example=log-equations",
  },
  {
    id: "rational",
    tab: "Rational functions",
    topic: "Rational functions",
    problemLatex: "f(x) = \\dfrac{2x^2 - 8}{x^2 - x - 6}",
    rule: { name: "Horizontal asymptote", latex: "\\deg p = \\deg q \;\\Rightarrow\; y = \\tfrac{\\text{lead}(p)}{\\text{lead}(q)}" },
    steps: [
      { note: "Factor top and bottom", latex: "f(x) = \\dfrac{2(x - 2)(x + 2)}{(x - 3)(x + 2)}" },
      { note: "Common factor means a hole", latex: "x = -2:\\ \\ f \\to \\dfrac{2(-4)}{-5} = \\dfrac{8}{5}", focus: ["h"] },
      { note: "Remaining zero of the bottom", latex: "x = 3 \\ \\text{is a vertical asymptote}", focus: ["va"] },
      { note: "Equal degrees", latex: "y = \\tfrac{2}{1} = 2", focus: ["ha"] },
      { note: "Intercepts", latex: "x\\text{-int}\\ (2, 0),\\quad y\\text{-int}\\ \\left(0, \\tfrac{4}{3}\\right)", focus: ["xi", "yi"] },
    ],
    answerLatex: "\\text{hole } \\left(-2, \\tfrac{8}{5}\\right),\\ \\ x = 3,\\ \\ y = 2",
    check: "The simplified form $\\frac{2(x - 2)}{x - 3}$ agrees with $f$ everywhere except the hole at $x = -2$.",
    x: [-6, 9],
    y: [-6, 10],
    curves: [
      { id: "fL", fn: (x) => (2 * (x - 2)) / (x - 3), domain: [-6, 2.83], tone: "accent" },
      { id: "fR", fn: (x) => (2 * (x - 2)) / (x - 3), domain: [3.2, 9], tone: "accent" },
    ],
    vlines: [{ id: "va", x: 3, label: "x = 3" }],
    hlines: [{ id: "ha", y: 2, label: "y = 2", tone: "muted" }],
    points: [
      { id: "h", x: -2, y: 1.6, label: "hole", kind: "hole" },
      { id: "xi", x: 2, y: 0, label: "(2, 0)", kind: "point" },
      { id: "yi", x: 0, y: 4 / 3, label: "(0, 4/3)", kind: "point" },
    ],
    studioHref: "/studio?example=rational-asymptotes",
  },
];
