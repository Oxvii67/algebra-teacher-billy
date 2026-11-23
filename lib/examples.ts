import type { SolveResult } from "./types";

export interface Example {
  slug: string;
  chip: string;
  result: SolveResult;
}

/** Hand-worked and hand-checked. These render instantly with no API call. */
export const EXAMPLES: Example[] = [
  {
    slug: "factoring-quadratics",
    chip: "Factoring quadratics",
    result: {
      problemLatex: "2x^2 - 7x + 3 = 0",
      problemSummary: "Solve the quadratic equation by factoring.",
      topic: "Factoring quadratics",
      skills: ["AC method", "Factoring by grouping", "Zero product property"],
      prerequisites: [
        {
          skill: "Factor pairs of integers",
          why: "The AC method is a search for two integers. If you cannot list the factor pairs of $6$ fast, including negatives, you will stall at step 2.",
          example: "Pairs with product $6$: $1 \\cdot 6$, $2 \\cdot 3$, $(-1)(-6)$, $(-2)(-3)$. Only $(-1)(-6)$ adds to $-7$.",
          videoQuery: "greatest common factor",
          videoId: "jFd-6EPfnec",
          videoTitle: "Greatest common factor explained (Khan Academy)",
        },
        {
          skill: "Factoring by grouping",
          why: "After you split the middle term you have four terms. Grouping is how those four terms become two binomials.",
          example: "$x^2 + 3x + 2x + 6 = x(x + 3) + 2(x + 3) = (x + 2)(x + 3)$",
          videoQuery: "factoring by grouping",
          videoId: "rR4FfB-FZJw",
          videoTitle: "Factor expressions by grouping (Khan Academy)",
        },
      ],
      steps: [
        { explanation: "Identify $a$, $b$, $c$ from standard form $ax^2 + bx + c = 0$, then compute $ac$.", latex: "a = 2,\\quad b = -7,\\quad c = 3,\\quad ac = 6" },
        { explanation: "Find two integers whose product is $ac = 6$ and whose sum is $b = -7$. That pair is $-1$ and $-6$.", latex: "(-1)(-6) = 6,\\qquad -1 + (-6) = -7" },
        { explanation: "Split the middle term $-7x$ using that pair. The value of the expression does not change.", latex: "2x^2 - x - 6x + 3 = 0" },
        { explanation: "Group the first two terms and the last two terms. Note the sign: pulling out $-3$ turns $+3$ into $-1$ inside.", latex: "x(2x - 1) - 3(2x - 1) = 0" },
        { explanation: "Factor out the common binomial $(2x - 1)$.", latex: "(2x - 1)(x - 3) = 0" },
        { explanation: "Zero product property: if a product is $0$, at least one factor is $0$.", latex: "2x - 1 = 0 \\quad \\text{or} \\quad x - 3 = 0" },
        { explanation: "Solve each linear equation.", latex: "x = \\frac{1}{2} \\quad \\text{or} \\quad x = 3" },
      ],
      finalAnswerLatex: "x = \\frac{1}{2},\\quad x = 3",
      finalAnswerPlain: "x = 1/2, x = 3",
      verification: {
        verified: true,
        check:
          "Plug each answer back into the original equation. For $x = \\frac{1}{2}$: $2\\left(\\frac{1}{4}\\right) - \\frac{7}{2} + 3 = \\frac{1}{2} - \\frac{7}{2} + 3 = 0$. For $x = 3$: $2(9) - 21 + 3 = 0$. Both check.",
        corrections: [],
      },
      simplerMethod: {
        title: "Use the sum and product of the roots",
        steps: [
          { explanation: "For $ax^2 + bx + c = 0$ the roots satisfy $r_1 + r_2 = -\\frac{b}{a}$ and $r_1 r_2 = \\frac{c}{a}$.", latex: "r_1 + r_2 = \\frac{7}{2},\\qquad r_1 r_2 = \\frac{3}{2}" },
          { explanation: "Try $3$: the other root must be $\\frac{7}{2} - 3 = \\frac{1}{2}$, and $3 \\cdot \\frac{1}{2} = \\frac{3}{2}$. Both conditions hold.", latex: "x = 3,\\quad x = \\frac{1}{2}" },
        ],
      },
      commonMistakes: [
        "Picking $-1$ and $-7$ because they add to $-8$ or look close. Check the product and the sum every time.",
        "Writing $-3(2x + 1)$ instead of $-3(2x - 1)$ when grouping. Distribute back to check the sign.",
        "Stopping at $(2x - 1)(x - 3)$. The question asks for $x$, not the factored form.",
      ],
      graphExpressions: ["2*x^2 - 7*x + 3"],
    },
  },
  {
    slug: "log-equations",
    chip: "Log equations",
    result: {
      problemLatex: "\\log_2(x + 3) + \\log_2(x - 3) = 4",
      problemSummary: "Solve the logarithmic equation and reject any extraneous solution.",
      topic: "Logarithmic equations",
      skills: ["Product rule for logarithms", "Converting to exponential form", "Domain of a logarithm"],
      prerequisites: [
        {
          skill: "Properties of logarithms",
          why: "Two logs with the same base are added on the left. The product rule is the only legal way to combine them.",
          example: "$\\log_2 4 + \\log_2 8 = \\log_2 32 = 5$, and indeed $2 + 3 = 5$.",
          videoQuery: "properties of logarithms",
          videoId: "PupNgv49_WY",
          videoTitle: "Introduction to logarithm properties (Khan Academy)",
        },
        {
          skill: "What a logarithm means",
          why: "You must be able to rewrite $\\log_b M = k$ as $b^k = M$ without thinking.",
          example: "$\\log_3 81 = 4$ because $3^4 = 81$.",
          videoQuery: "introduction to logarithms",
          videoId: "mQTWzLpCcW0",
          videoTitle: "Introduction to Logarithms (Khan Academy)",
        },
      ],
      steps: [
        { explanation: "State the domain first. Each argument must be positive: $x + 3 > 0$ and $x - 3 > 0$, so $x > 3$.", latex: "x > 3" },
        { explanation: "Product rule: $\\log_b M + \\log_b N = \\log_b(MN)$.", latex: "\\log_2\\big((x + 3)(x - 3)\\big) = 4" },
        { explanation: "Rewrite in exponential form: $\\log_2 M = 4$ means $M = 2^4$.", latex: "(x + 3)(x - 3) = 16" },
        { explanation: "Multiply. This is a difference of squares.", latex: "x^2 - 9 = 16" },
        { explanation: "Add $9$ to both sides.", latex: "x^2 = 25" },
        { explanation: "Square root property. Do not drop the negative root yet.", latex: "x = 5 \\quad \\text{or} \\quad x = -5" },
        { explanation: "Check against the domain $x > 3$. Reject $x = -5$: it makes $\\log_2(-2)$ undefined.", latex: "x = 5" },
      ],
      finalAnswerLatex: "x = 5",
      finalAnswerPlain: "x = 5",
      verification: {
        verified: true,
        check: "Plug $x = 5$ into the original: $\\log_2 8 + \\log_2 2 = 3 + 1 = 4$. It checks. $x = -5$ is extraneous because $\\log_2(-2)$ is undefined.",
        corrections: [],
      },
      simplerMethod: {
        title: "Read it as powers of 2",
        steps: [
          { explanation: "The two arguments differ by $6$ and their product must be $2^4 = 16$.", latex: "(x + 3) - (x - 3) = 6,\\qquad (x + 3)(x - 3) = 16" },
          { explanation: "Two positive numbers $6$ apart with product $16$: $8$ and $2$. So $x + 3 = 8$.", latex: "x = 5" },
        ],
      },
      commonMistakes: [
        "Writing $\\log_2(x + 3) + \\log_2(x - 3) = \\log_2(2x)$. Logs of a sum do not combine; only a sum of logs does.",
        "Keeping $x = -5$. Always test answers against the domain of every log in the original equation.",
        "Converting to $(x + 3)(x - 3) = 8$ by computing $4^2$ or $2 \\cdot 4$. The base is $2$, so it is $2^4 = 16$.",
      ],
      graphExpressions: ["log(x + 3, 2) + log(x - 3, 2)", "4"],
    },
  },
  {
    slug: "rational-asymptotes",
    chip: "Rational asymptotes",
    result: {
      problemLatex: "f(x) = \\frac{2x^2 - 8}{x^2 - x - 6}",
      problemSummary: "Find every vertical asymptote, horizontal asymptote, hole, and intercept.",
      topic: "Rational functions",
      skills: ["Factoring", "Holes versus vertical asymptotes", "Degree comparison"],
      prerequisites: [
        {
          skill: "Simplifying rational expressions",
          why: "A factor that cancels makes a hole, not an asymptote. You cannot tell them apart without factoring both parts first.",
          example: "$\\frac{x^2 - 1}{x - 1} = \\frac{(x - 1)(x + 1)}{x - 1} = x + 1$ with a hole at $x = 1$.",
          videoQuery: "simplifying rational expressions",
          videoId: "7Uos1ED3KHI",
          videoTitle: "Simplifying rational expressions introduction (Khan Academy)",
        },
        {
          skill: "Asymptotes of rational functions",
          why: "Horizontal asymptotes come from comparing degrees. Know the three cases cold.",
          example: "$y = \\frac{3x^2 + 1}{x^2 - 4}$ has equal degrees, so $y = \\frac{3}{1} = 3$.",
          videoQuery: "asymptotes of rational functions",
          videoId: "2N62v_63SBo",
          videoTitle: "Asymptotes of rational functions (Khan Academy)",
        },
      ],
      steps: [
        { explanation: "Factor the numerator. First pull out the GCF $2$, then use difference of squares.", latex: "2x^2 - 8 = 2(x^2 - 4) = 2(x - 2)(x + 2)" },
        { explanation: "Factor the denominator. Two numbers with product $-6$ and sum $-1$: $-3$ and $2$.", latex: "x^2 - x - 6 = (x - 3)(x + 2)" },
        { explanation: "Rewrite $f$ in factored form. The domain excludes $x = 3$ and $x = -2$.", latex: "f(x) = \\frac{2(x - 2)(x + 2)}{(x - 3)(x + 2)},\\quad x \\ne 3,\\ -2" },
        { explanation: "The factor $(x + 2)$ cancels, so $x = -2$ is a hole. Find its height from the simplified form.", latex: "\\frac{2(-2 - 2)}{-2 - 3} = \\frac{-8}{-5} = \\frac{8}{5} \\;\\Rightarrow\\; \\text{hole at } \\left(-2, \\tfrac{8}{5}\\right)" },
        { explanation: "The factor $(x - 3)$ does not cancel, so $x = 3$ is a vertical asymptote.", latex: "x = 3" },
        { explanation: "Degrees are equal ($2$ and $2$), so the horizontal asymptote is the ratio of leading coefficients.", latex: "y = \\frac{2}{1} = 2" },
        { explanation: "Intercepts from the simplified form $\\frac{2(x - 2)}{x - 3}$: set the numerator to $0$ for the $x$-intercept, plug in $x = 0$ for the $y$-intercept.", latex: "x\\text{-int}: (2, 0),\\qquad y\\text{-int}: \\left(0, \\tfrac{-4}{-3}\\right) = \\left(0, \\tfrac{4}{3}\\right)" },
      ],
      finalAnswerLatex: "\\text{VA: } x = 3,\\quad \\text{HA: } y = 2,\\quad \\text{hole: } \\left(-2, \\tfrac{8}{5}\\right),\\quad (2, 0),\\ \\left(0, \\tfrac{4}{3}\\right)",
      finalAnswerPlain: "VA x = 3; HA y = 2; hole (-2, 8/5); x-intercept (2, 0); y-intercept (0, 4/3)",
      verification: {
        verified: true,
        check:
          "Check the intercepts in the original: $f(2) = \\frac{8 - 8}{4 - 2 - 6} = 0$ and $f(0) = \\frac{-8}{-6} = \\frac{4}{3}$. Near $x = 3$ the denominator goes to $0$ while the numerator is $10$, so $f$ blows up: a true asymptote. At $x = -2$ both parts are $0$, which confirms a hole.",
        corrections: [],
      },
      simplerMethod: null,
      commonMistakes: [
        "Calling $x = -2$ a vertical asymptote. If the factor cancels, it is a hole.",
        "Finding the hole's $y$-value by plugging $-2$ into the original. That gives $\\frac{0}{0}$; use the simplified form.",
        "Using $y = 0$ as the horizontal asymptote. That rule is only for a smaller numerator degree.",
      ],
      graphExpressions: ["(2*x^2 - 8)/(x^2 - x - 6)", "2"],
    },
  },
];

export function exampleBySlug(slug: string | null): Example | undefined {
  return slug ? EXAMPLES.find((e) => e.slug === slug) : undefined;
}
