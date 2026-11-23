/**
 * The Billy monogram: a heavy expanded B set on a graph-paper tile with a squared exponent,
 * a nod to the first thing every Algebra 2 student learns to respect: b^2.
 */
export function Monogram({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} role="img" aria-label="Algebra Teacher Billy">
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9" fill="var(--accent)" />
      <path d="M10 1v38M20 1v38M30 1v38M1 10h38M1 20h38M1 30h38" stroke="var(--accent-fg)" strokeOpacity="0.14" strokeWidth="1" />
      <text
        x="7.5"
        y="31"
        fill="var(--accent-fg)"
        style={{ font: "900 27px var(--font-head)", fontStretch: "125%" }}
      >
        B
      </text>
      <text x="28" y="15" fill="var(--accent-fg)" style={{ font: "800 11px var(--font-head)" }}>
        2
      </text>
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Monogram size={compact ? 30 : 34} className="shrink-0" />
      <span className="leading-none">
        <span className="block font-display text-[11px] font-semibold text-muted" style={{ fontStretch: "100%" }}>
          Algebra Teacher
        </span>
        <span className="block font-display text-[19px] font-black tracking-tight" style={{ fontStretch: "125%" }}>
          Billy
        </span>
      </span>
    </span>
  );
}
