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
    isMath: { type: "boolean" },
    ...SOLUTION_PROPS,
    verification: {
      type: "object",
      properties: { verified: { type: "boolean" }, check: str, corrections: strArr },
      required: ["verified", "check", "corrections"],
    },
  },
  required: ["isMath", ...SOLUTION_REQUIRED, "verification"],
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
  isMath: boolean;
  verification: { verified: boolean; check: string; corrections: string[] };
}

export const TUTOR_SCHEMA = {
  type: "object",
  properties: {
    scope: { type: "string", enum: ["math", "off_topic", "distress"] },
    reply: str,
    chips: strArr,
    verdict: { type: "string", enum: ["correct", "incorrect", "partial", "none"] },
    skill: str,
  },
  required: ["scope", "reply", "chips", "verdict", "skill"],
} as const;

export const DRILL_SCHEMA = {
  type: "object",
  properties: {
    topic: str,
    problemLatex: str,
    steps: { type: "array", items: STEP_SCHEMA },
    mistakeIndex: { type: "integer" },
    trap: str,
    explanation: str,
    correctedLatex: str,
    correctAnswerLatex: str,
  },
  required: ["topic", "problemLatex", "steps", "mistakeIndex", "trap", "explanation", "correctedLatex", "correctAnswerLatex"],
} as const;

export const TEST_SCHEMA = {
  type: "object",
  properties: {
    title: str,
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          promptLatex: str,
          instructions: str,
          type: { type: "string", enum: ["multiple_choice", "free_response"] },
          choices: strArr,
          answer: str,
          answerLatex: str,
          points: { type: "integer" },
          solution: { type: "array", items: STEP_SCHEMA },
          skill: str,
        },
        required: ["promptLatex", "instructions", "type", "choices", "answer", "answerLatex", "points", "solution", "skill"],
      },
    },
  },
  required: ["title", "questions"],
} as const;
