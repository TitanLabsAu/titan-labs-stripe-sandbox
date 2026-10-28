import { ChristmasSectionDecor } from "@/components/christmas/ChristmasTheme";
import { ArrowRight, ArrowUpRight, FileText } from "lucide-react";
import { ThemedArt, themedArtPair } from "@/components/ThemedImage";
import { Button } from "@/components/ui/button";

import { CmsLink } from "@/components/CmsLink";
import { canonicalUrl, cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";

export function TestingTransparencySection() {
  const { data: content } = useSiteContent();
  const c = cmsValues(content, "home_testing");
  const image = themedArtPair(c.image || "/images/titan-testing-laboratory-1254-v2.webp", c.image_light, "/images/product-light/testing-laboratory-light.webp");
  if (!c.visible) return null;
  const showPrimary = Boolean(c.primary_label?.trim() && canonicalUrl(c.primary_url ?? ""));
  const showSecondary = Boolean(c.secondary_label?.trim() && canonicalUrl(c.secondary_url ?? ""));
  const bullets = (c.bullets as { text: string }[]).filter((b) => b.text.trim());
  return (
    <section
      aria-labelledby="homepage-testing-transparency"
      className="discovery-testing page-shell relative pb-16 sm:pb-20"
    >
      <div className="grid min-w-0 items-center gap-8 lg:grid-cols-2 lg:gap-10">
        <figure className="relative min-w-0 overflow-hidden rounded-md">
          <ThemedArt
            dark={image.dark}
            light={image.light}
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt={c.image_alt}
            width={768}
            height={768}
            className="aspect-square w-full object-cover lg:aspect-[16/9]"
          />
          {c.caption ? (
            <figcaption className="absolute bottom-3 left-3 rounded-sm bg-background/90 px-2 py-1 text-xs text-muted-foreground">
              {c.caption}
            </figcaption>
          ) : null}
        </figure>
        <div className="min-w-0">
          <p className="mb-4 flex items-center gap-3 font-display text-sm font-bold tracking-normal text-accent">
            <span aria-hidden="true" className="h-px w-8 shrink-0 bg-accent" />
            {c.eyebrow}
            <span aria-hidden="true" className="h-px w-8 shrink-0 bg-accent" />
          </p>
          <h2
            id="homepage-testing-transparency"
            className="font-display text-4xl font-black uppercase leading-none tracking-normal text-foreground sm:text-5xl"
          >
            {c.headline}
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
            <span className="whitespace-pre-line">{c.body}</span>
          </p>
          <ul className="my-6 space-y-4">
            {bullets.map(({ text: point }) => (
              <li key={point} className="flex items-center gap-4 text-base leading-6 text-foreground">
                <FileText aria-hidden="true" className="h-8 w-8 shrink-0 text-primary" strokeWidth={1.5} />
                <span className="min-w-0">{point}</span>
              </li>
            ))}
          </ul>
          {showPrimary || showSecondary ? (
          <div className={showPrimary && showSecondary ? "grid min-w-0 gap-3 sm:grid-cols-2" : "grid min-w-0 gap-3"}>
            {showPrimary ? (
            <Button
              asChild
              size="lg"
              className="h-14 min-w-0 rounded-md border-primary bg-foreground px-4 text-base tracking-normal text-background hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-offset-4"
            >
              <CmsLink href={c.primary_url}>
                {c.primary_label} <ArrowRight aria-hidden="true" />
              </CmsLink>
            </Button>
            ) : null}
            {showSecondary ? (
            <div className="min-w-0">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 w-full min-w-0 rounded-md border border-primary bg-background px-4 text-lg tracking-normal text-foreground focus-visible:ring-2 focus-visible:ring-offset-4"
              >
                <CmsLink href={c.secondary_url} aria-describedby={c.secondary_helper ? "coa-external-destination" : undefined}>
                  {c.secondary_label} <ArrowUpRight aria-hidden="true" />
                </CmsLink>
              </Button>
              {c.secondary_helper ? (
                <p id="coa-external-destination" className="mt-2 text-center text-xs text-muted-foreground">
                  {c.secondary_helper}
                </p>
              ) : null}
            </div>
            ) : null}
          </div>
          ) : null}
        </div>
      </div>
    <ChristmasSectionDecor />
    </section>
  );
}
