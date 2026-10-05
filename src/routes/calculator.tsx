import { SITE_ORIGIN } from "@/lib/seo";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { ConcentrationCalculator } from "@/components/ConcentrationCalculator";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    links: [{ rel: "canonical", href: `${SITE_ORIGIN}/calculator` }],
    meta: [
      { title: "Reconstitution Calculator | Titan Labs Australia" },
      {
        name: "description",
        content:
          "Calculate vial concentration, volume and U-100 scale units from vial strength, diluent volume and a target amount.",
      },
      {
        property: "og:title",
        content: "Reconstitution Calculator | Titan Labs Australia",
      },
      {
        property: "og:description",
        content:
          "A neutral reconstitution and concentration calculator with a U-100 scale visualiser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  const intro = cmsValues(useSiteContent().data, "page_intros");
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <TitanPageHeading
          as="h1"
          icon={Calculator}
          eyebrow={intro.calc_eyebrow}
          title={intro.calc_title}
        />
        {intro.calc_intro ? <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{intro.calc_intro}</p> : null}
        <div className="h-7" />
        <ConcentrationCalculator />
      </main>
      <SiteFooter />
    </div>
  );
}
