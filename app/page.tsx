import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EquationSandbox } from "@/components/home/EquationSandbox";
import { HomeProgress } from "@/components/home/HomeProgress";
import { NAV } from "@/lib/nav";

const INDEX: Record<string, string> = {
  "/studio": "Photograph it, draw it, or type it. Every line explained, every answer substituted back in.",
  "/tutor": "Billy asks the questions. Guess wrong and he shows you exactly where it breaks.",
  "/practice-test": "Up to ten homework problems become a graded test, at your level or harder.",
  "/calculator": "Sliders, roots, extrema, intersections, and a value table.",
  "/drill": "Sixty seconds. One wrong step. Find it.",
  "/videos": "The lesson for the exact skill you are missing.",
  "/cheat-sheet": "One printable page of formulas to know cold.",
  "/history": "Every solved problem, filed in your folders.",
};

const PROMISES = [
  ["01", "Every step shown", "No skipped algebra. Each line says what changed and why."],
  ["02", "Every answer checked", "Solutions are substituted back in before you see them."],
  ["03", "The gap named", "You get the prerequisite skill to fix, with the lesson for it."],
] as const;

export default function Home() {
  const tools = NAV.filter((n) => INDEX[n.href]);
  return (
    <div className="space-y-20 md:space-y-28">
      <section className="space-y-10 md:space-y-12">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p className="eyebrow">Algebra 1 / Algebra 2 / Precalculus / AP</p>
            <h1 className="mt-4 font-display text-[clamp(2.6rem,1.6rem+4.4vw,5rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
              Every step shown.
              <br />
              <span className="text-muted">Every answer checked.</span>
            </h1>
          </div>
          <div className="md:col-span-4">
            <p className="max-w-sm text-[1.02rem] leading-relaxed">
              Billy is a strict, patient algebra teacher. Send one problem: he works it line by line, proves the answer, and tells you which skill to fix first.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/studio" className="btn-primary px-5 py-3 text-[15px]">
                Solve your problem
              </Link>
              <Link href="/tutor" className="btn-ghost px-5 py-3 text-[15px]">
                Ask Billy
              </Link>
            </div>
          </div>
        </div>

        <EquationSandbox />
      </section>

      <section aria-labelledby="promise-title" className="grid gap-8 border-t border-text pt-6 md:grid-cols-12">
        <h2 id="promise-title" className="font-display text-2xl font-semibold tracking-[-0.03em] md:col-span-4">
          How Billy teaches
        </h2>
        <ol className="grid gap-8 sm:grid-cols-3 md:col-span-8">
          {PROMISES.map(([n, title, body]) => (
            <li key={n}>
              <span className="num text-sm text-highlight">{n}</span>
              <h3 className="mt-2 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <HomeProgress />

      <section aria-labelledby="tools-title" className="grid gap-8 border-t border-text pt-6 md:grid-cols-12">
        <div className="md:col-span-4">
          <h2 id="tools-title" className="font-display text-2xl font-semibold tracking-[-0.03em]">
            The toolkit
          </h2>
          <p className="mt-2 max-w-xs text-sm text-muted">Pick up exactly where you are stuck.</p>
        </div>
        <ul className="md:col-span-8">
          {tools.map((n, i) => (
            <li key={n.href} className="border-b border-line first:border-t">
              <Link href={n.href} className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-4 transition-colors">
                <span className="num text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block text-[1.05rem] font-semibold tracking-[-0.01em] transition-colors group-hover:text-accent">{n.label}</span>
                  <span className="mt-0.5 block text-sm text-muted">{INDEX[n.href]}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 self-center text-muted transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
