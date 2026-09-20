import { cn } from "@/lib/utils";
import logoAsset from "@/assets/titan-labs-new-logo.png.asset.json";

type Props = {
  className?: string;
  /** Height of the emblem in px */
  size?: number;
  showWordmark?: boolean;
};

/**
 * Titan Labs Australia metallic Spartan identity.
 */
export function TitanLogo({ className, size = 56, showWordmark = true }: Props) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span
        className="logo-cutout relative shrink-0 overflow-hidden border border-border bg-foreground shadow-glow"
        style={{ width: size, height: size }}
      >
        <img
          src={logoAsset.url}
          alt="Titan Labs Australia"
          width={768}
          height={768}
          className="h-full w-full object-cover"
        />
      </span>

      {showWordmark ? (
        <div className="min-w-0 leading-none">
          <div className="truncate font-display text-base font-black uppercase text-foreground sm:text-xl">
            Titan Labs
          </div>
          <div className="mt-1 text-[0.55rem] font-bold uppercase text-accent">
            Australia
          </div>
        </div>
      ) : null}
    </div>
  );
}
