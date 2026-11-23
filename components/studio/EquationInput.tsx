"use client";

import { useRef, useState } from "react";
import { Delete } from "lucide-react";
import { MathBlock, MathInline } from "@/components/math/Math";

interface Key {
  /** LaTeX shown on the key. */
  show: string;
  /** Template inserted. The @ marks where the cursor lands. */
  ins: string;
  title: string;
}

const GROUPS: { name: string; keys: Key[] }[] = [
  {
    name: "Basics",
    keys: [
      { show: "\\frac{a}{b}", ins: "\\frac{@}{}", title: "Fraction" },
      { show: "x^{n}", ins: "^{@}", title: "Exponent" },
      { show: "x_{n}", ins: "_{@}", title: "Subscript" },
      { show: "\\sqrt{x}", ins: "\\sqrt{@}", title: "Square root" },
      { show: "\\sqrt[n]{x}", ins: "\\sqrt[@]{}", title: "nth root" },
      { show: "\\left| x \\right|", ins: "\\left| @ \\right|", title: "Absolute value" },
      { show: "( \\, )", ins: "\\left(@\\right)", title: "Parentheses" },
      { show: "\\times", ins: "\\times ", title: "Times" },
      { show: "\\div", ins: "\\div ", title: "Divide" },
      { show: "\\pm", ins: "\\pm ", title: "Plus or minus" },
      { show: "\\cdot", ins: "\\cdot ", title: "Dot" },
      { show: "\\pi", ins: "\\pi ", title: "Pi" },
    ],
  },
  {
    name: "Relations",
    keys: [
      { show: "=", ins: "=", title: "Equals" },
      { show: "\\ne", ins: "\\ne ", title: "Not equal" },
      { show: "<", ins: "<", title: "Less than" },
      { show: ">", ins: ">", title: "Greater than" },
      { show: "\\le", ins: "\\le ", title: "Less or equal" },
      { show: "\\ge", ins: "\\ge ", title: "Greater or equal" },
      { show: "\\approx", ins: "\\approx ", title: "Approximately" },
      { show: "\\infty", ins: "\\infty ", title: "Infinity" },
      { show: "\\in", ins: "\\in ", title: "Element of" },
      { show: "\\mathbb{R}", ins: "\\mathbb{R}", title: "Real numbers" },
      { show: "\\cup", ins: "\\cup ", title: "Union" },
      { show: "\\{ \\}", ins: "\\{@\\}", title: "Set braces" },
    ],
  },
  {
    name: "Functions",
    keys: [
      { show: "f(x)", ins: "f(x)", title: "f of x" },
      { show: "f^{-1}", ins: "f^{-1}(@)", title: "Inverse" },
      { show: "\\log", ins: "\\log(@)", title: "Log" },
      { show: "\\log_{b}", ins: "\\log_{@}()", title: "Log base b" },
      { show: "\\ln", ins: "\\ln(@)", title: "Natural log" },
      { show: "e^{x}", ins: "e^{@}", title: "e to the x" },
      { show: "\\sin", ins: "\\sin(@)", title: "Sine" },
      { show: "\\cos", ins: "\\cos(@)", title: "Cosine" },
      { show: "\\tan", ins: "\\tan(@)", title: "Tangent" },
      { show: "\\theta", ins: "\\theta ", title: "Theta" },
      { show: "i", ins: "i", title: "Imaginary unit" },
      { show: "n!", ins: "!", title: "Factorial" },
    ],
  },
  {
    name: "AP",
    keys: [
      { show: "\\sum", ins: "\\sum_{n=@}^{}", title: "Summation" },
      { show: "\\lim", ins: "\\lim_{x \\to @}", title: "Limit" },
      { show: "\\int", ins: "\\int_{@}^{} \\, dx", title: "Integral" },
      { show: "\\frac{d}{dx}", ins: "\\frac{d}{dx}\\left(@\\right)", title: "Derivative" },
      { show: "\\binom{n}{k}", ins: "\\binom{@}{}", title: "Binomial" },
      { show: "\\begin{cases}..\\end{cases}", ins: "\\begin{cases} @ \\\\  \\end{cases}", title: "System or piecewise" },
      { show: "\\vec{v}", ins: "\\vec{@}", title: "Vector" },
      { show: "\\overline{x}", ins: "\\overline{@}", title: "Bar" },
      { show: "\\Delta", ins: "\\Delta ", title: "Delta" },
      { show: "\\alpha", ins: "\\alpha ", title: "Alpha" },
      { show: "\\beta", ins: "\\beta ", title: "Beta" },
      { show: "\\to", ins: "\\to ", title: "Arrow" },
    ],
  },
];

const EXAMPLES = ["2x^2 - 7x + 3 = 0", "\\log_{2}(x+3) + \\log_{2}(x-3) = 4", "\\frac{x+2}{x-1} \\le 3", "\\begin{cases} 2x + y = 7 \\\\ x - 3y = 7 \\end{cases}"];

export function EquationInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [group, setGroup] = useState(0);

  const insert = (tpl: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const cursorAt = tpl.indexOf("@");
    const clean = tpl.replace("@", selected);
    const next = value.slice(0, start) + clean + value.slice(end);
    onChange(next);
    const pos = start + (cursorAt >= 0 ? cursorAt + selected.length : clean.length);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const backspace = () => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    if (start === end && start === 0) return;
    const from = start === end ? start - 1 : start;
    onChange(value.slice(0, from) + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(from, from);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="eq" className="label">
          Type the problem
        </label>
        <textarea
          id="eq"
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit?.();
          }}
          rows={3}
          spellCheck={false}
          placeholder="Example: x^2 - 5x + 6 = 0, or use the keypad below"
          className="input mt-1.5 font-mono"
        />
      </div>

      <div className="rounded-lg border border-line bg-surface-2 p-3">
        <div className="label mb-1">Preview</div>
        <div className="min-h-12">
          {value.trim() ? <MathBlock latex={value} /> : <p className="py-3 text-sm text-muted">Your problem appears here exactly as the teacher will read it.</p>}
        </div>
      </div>

      <div className="card p-3">
        <div className="tab-track mb-3 grid w-full grid-cols-4">
          {GROUPS.map((g, i) => (
            <button key={g.name} type="button" onClick={() => setGroup(i)} className={`tab justify-center px-2 ${group === i ? "tab-active" : ""}`}>
              {g.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-7">
          {GROUPS[group].keys.map((k) => (
            <button
              key={k.title}
              type="button"
              title={k.title}
              aria-label={k.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(k.ins)}
              className="flex h-11 items-center justify-center overflow-hidden rounded-md border border-line bg-surface text-sm hover:border-accent hover:bg-surface-2"
            >
              <MathInline latex={k.show} />
            </button>
          ))}
          <button
            type="button"
            title="Backspace"
            aria-label="Backspace"
            onMouseDown={(e) => e.preventDefault()}
            onClick={backspace}
            className="flex h-11 items-center justify-center rounded-md border border-line bg-surface hover:border-accent"
          >
            <Delete className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Try:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => onChange(ex)} className="rounded-md border border-line px-2 py-1 hover:bg-surface-2">
            <MathInline latex={ex} />
          </button>
        ))}
      </div>
    </div>
  );
}
