import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { ConcentrationCalculator } from "@/components/ConcentrationCalculator";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Reconstitution Calculator | Titan Labs Australia" },
      { name: "description", content: "Calculate vial concentration, volume and U-100 scale units from vial strength, diluent volume and a target amount." },
      { property: "og:title", content: "Reconstitution Calculator | Titan Labs Australia" },
      { property: "og:description", content: "A neutral reconstitution and concentration calculator with a U-100 scale visualiser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-10 sm:py-14">
        <div className="mb-7 flex items-center gap-3 border-b border-primary/20 pb-6">
          <Calculator className="h-7 w-7 text-primary" />
          <div>
            <p className="technical-label text-accent">Research tool</p>
            <h1 className="font-display text-3xl font-black uppercase tracking-[0.08em] text-foreground sm:text-4xl">Reconstitution Calculator</h1>
          </div>
        </div>
        <ConcentrationCalculator />
      </main>
      <SiteFooter />
    </div>
  );
}