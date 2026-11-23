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

const METHOD = [
  ["Every step shown", "No skipped algebra. Each line says what changed and which rule made it legal."],
  ["Every answer checked", "Billy substitutes the answer back into the original problem before you see it."],
  ["The gap named", "You get the prerequisite skill to fix first, with the lesson that teaches it."],
] as const;

function Intro() {
  return (
    <>
      <p className="text-sm font-semibold text-muted">Pre-algebra through AP Calculus BC and AP Statistics</p>
      <h1 className="mt-4 font-display text-[clamp(2.25rem,1.6rem+2.4vw,3.5rem)] font-bold leading-[1.04] tracking-[-0.03em]">
        A math teacher who shows every step and checks every answer.
      </h1>
      <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed text-muted">
        Send Billy one problem from any course. He works it line by line, proves the answer by plugging it back in, and tells you which skill to fix first.
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

      <section aria-labelledby="method-title" className="grid gap-8 border-t border-text pt-6 md:grid-cols-12">
        <h2 id="method-title" className="font-display text-2xl font-bold tracking-[-0.03em] md:col-span-4">
          How Billy teaches
        </h2>
        <dl className="grid gap-8 sm:grid-cols-3 md:col-span-8">
          {METHOD.map(([title, body]) => (
            <div key={title}>
              <dt className="text-lg font-semibold tracking-[-0.01em]">{title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <HomeProgress />

      <section aria-labelledby="tools-title" className="grid gap-8 border-t border-text pt-6 md:grid-cols-12">
        <div className="md:col-span-4">
          <h2 id="tools-title" className="font-display text-2xl font-bold tracking-[-0.03em]">
            The toolkit
          </h2>
          <p className="mt-2 max-w-xs text-sm text-muted">Pick up exactly where you are stuck.</p>
        </div>
        <ul className="grid gap-x-8 sm:grid-cols-2 md:col-span-8">
          {tools.map((n) => {
            const Icon = n.icon;
            return (
              <li key={n.href} className="border-t border-line">
                <Link href={n.href} className="group flex gap-3 py-4">
                  <Icon className="mt-1 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
                  <span>
                    <span className="block font-semibold tracking-[-0.01em] transition-colors group-hover:text-accent">{n.label}</span>
                    <span className="mt-0.5 block text-sm text-muted">{INDEX[n.href]}</span>
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
