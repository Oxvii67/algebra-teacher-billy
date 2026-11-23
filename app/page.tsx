import Link from "next/link";
import { NAV } from "@/lib/nav";
import { MathBlock } from "@/components/math/Math";

const BLURBS: Record<string, string> = {
  "/studio": "Photograph, draw, or type a problem. Get a verified, step-by-step solution.",
  "/tutor": "A Socratic teacher who makes you do the thinking and pushes back on guesses.",
  "/drill": "Sixty seconds. One wrong step. Find it.",
  "/practice-test": "Turn up to ten problems into a graded test at your level or harder.",
  "/calculator": "Graph anything. Sliders, roots, extrema, intersections, tables.",
  "/videos": "Find the right lesson video for the exact skill you are missing.",
  "/cheat-sheet": "One printable page of the formulas you are expected to know cold.",
  "/history": "Every solved problem, organized in your own folders.",
};

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="card overflow-hidden p-6 md:p-8">
        <p className="label">Algebra 2 and AP Precalculus</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">Show every step. Check every answer.</h1>
        <p className="mt-3 max-w-2xl text-muted">
          This is not an answer machine. Every solution is worked line by line, verified by substitution, and tied back
          to the skills it depends on.
        </p>
        <MathBlock className="mt-4" latex="x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}" />
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/studio" className="btn-primary">
            Solve a problem
          </Link>
          <Link href="/tutor" className="btn-ghost">
            Talk to the teacher
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NAV.filter((n) => BLURBS[n.href]).map((n) => {
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} className="card group p-4 transition-colors hover:border-accent">
              <Icon className="h-5 w-5 text-accent" />
              <h2 className="mt-3 font-semibold">{n.label}</h2>
              <p className="mt-1 text-sm text-muted">{BLURBS[n.href]}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
