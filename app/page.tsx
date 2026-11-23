import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { HomeProgress } from "@/components/home/HomeProgress";
import { NAV } from "@/lib/nav";

const PRIMARY: Record<string, string> = {
  "/studio": "Photograph it, draw it, or type it. Every line explained, every answer checked by substitution.",
  "/tutor": "Billy asks the questions. Guess wrong and he tells you exactly where it breaks.",
};

const SECONDARY: Record<string, string> = {
  "/drill": "Sixty seconds. One wrong step. Find it.",
  "/practice-test": "Up to ten homework problems become a graded test.",
  "/calculator": "Sliders, roots, extrema, intersections, tables.",
  "/videos": "The lesson for the exact skill you are missing.",
  "/cheat-sheet": "One printable page of formulas to know cold.",
  "/history": "Every solved problem, filed in your folders.",
};

export default function Home() {
  const primary = NAV.filter((n) => PRIMARY[n.href]);
  const secondary = NAV.filter((n) => SECONDARY[n.href]);
  return (
    <div className="space-y-12 md:space-y-16">
      <Hero />

      <HomeProgress />

      <section aria-labelledby="tools-title" className="space-y-4">
        <h2 id="tools-title" className="display-tight text-xl font-extrabold">
          Pick up where you are stuck
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {primary.map((n) => {
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} className="card card-link flex gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-lg font-bold">{n.label}</span>
                  <span className="mt-1 block text-sm text-muted">{PRIMARY[n.href]}</span>
                </span>
              </Link>
            );
          })}
        </div>
        <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {secondary.map((n) => {
            const Icon = n.icon;
            return (
              <li key={n.href} className="border-b border-line">
                <Link href={n.href} className="group flex items-start gap-3 rounded-lg px-1 py-3.5 transition-colors hover:bg-surface-2/60">
                  <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent" />
                  <span>
                    <span className="block font-bold group-hover:underline group-hover:underline-offset-2">{n.label}</span>
                    <span className="block text-sm text-muted">{SECONDARY[n.href]}</span>
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
