import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { ReconstitutionCalculator } from "@/components/ReconstitutionCalculator";
import { useSiteContent } from "@/lib/useCatalog";

export const Route = createFileRoute("/protocols")({
  head: () => ({
    meta: [
      { title: "Reconstitution & Dosage Protocols | Titan Labs Aus" },
      {
        name: "description",
        content:
          "Reconstitution advice, dosage protocols and a mixing calculator for Titan Labs Aus research peptides.",
      },
      { property: "og:title", content: "Reconstitution & Dosage Protocols | Titan Labs Aus" },
      {
        property: "og:description",
        content: "Mixing advice, protocols and a bacteriostatic water calculator.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProtocolsPage,
});

function ProtocolsPage() {
  const { data } = useSiteContent();
  const recon = data?.["reconstitution_advice"]?.trim();
  const dosage = data?.["dosage_protocols"]?.trim();

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-8 px-4 pb-24">
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-foreground">
          Reconstitution &amp; dosage
        </h1>

        <ReconstitutionCalculator />

        <section className="rounded-xl border border-border bg-card/70 p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-accent">
            Reconstitution advice
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {recon || "Advice is being prepared — check back soon."}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card/70 p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-accent">
            Dosage protocols
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {dosage || "Protocols are being prepared — check back soon."}
          </p>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Research use only. Not for human consumption.
        </p>
      </main>
    </div>
  );
}
