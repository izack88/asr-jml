/**
 * The brand orb — a soft gradient sphere wrapped by a stylized soundwave.
 * Used at sidebar scale (sm) and as the centered hero logo (lg).
 */
export function BrandOrb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <defs>
        <linearGradient id="orbg" x1="8" y1="6" x2="40" y2="42">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="11" fill="url(#orbg)" />
      <g
        stroke="url(#orbg)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.9"
      >
        <path d="M24 4a20 20 0 0 1 0 40" fill="none" opacity="0.5" />
        <path d="M24 44A20 20 0 0 1 24 4" fill="none" opacity="0.2" />
      </g>
    </svg>
  );
}

/** Centered hero lockup: orb + wordmark, with a gentle breathing motion. */
export function HeroLockup() {
  return (
    <div className="flex select-none items-center gap-3">
      <BrandOrb className="animate-breathe size-12" />
      <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Fɔngbè
      </span>
    </div>
  );
}
