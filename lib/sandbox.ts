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

export type SandboxCourse = "Algebra 2" | "AP Precalculus" | "AP Calculus";

export interface SandboxExample {
  id: string;
  course: SandboxCourse;
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
  vlines: { id: string; x: number; label: string; tone?: "danger" | "muted" }[];
  /** Optional shaded region under a curve, for integrals. */
  area?: { id: string; fn: (x: number) => number; a: number; b: number };
  hlines: { id: string; y: number; label: string; tone?: "accent" | "highlight" | "muted" }[];
  points: (SandboxPoint & { id: string })[];
  /** Where "Open the full lesson" goes. */
  href: string;
}

const S3 = Math.sqrt(3);

export const SANDBOX: SandboxExample[] = [
  {
    id: "quadratic",
    course: "Algebra 2",
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
    href: "/studio?example=factoring-quadratics",
  },
  {
    id: "log",
    course: "Algebra 2",
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
    href: "/studio?example=log-equations",
  },
  {
    id: "rational",
    course: "AP Precalculus",
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
    href: "/studio?example=rational-asymptotes",
  },
  {
    id: "sinusoid",
    course: "AP Precalculus",
    tab: "Sinusoids",
    topic: "Sinusoidal functions",
    problemLatex: "f(x) = 3\\sin\\!\\big(2(x - \\tfrac{\\pi}{4})\\big) + 1",
    rule: { name: "General sinusoid", latex: "y = A\\sin\\big(B(x - h)\\big) + k" },
    steps: [
      { note: "Amplitude is |A|", latex: "A = 3", focus: ["mx", "mn"] },
      { note: "Period from B", latex: "\\text{period} = \\dfrac{2\\pi}{B} = \\dfrac{2\\pi}{2} = \\pi" },
      { note: "Phase shift h", latex: "h = \\tfrac{\\pi}{4} \\ \\text{to the right}", focus: ["s"] },
      { note: "Midline from k", latex: "y = 1", focus: ["mid"] },
      { note: "Max and min", latex: "1 \\pm 3:\\quad y_{\\max} = 4,\\ \\ y_{\\min} = -2", focus: ["mx", "mn"] },
    ],
    answerLatex: "A = 3,\\ \\ T = \\pi,\\ \\ h = \\tfrac{\\pi}{4},\\ \\ y = 1",
    check: "Check the peak: at $x = \\frac{\\pi}{2}$, $2(x - \\frac{\\pi}{4}) = \\frac{\\pi}{2}$ and $3\\sin\\frac{\\pi}{2} + 1 = 4$.",
    x: [-0.6, 6.8],
    y: [-3.2, 5.2],
    curves: [{ id: "f", fn: (x) => 3 * Math.sin(2 * (x - Math.PI / 4)) + 1, tone: "accent" }],
    vlines: [],
    hlines: [{ id: "mid", y: 1, label: "y = 1", tone: "muted" }],
    points: [
      { id: "s", x: Math.PI / 4, y: 1, label: "(\u03c0/4, 1)", kind: "point" },
      { id: "mx", x: Math.PI / 2, y: 4, label: "(\u03c0/2, 4)", kind: "point" },
      { id: "mn", x: Math.PI, y: -2, label: "(\u03c0, -2)", kind: "point" },
    ],
    href: "/tutor?p=" + encodeURIComponent("f(x) = 3\\sin(2(x - \\tfrac{\\pi}{4})) + 1"),
  },
  {
    id: "tangent",
    course: "AP Calculus",
    tab: "Tangent lines",
    topic: "Derivatives",
    problemLatex: "\\text{Tangent to } f(x) = x^3 - 3x \\text{ at } x = 2",
    rule: { name: "Power rule", latex: "\\dfrac{d}{dx}\\,x^n = n x^{n-1}" },
    steps: [
      { note: "Differentiate term by term", latex: "f'(x) = 3x^2 - 3" },
      { note: "Slope at the point", latex: "f'(2) = 3(4) - 3 = 9", focus: ["t"] },
      { note: "The point itself", latex: "f(2) = 8 - 6 = 2", focus: ["p"] },
      { note: "Point-slope form", latex: "y - 2 = 9(x - 2)", focus: ["t", "p"] },
      { note: "Slope-intercept form", latex: "y = 9x - 16", focus: ["t"] },
    ],
    answerLatex: "y = 9x - 16",
    check: "The line passes through $(2, 2)$: $9(2) - 16 = 2$. Its slope $9$ equals $f'(2)$.",
    x: [-3, 4],
    y: [-6, 10],
    curves: [
      { id: "f", fn: (x) => x ** 3 - 3 * x, tone: "accent" },
      { id: "t", fn: (x) => 9 * x - 16, tone: "highlight" },
    ],
    vlines: [],
    hlines: [],
    points: [{ id: "p", x: 2, y: 2, label: "(2, 2)", kind: "point" }],
    href: "/tutor?p=" + encodeURIComponent("\\text{Find the tangent line to } f(x) = x^3 - 3x \\text{ at } x = 2"),
  },
  {
    id: "integral",
    course: "AP Calculus",
    tab: "Area under a curve",
    topic: "Definite integrals",
    problemLatex: "\\displaystyle\\int_0^2 \\left(x^2 + 1\\right)dx",
    rule: { name: "Fundamental Theorem", latex: "\\int_a^b f(x)\\,dx = F(b) - F(a)" },
    steps: [
      { note: "Antiderivative, power rule", latex: "F(x) = \\dfrac{x^3}{3} + x" },
      { note: "Set up F(b) - F(a)", latex: "F(2) - F(0)", focus: ["A"] },
      { note: "Upper limit", latex: "F(2) = \\dfrac{8}{3} + 2 = \\dfrac{14}{3}", focus: ["b"] },
      { note: "Lower limit", latex: "F(0) = 0", focus: ["a"] },
      { note: "Subtract", latex: "\\dfrac{14}{3} - 0 = \\dfrac{14}{3} \\approx 4.667", focus: ["A"] },
    ],
    answerLatex: "\\dfrac{14}{3}",
    check: "Differentiate back: $F'(x) = x^2 + 1$. Four midpoint rectangles give $4.625$, just under $\\frac{14}{3}$, as expected for a concave-up curve.",
    x: [-1, 3],
    y: [-1, 6.5],
    curves: [{ id: "f", fn: (x) => x * x + 1, tone: "accent" }],
    vlines: [{ id: "bl", x: 2, label: "x = 2", tone: "muted" }],
    hlines: [],
    area: { id: "A", fn: (x) => x * x + 1, a: 0, b: 2 },
    points: [
      { id: "a", x: 0, y: 1, label: "(0, 1)", kind: "point" },
      { id: "b", x: 2, y: 5, label: "(2, 5)", kind: "point" },
    ],
    href: "/tutor?p=" + encodeURIComponent("\\int_0^2 (x^2 + 1)\\,dx"),
  },
];
