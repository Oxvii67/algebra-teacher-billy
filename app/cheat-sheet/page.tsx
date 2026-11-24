import { pageMeta } from "@/lib/pageMeta";
import { MathInline } from "@/components/math/Math";
import { PrintButton } from "./PrintButton";

export const metadata = pageMeta("/cheat-sheet", "Formula sheet", "Printable one-page math formula sheet: quadratics, exponents, logarithms, trigonometry and more.");

type Row = [label: string, latex: string];

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "Quadratics",
    rows: [
      ["Quadratic formula", "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"],
      ["Discriminant", "D = b^2 - 4ac \\;(>0: 2,\\ =0: 1,\\ <0: \\text{complex})"],
      ["Vertex form", "y = a(x - h)^2 + k,\\; h = -\\frac{b}{2a}"],
      ["Sum and product of roots", "r_1 + r_2 = -\\frac{b}{a},\\; r_1 r_2 = \\frac{c}{a}"],
      ["Complete the square", "x^2 + bx = \\left(x + \\tfrac{b}{2}\\right)^2 - \\tfrac{b^2}{4}"],
    ],
  },
  {
    title: "Factoring patterns",
    rows: [
      ["Difference of squares", "a^2 - b^2 = (a - b)(a + b)"],
      ["Perfect square", "a^2 \\pm 2ab + b^2 = (a \\pm b)^2"],
      ["Sum of cubes", "a^3 + b^3 = (a + b)(a^2 - ab + b^2)"],
      ["Difference of cubes", "a^3 - b^3 = (a - b)(a^2 + ab + b^2)"],
      ["Always first", "\\text{Factor out the GCF}"],
    ],
  },
  {
    title: "Exponents and radicals",
    rows: [
      ["Product and quotient", "a^m a^n = a^{m+n},\\; \\frac{a^m}{a^n} = a^{m-n}"],
      ["Power rules", "(a^m)^n = a^{mn},\\; (ab)^n = a^n b^n"],
      ["Zero and negative", "a^0 = 1,\\; a^{-n} = \\frac{1}{a^n}"],
      ["Rational exponent", "a^{m/n} = \\sqrt[n]{a^m} = \\left(\\sqrt[n]{a}\\right)^m"],
      ["Even roots", "\\sqrt{x^2} = |x|"],
    ],
  },
  {
    title: "Logarithms",
    rows: [
      ["Definition", "\\log_b x = y \\iff b^y = x,\\; x > 0"],
      ["Product and quotient", "\\log_b(MN) = \\log_b M + \\log_b N,\\; \\log_b\\tfrac{M}{N} = \\log_b M - \\log_b N"],
      ["Power", "\\log_b(M^p) = p\\log_b M"],
      ["Change of base", "\\log_b x = \\frac{\\ln x}{\\ln b}"],
      ["Inverses", "b^{\\log_b x} = x,\\; \\log_b b^x = x"],
    ],
  },
  {
    title: "Exponential models",
    rows: [
      ["Growth and decay", "A = P(1 + r)^t"],
      ["Compound interest", "A = P\\left(1 + \\frac{r}{n}\\right)^{nt}"],
      ["Continuous", "A = Pe^{rt}"],
      ["Half-life", "A = A_0\\left(\\tfrac{1}{2}\\right)^{t/h}"],
    ],
  },
  {
    title: "Functions",
    rows: [
      ["Transformations", "a\\,f\\big(b(x - h)\\big) + k"],
      ["Composition", "(f \\circ g)(x) = f\\big(g(x)\\big)"],
      ["Inverse", "f\\big(f^{-1}(x)\\big) = x,\\; \\text{swap } x, y \\text{ and solve}"],
      ["Even and odd", "f(-x) = f(x),\\; f(-x) = -f(x)"],
      ["Average rate of change", "\\frac{f(b) - f(a)}{b - a}"],
    ],
  },
  {
    title: "Polynomials and rational functions",
    rows: [
      ["Remainder theorem", "P(x) \\div (x - c) \\Rightarrow R = P(c)"],
      ["Rational root theorem", "\\pm\\frac{\\text{factors of } a_0}{\\text{factors of } a_n}"],
      ["Vertical asymptote", "\\text{denominator} = 0 \\text{ after cancelling}"],
      ["Horizontal asymptote", "\\deg N < \\deg D: y = 0;\\; = : y = \\tfrac{a_n}{b_n}"],
      ["Slant asymptote", "\\deg N = \\deg D + 1"],
    ],
  },
  {
    title: "Sequences and series",
    rows: [
      ["Arithmetic term", "a_n = a_1 + (n - 1)d"],
      ["Arithmetic sum", "S_n = \\frac{n}{2}(a_1 + a_n)"],
      ["Geometric term", "a_n = a_1 r^{n-1}"],
      ["Geometric sum", "S_n = a_1\\frac{1 - r^n}{1 - r}"],
      ["Infinite geometric", "S = \\frac{a_1}{1 - r},\\; |r| < 1"],
    ],
  },
  {
    title: "Trigonometry",
    rows: [
      ["Pythagorean", "\\sin^2\\theta + \\cos^2\\theta = 1"],
      ["Tangent", "\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}"],
      ["Double angle", "\\sin 2\\theta = 2\\sin\\theta\\cos\\theta"],
      ["Cosine double", "\\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta"],
      ["Special values", "\\sin\\tfrac{\\pi}{6} = \\tfrac{1}{2},\\; \\sin\\tfrac{\\pi}{4} = \\tfrac{\\sqrt{2}}{2},\\; \\sin\\tfrac{\\pi}{3} = \\tfrac{\\sqrt{3}}{2}"],
      ["Arc and radians", "s = r\\theta,\\; 180^\\circ = \\pi"],
    ],
  },
  {
    title: "Conics",
    rows: [
      ["Circle", "(x - h)^2 + (y - k)^2 = r^2"],
      ["Parabola", "(x - h)^2 = 4p(y - k)"],
      ["Ellipse", "\\frac{(x - h)^2}{a^2} + \\frac{(y - k)^2}{b^2} = 1,\\; c^2 = a^2 - b^2"],
      ["Hyperbola", "\\frac{(x - h)^2}{a^2} - \\frac{(y - k)^2}{b^2} = 1,\\; c^2 = a^2 + b^2"],
    ],
  },
  {
    title: "Complex numbers",
    rows: [
      ["Unit", "i^2 = -1,\\; i^3 = -i,\\; i^4 = 1"],
      ["Conjugate", "(a + bi)(a - bi) = a^2 + b^2"],
      ["Modulus", "|a + bi| = \\sqrt{a^2 + b^2}"],
    ],
  },
  {
    title: "Counting and probability",
    rows: [
      ["Permutations", "{}_nP_r = \\frac{n!}{(n - r)!}"],
      ["Combinations", "{}_nC_r = \\binom{n}{r} = \\frac{n!}{r!(n - r)!}"],
      ["Binomial theorem", "(a + b)^n = \\sum_{k=0}^{n}\\binom{n}{k}a^{n-k}b^k"],
      ["Complement", "P(A') = 1 - P(A)"],
      ["Union", "P(A \\cup B) = P(A) + P(B) - P(A \\cap B)"],
    ],
  },
];

export default function CheatSheetPage() {
  return (
    <div className="space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Formula sheet</h1>
          <p className="mt-1 text-muted">Know these cold. Prints on a single page.</p>
        </div>
        <PrintButton />
      </header>

      <article className="print-area card p-5 print:p-0 print:text-[8.5px] print:leading-tight">
        <p className="mb-3 hidden display-tight text-base font-semibold print:block">Algebra Teacher Billy: Algebra 2 and AP Precalculus Formula Sheet</p>
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 print:columns-3 print:gap-4">
          {SECTIONS.map((s) => (
            <section key={s.title} className="mb-5 break-inside-avoid print:mb-2">
              <h2 className="mb-1.5 border-b border-line pb-1 text-sm font-semibold text-accent print:mb-0.5 print:text-[9.5px] print:text-black">{s.title}</h2>
              <dl className="space-y-1.5 print:space-y-0.5">
                {s.rows.map(([label, latex]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted print:text-[7.5px] print:text-black">{label}</dt>
                    <dd className="-mx-1 overflow-x-auto px-1 py-1.5 text-sm print:overflow-visible print:py-0 print:text-[8.5px]">
                      <MathInline latex={`\\displaystyle ${latex}`} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
