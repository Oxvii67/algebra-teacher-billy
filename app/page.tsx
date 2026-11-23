import Link from "next/link";
import { EquationSandbox } from "@/components/home/EquationSandbox";
import { HomeProgress } from "@/components/home/HomeProgress";
import { NAV } from "@/lib/nav";

const INDEX: Record<string, string> = {
  "/studio": "Photograph it, draw it, or type it. Every line explained, every answer substituted back in.",
  "/tutor": "Billy asks the questions. Guess wrong and he shows you exactly where it breaks.",
  "/practice-test": "Up to ten homework problems become a graded test, at your level or harder.",
  "/calculator": "Expressions on the left, the plane on the right. Sliders, roots, extrema, intersections.",
  "/drill": "Sixty seconds. One wrong step. Find it.",
  "/videos": "The lesson for the exact skill you are missing, from Algebra 1 to AP Calculus.",
  "/cheat-sheet": "One printable page of formulas to know cold.",
  "/binder": "Every solved problem and test, filed in your folders.",
};

const CHIP: Record<string, string> = {
  "/studio": "#5b4cf5",
  "/tutor": "#0ea5e9",
  "/practice-test": "#ff7a45",
  "/calculator": "#10b981",
  "/drill": "#e83e8c",
  "/videos": "#f59e0b",
  "/cheat-sheet": "#8b5cf6",
  "/binder": "#14b8a6",
};

const METHOD = [
  ["Every step shown", "No skipped algebra. Each line says what changed and which rule made it legal."],
  ["Every answer checked", "Billy substitutes the answer back into the original problem before you see it."],
  ["The gap named", "You get the prerequisite skill to fix first, with the lesson that teaches it."],
] as const;

function Intro() {
  return (
    <>
      <p className="pill w-fit border-transparent bg-accent/10 font-semibold text-accent">Free for every student, pre-algebra to AP Calc</p>
      <h1 className="mt-4 font-display text-[clamp(2.25rem,1.6rem+2.4vw,3.5rem)] font-bold leading-[1.04] tracking-[-0.03em]">
        Stuck on a problem? Billy walks you through every step.
      </h1>
      <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed text-muted">
        Snap a photo, sketch it, or type it in. Billy works it line by line, double-checks the answer, and points you to the one skill worth practicing next.
      </p>
      <div className="mt-7 flex flex-wrap gap-2">
        <Link href="/studio" className="btn-primary px-5 py-3 text-[15px]">
          Solve your problem
        </Link>
        <Link href="/practice-test" className="btn-ghost px-5 py-3 text-[15px]">
          Build a practice test
        </Link>
      </div>
    </>
  );
}

export default function Home() {
  const tools = NAV.filter((n) => INDEX[n.href]);
  return (
    <div className="space-y-24 md:space-y-32">
      <EquationSandbox intro={<Intro />} />

      <section aria-labelledby="method-title">
        <h2 id="method-title" className="text-center font-display text-3xl font-bold tracking-[-0.03em]">
          How Billy teaches
        </h2>
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          {METHOD.map(([title, body], i) => (
            <div key={title} className="card p-6">
              <span className="chip-icon num text-base font-bold" style={{ ["--chip" as string]: ["#5b4cf5", "#10b981", "#ff7a45"][i] }}>
                {i + 1}
              </span>
              <dt className="mt-4 text-lg font-semibold tracking-[-0.01em]">{title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <HomeProgress />

      <section aria-labelledby="tools-title">
        <div className="text-center">
          <h2 id="tools-title" className="font-display text-3xl font-bold tracking-[-0.03em]">
            Everything in one backpack
          </h2>
          <p className="mt-2 text-muted">Jump in wherever you are stuck.</p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((n) => {
            const Icon = n.icon;
            return (
              <li key={n.href}>
                <Link href={n.href} className="card card-link group flex h-full flex-col gap-3 p-5">
                  <span className="chip-icon" style={{ ["--chip" as string]: CHIP[n.href] }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold tracking-[-0.01em] transition-colors group-hover:text-accent">{n.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted">{INDEX[n.href]}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
