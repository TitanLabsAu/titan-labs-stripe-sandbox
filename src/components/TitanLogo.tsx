import { cn } from "@/lib/utils";
import mascot from "@/assets/titan-mascot.png";

type Props = {
  className?: string;
  /** Height of the emblem in px */
  size?: number;
  showWordmark?: boolean;
};

/**
 * Titan Labs Australia logo: the flag-bearing titan scientist emblem
 * paired with the metallic wordmark.
 */
export function TitanLogo({ className, size = 56, showWordmark = true }: Props) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={mascot}
        alt="Titan Labs Australia emblem"
        style={{ height: size }}
        className="w-auto drop-shadow-[0_0_18px_rgba(47,107,255,0.55)]"
      />

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
