import Link from "next/link";
import { EquationSandbox } from "@/components/home/EquationSandbox";
import { HomeProgress } from "@/components/home/HomeProgress";
import { ProblemBox } from "@/components/home/ProblemBox";
import { MathInline } from "@/components/math/Math";

function Tile({ href, title, body, className = "", children }: { href: string; title: string; body: string; className?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className={`card card-link group flex flex-col justify-between gap-6 p-6 ${className}`}>
      {children && <div className="min-h-0">{children}</div>}
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.015em]">{title}</h3>
        <p className="mt-1 max-w-[42ch] text-[15px] leading-relaxed text-muted">{body}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="space-y-24 md:space-y-32">
      <section className="grid items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="min-w-0 lg:sticky lg:top-24 lg:pt-6">
          <h1 className="font-display text-[clamp(2.3rem,1.7rem+2.3vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.035em]">
            Step-by-step math help, Algebra 1 to AP Calculus
          </h1>
          <p className="mt-5 max-w-[30rem] text-[1.0625rem] leading-relaxed text-muted">
            Billy writes out every line, plugs the answer back in to check it, and tells you which skill to review. Free, no account needed.
          </p>
          <div className="mt-8 max-w-[34rem]">
            <ProblemBox />
          </div>
        </div>

        <EquationSandbox />
      </section>

      <HomeProgress />

      <section aria-labelledby="tools-title">
        <h2 id="tools-title" className="font-display text-[clamp(1.6rem,1.3rem+1vw,2.1rem)] font-bold tracking-[-0.03em]">
          Practice, graphs and lessons
        </h2>
        <div className="mt-8 grid gap-3 md:grid-cols-6">
          <Tile
            href="/practice-test"
            title="Practice tests from your homework"
            body="Paste up to ten problems. Billy writes a graded test on the same skills."
            className="md:col-span-3"
          >
            <div className="rounded-[12px] border border-line bg-bg p-4 text-[15px]">
              <div className="flex items-baseline gap-3">
                <span className="num text-[13px] text-muted">3.</span>
                <MathInline latex="x^2 - 7x + 12 = 0" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {["x = 3, 4", "x = -3, -4", "x = 2, 6", "x = 1, 12"].map((c, i) => (
                  <span key={c} className={`rounded-[8px] border px-3 py-1.5 ${i === 0 ? "border-success/60 text-success" : "border-line text-muted"}`}>
                    <MathInline latex={c} />
                  </span>
                ))}
              </div>
            </div>
          </Tile>
          <Tile href="/tutor" title="Ask Billy" body="Billy answers with a question, so you find the next step yourself." className="md:col-span-3">
            <div className="space-y-2 text-[15px]">
              <p className="ml-auto w-fit max-w-[85%] rounded-[12px] rounded-br-[4px] bg-surface-2 px-3.5 py-2">
                Is it <MathInline latex="x = 5" />?
              </p>
              <p className="w-fit max-w-[85%] rounded-[12px] rounded-bl-[4px] border border-line px-3.5 py-2">
                Plug it in. What is <MathInline latex="2(5) + 3" />?
              </p>
            </div>
          </Tile>
          <Tile href="/calculator" title="Graphing calculator" body="Sliders for every constant. Roots and turning points marked." className="md:col-span-2">
            <svg viewBox="0 0 200 80" className="h-20 w-full" aria-hidden="true">
              <line x1="0" x2="200" y1="50" y2="50" stroke="var(--border)" />
              <line x1="100" x2="100" y1="0" y2="80" stroke="var(--border)" />
              <path d="M30 4 Q100 140 170 4" fill="none" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="60" cy="50" r="3.5" fill="var(--text)" />
              <circle cx="140" cy="50" r="3.5" fill="var(--text)" />
            </svg>
          </Tile>
          <Tile href="/drill" title="Spot the mistake" body="One worked problem, one wrong line. Find it in 60 seconds." className="md:col-span-2">
            <div className="space-y-1.5 text-[15px]">
              <div className="flex items-baseline gap-3">
                <span className="num w-4 text-[13px] text-muted">1</span>
                <MathInline latex="3(x - 4) = 6" />
              </div>
              <div className="flex items-baseline gap-3 rounded-[8px] bg-danger/10 py-0.5">
                <span className="num w-4 text-[13px] text-danger">2</span>
                <span className="text-danger line-through decoration-danger/60">
                  <MathInline latex="3x - 4 = 6" />
                </span>
              </div>
              <div className="flex items-baseline gap-3 text-muted">
                <span className="num w-4 text-[13px]">3</span>
                <MathInline latex="3x = 10" />
              </div>
            </div>
          </Tile>
          <Tile href="/videos" title="Lesson videos" body="The lesson for the skill you are missing, across 72 topics." className="md:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {["Factoring trinomials", "Chain rule", "Unit circle", "Logarithms"].map((t) => (
                <span key={t} className="pill text-muted">
                  {t}
                </span>
              ))}
            </div>
          </Tile>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/cheat-sheet" className="hover:text-text">
            Printable formula sheet
          </Link>
          <Link href="/binder" className="hover:text-text">
            Your saved problems
          </Link>
        </div>
      </section>
    </div>
  );
}
