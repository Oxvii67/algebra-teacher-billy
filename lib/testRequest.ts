const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
export const MAX_QUESTIONS = 10;

/** How many questions a student asked for ("give me 8 hard questions"), or null if they did not say. Capped at 10. */
export function requestedCount(request: string): number | null {
  const re =
    /(?<!(?:algebra|calculus|calc|geometry|math|chapter|unit|section|lesson|module|grade|level|part)\s)\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)(?!\s*-?\s*(?:steps?|variables?|digits?|points?|parts?|sided)\b)[\s-]+(?:[a-z]+[\s-]+){0,3}?(?:questions?|problems?)\b/gi;
  const m = re.exec(request);
  if (!m) return null;
  const n = WORDS[m[1].toLowerCase()] ?? Number(m[1]);
  return n >= 1 ? Math.min(MAX_QUESTIONS, n) : null;
}
