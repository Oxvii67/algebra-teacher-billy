export interface CuratedVideo {
  id: string;
  title: string;
  channel: "Khan Academy" | "The Organic Chemistry Tutor" | "3Blue1Brown";
}

export interface VideoTopic {
  slug: string;
  name: string;
  keywords: string[];
  videos: CuratedVideo[];
}

/** Video IDs verified against YouTube search results for each channel. */
export const VIDEO_TOPICS: VideoTopic[] = [
  {
    slug: "integer-factoring",
    name: "Factoring integers and greatest common factor",
    keywords: ["gcf", "greatest common factor", "integer factor", "prime factor", "factor pairs", "common factor", "factors of"],
    videos: [{"id": "jFd-6EPfnec", "title": "Greatest common factor explained | Factors and multiples | Pre-Algebra | Khan Academy", "channel": "Khan Academy"}, {"id": "BIlF65I2EwA", "title": "How To Find The Greatest Common Factor Quickly!", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "factoring-trinomials",
    name: "Factoring trinomials",
    keywords: ["trinomial", "factor quadratic", "factoring quadratic", "ac method", "factor polynomial", "factoring polynomial", "factor completely"],
    videos: [{"id": "GMoqg_s4Dl4", "title": "Example 1: Factoring trinomials with a common factor | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "-4jANGlJRSY", "title": "Factoring Trinomials The Easy Fast Way", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "factoring-grouping",
    name: "Factoring by grouping",
    keywords: ["grouping", "four terms", "ac method"],
    videos: [{"id": "rR4FfB-FZJw", "title": "Factor expressions by grouping", "channel": "Khan Academy"}, {"id": "t7-JCa7phCQ", "title": "Factor By Grouping Polynomials - 4 Terms, Trinomials - 3 Terms, Algebra 2", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "difference-of-squares",
    name: "Difference of squares",
    keywords: ["difference of squares", "difference of two squares", "sum of cubes", "difference of cubes", "special products"],
    videos: [{"id": "HLNSouzygw0", "title": "Difference of squares intro | Mathematics II | High School Math | Khan Academy", "channel": "Khan Academy"}, {"id": "vypGuPy6g2A", "title": "How To Factor Difference of Squares - Algebra", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "quadratic-formula",
    name: "Quadratic formula",
    keywords: ["quadratic formula", "discriminant", "quadratic equation", "roots of quadratic"],
    videos: [{"id": "i7idZfS8t8w", "title": "How to use the quadratic formula | Polynomial and rational functions | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "IlNAJl36-10", "title": "How To Solve Quadratic Equations Using The Quadratic Formula", "channel": "The Organic Chemistry Tutor"}, {"id": "MHXO86wKeDY", "title": "The simpler quadratic formula | Ep. 1 Lockdown live math", "channel": "3Blue1Brown"}],
  },
  {
    slug: "completing-the-square",
    name: "Completing the square",
    keywords: ["completing the square", "vertex form", "complete the square"],
    videos: [{"id": "2MKigAgPZMQ", "title": "Solving Quadratic Equations By Completing The Square", "channel": "The Organic Chemistry Tutor"}, {"id": "bNQY0z76M5A", "title": "Solving quadratic equations by completing the square | Algebra II | Khan Academy", "channel": "Khan Academy"}],
  },
  {
    slug: "linear-equations",
    name: "Solving linear equations",
    keywords: ["linear equation", "one variable", "isolate", "distributive property", "combine like terms", "inverse operations", "multi-step"],
    videos: [{"id": "Z7C69xP08d8", "title": "Ex 2: Multi-step equation | Linear equations | Algebra I | Khan Academy", "channel": "Khan Academy"}, {"id": "Z-ZkmpQBIFo", "title": "Algebra - How To Solve Equations Quickly!", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "systems-of-equations",
    name: "Systems of equations",
    keywords: ["system", "elimination", "substitution", "simultaneous"],
    videos: [{"id": "vA-55wZtLeE", "title": "Solving systems of equations by elimination | Algebra Basics | Khan Academy", "channel": "Khan Academy"}, {"id": "oKqtgz2eo-Y", "title": "Solving Systems of Equations By Elimination & Substitution With 2 Variables", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "exponent-rules",
    name: "Exponent rules",
    keywords: ["exponent", "power rule", "negative exponent", "rational exponent", "laws of exponents", "product of powers"],
    videos: [{"id": "kITJ6qH7jS0", "title": "Exponent rules part 1 | Exponents, radicals, and scientific notation | Pre-Algebra | Khan Academy", "channel": "Khan Academy"}, {"id": "kAOuvdxv7Wg", "title": "Exponent Rules - Formulas and Equations", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "simplifying-radicals",
    name: "Simplifying radicals",
    keywords: ["radical", "square root", "simplify root", "rationaliz", "nth root"],
    videos: [{"id": "cw3mp8oNASk", "title": "Simplifying square roots | Exponents, radicals, and scientific notation | Pre-Algebra | Khan Academy", "channel": "Khan Academy"}, {"id": "Llrngdh3Rrg", "title": "Simplifying Radicals With Variables, Exponents, Fractions, Cube Roots - Algebra", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "rational-expressions",
    name: "Simplifying rational expressions",
    keywords: ["rational expression", "simplify fraction", "algebraic fraction", "common denominator", "lcd"],
    videos: [{"id": "7Uos1ED3KHI", "title": "Simplifying rational expressions introduction | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "uVpsz-xpnPo", "title": "Simplifying Rational Expressions", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "rational-equations",
    name: "Solving rational equations",
    keywords: ["rational equation", "extraneous", "clearing denominators", "fractional equation"],
    videos: [{"id": "6eqgIZyXgK8", "title": "Solving Rational Equations", "channel": "Khan Academy"}, {"id": "1fR_9ke5-n8", "title": "Solving Rational Equations", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "logarithms-intro",
    name: "Introduction to logarithms",
    keywords: ["logarithm", "log ", "logs", "natural log", "ln", "logarithmic form", "exponential form", "convert", "domain of log"],
    videos: [{"id": "mQTWzLpCcW0", "title": "Introduction to Logarithms", "channel": "Khan Academy"}, {"id": "kqVpPSzkTYA", "title": "Logarithms - The Easy Way!", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "log-properties",
    name: "Properties of logarithms",
    keywords: ["log properties", "properties of log", "rule for log", "rules for log", "logarithm rule", "product rule for logarithm", "quotient rule", "power rule for log", "logarithmic properties", "product rule for log", "change of base", "condense", "expand log"],
    videos: [{"id": "PupNgv49_WY", "title": "Introduction to logarithm properties | Logarithms | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "Jtv9Lnf7Zw8", "title": "Properties of Logarithms", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "exponential-equations",
    name: "Solving exponential equations",
    keywords: ["exponential equation", "exponential growth", "exponential decay", "compound interest", "euler", "e^"],
    videos: [{"id": "R443Db-wJ5o", "title": "Solving exponential equation with logarithm | Logarithms | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "oVUJMVR1JpA", "title": "Solving Exponential Equations With Different Bases Using Logarithms - Algebra", "channel": "The Organic Chemistry Tutor"}, {"id": "m2MIpDrF7Es", "title": "What's so special about Euler's number e? | Chapter 5, Essence of calculus", "channel": "3Blue1Brown"}],
  },
  {
    slug: "complex-numbers",
    name: "Complex numbers",
    keywords: ["complex", "imaginary", "i^2"],
    videos: [{"id": "SP-YJe7Vldo", "title": "Introduction to complex numbers | Imaginary and complex numbers | Precalculus | Khan Academy", "channel": "Khan Academy"}, {"id": "OQz1ydBcQSA", "title": "Complex Numbers - Basic Operations", "channel": "The Organic Chemistry Tutor"}, {"id": "mvmuCPvRoWQ", "title": "Euler's formula with introductory group theory", "channel": "3Blue1Brown"}, {"id": "v0YEaeIClKY", "title": "e^(iπ) in 3.14 minutes, using dynamics | DE5", "channel": "3Blue1Brown"}],
  },
  {
    slug: "polynomial-division",
    name: "Polynomial long division",
    keywords: ["long division", "polynomial division", "divide polynomial", "remainder theorem"],
    videos: [{"id": "FXgV9ySNusc", "title": "Polynomial division | Polynomial and rational functions | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "_FSXJmESFmQ", "title": "Long Division With Polynomials - The Easy Way!", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "synthetic-division",
    name: "Synthetic division",
    keywords: ["synthetic division", "factor theorem", "remainder theorem"],
    videos: [{"id": "1byR9UEQJN0", "title": "Synthetic division | Polynomial and rational functions | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "FxHWoUOq2iQ", "title": "Synthetic Division of Polynomials", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "function-transformations",
    name: "Function transformations",
    keywords: ["transformation", "shift", "reflection", "stretch", "translate"],
    videos: [{"id": "RttvubuBhAE", "title": "Shifting functions introduction | Transformations of functions | Algebra 2 | Khan Academy", "channel": "Khan Academy"}, {"id": "Tmdrjs9xufc", "title": "Transformations of Functions | Precalculus", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "inverse-functions",
    name: "Inverse functions",
    keywords: ["inverse function", "inverse of", "f^{-1}", "one-to-one"],
    videos: [{"id": "W84lObmOp8M", "title": "Introduction to function inverses | Functions and their graphs | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "2zeYEx4eTdc", "title": "How To Find The Inverse of a Function", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "absolute-value",
    name: "Absolute value equations and inequalities",
    keywords: ["absolute value"],
    videos: [{"id": "u6zDpUL5RkU", "title": "Absolute value equations | Linear equations | Algebra I | Khan Academy", "channel": "Khan Academy"}, {"id": "_cHbhzQVd7Y", "title": "How To Solve Absolute Value Equations, Basic Introduction, Algebra", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "inequalities",
    name: "Linear and compound inequalities",
    keywords: ["inequalit", "compound inequality", "interval notation"],
    videos: [{"id": "A3xPhzs-KBI", "title": "Compound inequalities | Linear inequalities | Algebra I | Khan Academy", "channel": "Khan Academy"}, {"id": "msiceXvwriE", "title": "How To Solve Compound Inequalities", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "sequences",
    name: "Arithmetic and geometric sequences",
    keywords: ["sequence", "series", "arithmetic", "geometric", "nth term", "sigma"],
    videos: [{"id": "_cooC3yG_p0", "title": "Introduction to arithmetic sequences | Sequences, series and induction | Precalculus | Khan Academy", "channel": "Khan Academy"}, {"id": "XZJdyPkCxuE", "title": "Arithmetic Sequences and Arithmetic Series - Basic Introduction", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "conic-sections",
    name: "Conic sections",
    keywords: ["conic", "ellipse", "hyperbola", "parabola", "circle equation", "focus", "directrix"],
    videos: [{"id": "0A7RR0oy2ho", "title": "Introduction to conic sections | Conic sections | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "PLrgwD9TleU", "title": "Conic Sections - Circles, Ellipses, Parabolas, Hyperbola - How To Graph & Write In Standard Form", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "unit-circle",
    name: "Unit circle and trig values",
    keywords: ["unit circle", "trig values", "radian", "reference angle", "sine", "cosine", "trigonometr"],
    videos: [{"id": "1m9p9iubMLU", "title": "Introduction to the unit circle | Trigonometry | Khan Academy", "channel": "Khan Academy"}, {"id": "57VrEiEPD1I", "title": "The Unit Circle, Basic Introduction, Trigonometry", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "matrices",
    name: "Matrices",
    keywords: ["matrix", "matrices", "determinant"],
    videos: [{"id": "OMA2Mwo0aZg", "title": "Multiplying a matrix by a matrix | Matrices | Precalculus | Khan Academy", "channel": "Khan Academy"}, {"id": "vzt9c7iWPxs", "title": "Multiplying Matrices", "channel": "The Organic Chemistry Tutor"}, {"id": "XkY2DOUCWMU", "title": "Matrix multiplication as composition | Chapter 4, Essence of linear algebra", "channel": "3Blue1Brown"}],
  },
  {
    slug: "domain-range",
    name: "Domain and range",
    keywords: ["domain", "range"],
    videos: [{"id": "djT6-YamHaA", "title": "How To Find The Domain of a Function - Radicals, Fractions & Square Roots - Interval Notation", "channel": "The Organic Chemistry Tutor"}, {"id": "sXP7VhU1gYE", "title": "How to find the domain and the range of a function given its graph (example) | Khan Academy", "channel": "Khan Academy"}],
  },
  {
    slug: "function-composition",
    name: "Composition of functions",
    keywords: ["composition", "composite", "f(g(x))", "f of g"],
    videos: [{"id": "wUNWjd4bMmw", "title": "Introduction to function composition | Functions and their graphs | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "ZFPkQkURSxk", "title": "Composite Functions", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "piecewise-functions",
    name: "Piecewise functions",
    keywords: ["piecewise"],
    videos: [{"id": "Uzw9tsGq2Pw", "title": "Graphing Piecewise Functions - Precalculus", "channel": "The Organic Chemistry Tutor"}, {"id": "tedzsRH0Jas", "title": "Piecewise function formula from graph | Functions and their graphs | Algebra II | Khan Academy", "channel": "Khan Academy"}],
  },
  {
    slug: "rational-functions",
    name: "Graphing rational functions and asymptotes",
    keywords: ["asymptote", "rational function", "holes", "end behavior of rational"],
    videos: [{"id": "2N62v_63SBo", "title": "Asymptotes of rational functions | Polynomial and rational functions | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "XE-Z2-F3oWw", "title": "Graphing Rational Functions With Vertical, Horizontal & Slant Asymptotes, Holes, Domain & Range", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "binomial-theorem",
    name: "Binomial theorem",
    keywords: ["binomial", "pascal"],
    videos: [{"id": "iPwrDWQ7hPc", "title": "Binomial theorem | Polynomial and rational functions | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "s19dWIHficY", "title": "Binomial Theorem Expansion, Pascal's Triangle, Finding Terms & Coefficients, Combinations, Algebra 2", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "slope-linear-functions",
    name: "Slope and linear functions",
    keywords: ["slope", "linear function", "y = mx + b", "point-slope", "intercept"],
    videos: [{"id": "qXX47hS2KLw", "title": "Slope Intercept Form Y=mx+b | Algebra", "channel": "The Organic Chemistry Tutor"}, {"id": "IL3UCuXrUzE", "title": "Slope-intercept form | Algebra I | Khan Academy", "channel": "Khan Academy"}],
  },
  {
    slug: "polynomial-graphs",
    name: "Graphs of polynomials and end behavior",
    keywords: ["end behavior", "polynomial graph", "multiplicity", "degree", "zeros of polynomial", "turning point"],
    videos: [{"id": "tZKzaF28sOk", "title": "Polynomial end behavior | Polynomial and rational functions | Algebra II | Khan Academy", "channel": "Khan Academy"}, {"id": "a5x4lwnvHM0", "title": "How To Graph Polynomial Functions Using End Behavior, Multiplicity & Zeros", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "rational-root-theorem",
    name: "Rational root theorem and finding zeros",
    keywords: ["rational root", "rational zero", "possible zeros", "find all zeros", "descartes"],
    videos: [{"id": "Y9fwl_qocJc", "title": "Applying the rational root theorem | Precalculus | Khan Academy", "channel": "Khan Academy"}, {"id": "Iaq7z7reznM", "title": "Finding All Zeros of a Polynomial Function Using The Rational Zero Theorem", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "radical-equations",
    name: "Solving radical equations",
    keywords: ["radical equation", "square root equation", "extraneous"],
    videos: [{"id": "pFFoAGIEyJc", "title": "Solving radical equations | Exponent expressions and equations | Algebra I | Khan Academy", "channel": "Khan Academy"}, {"id": "0gicD4STzpg", "title": "Solving Radical Equations", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "trig-identities",
    name: "Trigonometric identities",
    keywords: ["identity", "identities", "pythagorean identity", "double angle", "sum and difference"],
    videos: [{"id": "OLzXqIqZZz0", "title": "Trigonometric Identities", "channel": "Khan Academy"}, {"id": "m1OitPmkydY", "title": "Trig Identities", "channel": "The Organic Chemistry Tutor"}],
  },
  {
    slug: "probability",
    name: "Probability and counting",
    keywords: ["probability", "permutation", "combination", "counting principle", "factorial"],
    videos: [{"id": "DROZVHObeko", "title": "Permutation formula | Probability and combinatorics | Probability and Statistics | Khan Academy", "channel": "Khan Academy"}, {"id": "XJnIdRXUi7A", "title": "Permutations and Combinations Tutorial", "channel": "The Organic Chemistry Tutor"}],
  },
];
