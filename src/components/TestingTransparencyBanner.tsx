import { cmsValues, fillTokens as _ft } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { CmsLink } from "@/components/CmsLink";
import { ArrowRight } from "lucide-react";
import emblemAsset from "@/assets/testing-transparency-emblem.png.asset.json";
import { cn } from "@/lib/utils";

type TestingTransparencyBannerProps = {
  compact?: boolean;
  className?: string;
  /** Where the badge is shown; respects the per-placement visibility setting. */
  placement?: "catalogue" | "footer" | "certificates";
};

export function TestingTransparencyBanner({
  compact = false,
  className,
  placement,
}: TestingTransparencyBannerProps) {
  const c = cmsValues(useSiteContent().data, "badge");
  if (placement && !c[`show_${placement}`]) return null;
  return (
    <aside
      aria-labelledby={compact ? "testing-transparency-footer" : undefined}
      className={cn(
        "testing-transparency relative isolate overflow-hidden border border-primary/50 bg-card shadow-glow",
        compact ? "p-3" : "p-4 sm:p-6",
        className,
      )}
    >
      <div className="testing-transparency-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className={cn(
          "relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center",
          compact ? "gap-3" : "gap-4 sm:gap-6",
        )}
      >
        <img
          src={c.image || emblemAsset.url}
          alt={c.image_alt}
          width={1254}
          height={1254}
          loading="lazy"
          className={cn(
            "shrink-0 object-contain drop-shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_38%,transparent)]",
            compact ? "h-16 w-16" : "h-20 w-20 sm:h-28 sm:w-28",
          )}
        />
        <div
          className={cn(
            "min-w-0 border-l border-accent/75",
            compact ? "pl-3" : "pl-4 sm:pl-7",
          )}
        >
          <h2
            id={compact ? "testing-transparency-footer" : undefined}
            className={cn(
              "font-display font-black uppercase leading-none text-foreground",
              compact ? "text-lg" : "text-2xl sm:text-4xl",
            )}
          >
            {c.headline}
          </h2>
          <p className={cn("text-muted-foreground", compact ? "mt-1 text-xs leading-4" : "mt-2 text-sm leading-5 sm:text-lg")}>
            {c.membership}
          </p>
          {c.link_label ? <CmsLink
            href={c.link_url}
            className={cn(
              "group inline-flex max-w-full items-center gap-2 font-bold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm",
              compact ? "mt-2 text-xs" : "mt-3 text-sm sm:mt-4 sm:text-base",
            )}
          >
            <span>{c.link_label}</span>
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none group-hover:translate-x-1" aria-hidden="true" />
          </CmsLink> : null}
        </div>
      </div>
    </aside>
  );
}