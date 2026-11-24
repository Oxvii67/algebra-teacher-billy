/** Short spoken form of simple LaTeX, for naming buttons whose only content is math. */
export function mathSpeech(latex: string): string {
  let s = latex.replace(/\$/g, "");
  for (let i = 0; i < 3; i++) s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1) over ($2)").replace(/\\sqrt\{([^{}]*)\}/g, "square root of ($1)");
  return s
    .replace(/\\log_\{?(\w+)\}?/g, "log base $1 of ")
    .replace(/\^\{?2\}?(?!\d)/g, " squared")
    .replace(/\^\{?3\}?(?!\d)/g, " cubed")
    .replace(/\^\{([^{}]*)\}|\^(\w)/g, " to the power $1$2")
    .replace(/\\pm/g, " plus or minus ")
    .replace(/\\leq?(?![a-z])/g, " is at most ")
    .replace(/\\geq?(?![a-z])/g, " is at least ")
    .replace(/\\(?:cdot|times)/g, " times ")
    .replace(/\\(?:left|right|,|;|!|text|mathrm)/g, "")
    .replace(/\\([a-zA-Z]+)/g, " $1 ")
    .replace(/\|([^|]+)\|/g, "absolute value of $1")
    .replace(/=/g, " equals ")
    .replace(/-/g, " minus ")
    .replace(/\+/g, " plus ")
    .replace(/[{}\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
