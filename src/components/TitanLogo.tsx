import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Height of the emblem in px */
  size?: number;
  showWordmark?: boolean;
};

/**
 * Titan Labs Aus logo, drawn in SVG so it scales and matches the page theme.
 * Emblem: a hexagonal shield with a lightning bolt + Southern Cross stars.
 */
export function TitanLogo({ className, size = 56, showWordmark = true }: Props) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Titan Labs Aus emblem"
        className="drop-shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
      >
        <defs>
          <linearGradient id="titan-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(210 30% 92%)" />
            <stop offset="45%" stopColor="hsl(212 18% 62%)" />
            <stop offset="55%" stopColor="hsl(214 22% 38%)" />
            <stop offset="100%" stopColor="hsl(215 30% 78%)" />
          </linearGradient>
          <linearGradient id="titan-bolt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>

        <polygon
          points="50,4 89,26 89,74 50,96 11,74 11,26"
          fill="var(--card)"
          stroke="url(#titan-steel)"
          strokeWidth="4"
        />
        <polygon
          points="50,13 81,31 81,69 50,87 19,69 19,31"
          fill="none"
          stroke="color-mix(in oklab, var(--accent) 50%, transparent)"
          strokeWidth="1.5"
        />

        <path
          d="M56 20 L32 55 H46 L42 82 L68 44 H53 Z"
          fill="url(#titan-bolt)"
          stroke="color-mix(in oklab, var(--accent) 70%, transparent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        <g fill="var(--accent)">
          <circle cx="26" cy="40" r="1.8" />
          <circle cx="30" cy="58" r="1.4" />
          <circle cx="23" cy="66" r="1.2" />
          <circle cx="74" cy="34" r="1.4" />
          <circle cx="78" cy="52" r="1.8" />
        </g>
      </svg>

      {showWordmark && (
        <div className="leading-none">
          <div className="metallic-text text-xl font-black uppercase tracking-[0.18em] sm:text-2xl">
            Titan Labs
          </div>
          <div className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.55em] text-accent">
            Australia
          </div>
        </div>
      )}
    </div>
  );
}
