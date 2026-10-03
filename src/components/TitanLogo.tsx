import { cmsValues } from "@/lib/storefrontContent";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/titan-labs-new-logo.png.asset.json";
import { homeValue } from "@/lib/homeContent";
import { useSiteContent } from "@/lib/useCatalog";

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
  const { data: content } = useSiteContent();
  const pageName = homeValue(content, "home_headline");

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span
        className="logo-cutout relative shrink-0 overflow-hidden border border-border bg-card shadow-glow"
        style={{ width: size, height: size }}
      >
        <img
          src={cmsValues(content, "branding").logo || logoAsset.url}
          alt={pageName}
          width={768}
          height={768}
          className="h-full w-full object-cover"
        />
      </span>

      {showWordmark ? (
        <div className="min-w-0 leading-none">
          <div className="truncate font-display text-sm font-bold uppercase text-foreground sm:text-lg">
            {pageName}
          </div>
          <div className="mt-1 text-[0.5rem] font-bold uppercase text-accent">
            {homeValue(content, "header_tagline")}
          </div>

        </div>
      ) : null}
    </div>
  );
}
