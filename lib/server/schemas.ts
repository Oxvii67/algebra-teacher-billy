const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;

export const STEP_SCHEMA = {
  type: "object",
  properties: { explanation: str, latex: str },
  required: ["explanation", "latex"],
} as const;

const SOLUTION_PROPS = {
  problemLatex: str,
  problemSummary: str,
  topic: str,
  skills: strArr,
  prerequisites: {
    type: "array",
    items: {
      type: "object",
      properties: { skill: str, why: str, example: str, videoQuery: str },
      required: ["skill", "why", "example", "videoQuery"],
    },
  },
  steps: { type: "array", items: STEP_SCHEMA },
  finalAnswerLatex: str,
  finalAnswerPlain: str,
  simplerMethod: {
    type: "object",
    properties: { title: str, steps: { type: "array", items: STEP_SCHEMA } },
    required: ["title", "steps"],
  },
  commonMistakes: strArr,
  graphExpressions: strArr,
  numericCheck: {
    type: "object",
    properties: { variable: str, expression: str, solutions: strArr },
    required: ["variable", "expression", "solutions"],
  },
} as const;

const SOLUTION_REQUIRED = Object.keys(SOLUTION_PROPS);

export const SOLVE_SCHEMA = {
  type: "object",
  properties: SOLUTION_PROPS,
  required: SOLUTION_REQUIRED,
} as const;

export const VERIFIED_SCHEMA = {
  type: "object",
  properties: {
    ...SOLUTION_PROPS,
    verification: {
      type: "object",
      properties: { verified: { type: "boolean" }, check: str, corrections: strArr },
      required: ["verified", "check", "corrections"],
    },
  },
  required: [...SOLUTION_REQUIRED, "verification"],
} as const;

export const CHALLENGE_SCHEMA = {
  type: "object",
  properties: { problemLatex: str, whyHarder: str, hint: str, answerLatex: str },
  required: ["problemLatex", "whyHarder", "hint", "answerLatex"],
} as const;

export interface DraftSolution {
  problemLatex: string;
  problemSummary: string;
  topic: string;
  skills: string[];
  prerequisites: { skill: string; why: string; example: string; videoQuery: string }[];
  steps: { explanation: string; latex: string }[];
  finalAnswerLatex: string;
  finalAnswerPlain: string;
  simplerMethod: { title: string; steps: { explanation: string; latex: string }[] };
  commonMistakes: string[];
  graphExpressions: string[];
  numericCheck: { variable: string; expression: string; solutions: string[] };
}

export interface VerifiedDraft extends DraftSolution {
  verification: { verified: boolean; check: string; corrections: string[] };
}
