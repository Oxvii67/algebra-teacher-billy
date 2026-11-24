/**
 * The Billy mark: a lowercase b drawn as a stem and a parabola bowl, with a squared exponent.
 * It doubles as y = x^2 turned on its side, the first curve every Algebra 2 student meets.
 */
export function Monogram({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} role="img" aria-label="Algebra Teacher Billy">
      <rect x="0.5" y="0.5" width="39" height="39" rx="10" fill="var(--text)" />
      <path d="M12 8v24" stroke="var(--bg)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M12 19.5c2.6-3.4 11.5-3.6 11.5 5.6 0 8.6-9 8.4-11.5 5.4" fill="none" stroke="var(--bg)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="30.5" cy="10.5" r="3.2" className="brand-dot" fill="var(--highlight)" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Monogram size={compact ? 28 : 30} className="shrink-0" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="font-display text-[17px] font-semibold tracking-[-0.03em]">Billy</span>
        {!compact && <span className="hidden text-[13px] font-medium text-muted xl:inline">Algebra Teacher</span>}
      </span>
    </span>
  );
}
