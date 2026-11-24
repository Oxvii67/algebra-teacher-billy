export interface Prerequisite {
  skill: string;
  why: string;
  /** Short worked micro-example of the foundational skill, prose with $math$. */
  example: string;
  videoQuery: string;
  videoId?: string | null;
  videoTitle?: string | null;
}

export interface SolutionStep {
  /** What the teacher is doing and why, prose with $math$. */
  explanation: string;
  /** The algebra produced by this step, LaTeX without delimiters. */
  latex: string;
}

export interface Verification {
  verified: boolean;
  /** How the answer was checked (substitution, graph, re-derivation), prose with $math$. */
  check: string;
  /** Corrections the verifier made, if any. */
  corrections: string[];
}

export interface SolveResult {
  problemLatex: string;
  problemSummary: string;
  topic: string;
  skills: string[];
  prerequisites: Prerequisite[];
  steps: SolutionStep[];
  finalAnswerLatex: string;
  finalAnswerPlain: string;
  verification: Verification;
  simplerMethod: { title: string; steps: SolutionStep[] } | null;
  commonMistakes: string[];
  /** mathjs-compatible expressions in x for the graphing calculator, e.g. "x^2 - 5x + 6". */
  graphExpressions: string[];
}

export interface ChallengeResult {
  problemLatex: string;
  whyHarder: string;
  hint: string;
  answerLatex: string;
}

export type SolveInput =
  | { kind: "image"; dataUrl: string; note?: string }
  | { kind: "text"; latex: string; note?: string };

export interface Folder {
  id: string;
  name: string;
  created_at: string;
}

export interface SavedSolution {
  id: string;
  folder_id: string | null;
  title: string;
  problem_latex: string;
  topic: string;
  result: SolveResult;
  created_at: string;
}

export type TestLevel = "same" | "hard" | "ap";

export interface TestCurve {
  /** mathjs expression in x, or x = c for a vertical line. */
  expression: string;
  /** LaTeX name shown when there is more than one curve, such as f(x). */
  label: string;
  /** Piece of the domain that is drawn; null is unbounded. */
  from: number | null;
  to: number | null;
}

/** A figure the student reads to answer a question. */
export interface TestGraph {
  curves: TestCurve[];
  points: { x: number; y: number; open: boolean }[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface TestQuestion {
  id: string;
  promptLatex: string;
  /** Prose framing of the question with $math$. */
  instructions: string;
  type: "multiple_choice" | "free_response";
  choices: string[];
  /** For MC: index of correct choice as string. For FR: canonical answer in mathjs/plain syntax. */
  answer: string;
  answerLatex: string;
  points: number;
  solution: SolutionStep[];
  skill: string;
  graph?: TestGraph;
  /** When the answer choices are graphs, one per choice. */
  choiceGraphs?: TestGraph[];
  /** Billy's second look at a typed answer. Applies only while the response is unchanged. */
  review?: AnswerReview;
}

export interface AnswerReview {
  response: string;
  correct: boolean;
  /** How Billy read what the student typed, LaTeX without delimiters. */
  readAsLatex: string;
  note: string;
}

export interface PracticeTest {
  id: string;
  title: string;
  level: TestLevel;
  questions: TestQuestion[];
  responses: Record<string, string>;
  score: number | null;
  max_score: number;
  created_at: string;
}

export interface Profile {
  xp: number;
  level: number;
  streak_days: number;
  last_active_date: string | null;
  skill_mastery: Record<string, number>;
  display_name?: string | null;
}

export const EMPTY_PROFILE: Profile = {
  xp: 0,
  level: 1,
  streak_days: 0,
  last_active_date: null,
  skill_mastery: {},
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorReply {
  reply: string;
  chips: string[];
  verdict: "correct" | "incorrect" | "partial" | "none";
  skill: string;
}

export interface Drill {
  topic: string;
  problemLatex: string;
  steps: SolutionStep[];
  mistakeIndex: number;
  trap: string;
  explanation: string;
  correctedLatex: string;
  correctAnswerLatex: string;
}
