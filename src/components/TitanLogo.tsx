import { cn } from "@/lib/utils";
import shield from "@/assets/titan-shield-logo.png";

type Props = {
  className?: string;
  /** Height of the emblem in px */
  size?: number;
  showWordmark?: boolean;
};

/**
 * Titan Labs Australia logo: the metallic Spartan shield emblem paired
 * with the metallic wordmark.
 */
export function TitanLogo({ className, size = 56, showWordmark = true }: Props) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={shield}
        alt="Titan Labs Australia Spartan shield emblem"
        style={{ height: size }}
        className="w-auto drop-shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
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
