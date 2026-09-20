import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { ReconstitutionCalculator } from "@/components/ReconstitutionCalculator";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Reconstitution Calculator | Titan Labs Australia" },
      { name: "description", content: "Calculate research vial concentration, syringe units and doses using vial size, mixing water and desired dose." },
      { property: "og:title", content: "Reconstitution Calculator | Titan Labs Australia" },
      { property: "og:description", content: "A research reconstitution calculator for vial concentration, mixing water and desired dose." },
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
        <div className="mb-7 flex items-center gap-3">
          <Calculator className="h-7 w-7 text-primary" />
          <div>
            <p className="technical-label text-accent">Research tool</p>
            <h1 className="text-3xl font-medium uppercase text-foreground sm:text-4xl">Reconstitution Calculator</h1>
          </div>
        </div>
        <div className="max-w-4xl">
          <ReconstitutionCalculator title="Calculate your reconstitution" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}