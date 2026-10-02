import { createFileRoute, Link } from "@tanstack/react-router";
import { PenTool, RotateCcw, BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/lib/useCatalog";
import { disposablePenSteps } from "@/lib/penGuides";
import { safeUrl } from "@/lib/research";
export const Route = createFileRoute("/pen-guide")({
  head: () => ({ meta: [{ title: "Titan V2 & Disposable Pen Guides | Titan Labs Aus" }] }),
  component: PenGuide,
});
const reusable = [
  [
    "Check compatibility",
    "Confirm the cartridge and accessories match the exact V2 pen model and manufacturer instructions.",
  ],
  [
    "Inspect before handling",
    "Check packaging, labels and the device for damage. Follow the handling and cleaning instructions supplied with the hardware.",
  ],
  [
    "Cartridge and unit scale",
    "Use only the manufacturer’s cartridge-loading and priming instructions. A pen’s unit scale must not be assumed to match a U-100 syringe.",
  ],
  [
    "Storage and disposal",
    "Follow the device and research material storage instructions. Place sharp accessories in an appropriate sharps container.",
  ],
];

function PenGuide() {
  const { products } = useProducts();
  const guides = products.filter(
    (p) => p.catalogueSection === "pens" || /\bv2\b.*pen|pen.*\bv2\b/i.test(p.name),
  );
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <TitanPageHeading
          as="h1"
          icon={BookOpen}
          eyebrow="Equipment reference"
          title="Titan Pen Guides"
        />
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
          Reference information for Titan V2 reusable and disposable pens. Model-specific
          instructions supplied with the hardware take precedence. Products are for laboratory
          research only, not human or animal consumption.
        </p>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {[
            { title: "Titan V2 reusable pen", icon: RotateCcw, steps: reusable },
            { title: "Disposable pre-filled pen", icon: PenTool, steps: disposablePenSteps },
          ].map(({ title, icon: Icon, steps }) => (
            <section key={title} className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
                <Icon className="h-5 w-5 text-primary" />
                {title}
              </h2>
              <ol className="mt-5 space-y-5">
                {steps.map(([heading, body], i) => (
                  <li key={heading}>
                    <h3 className="text-sm font-bold text-foreground">
                      {i + 1}. {heading}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <section className="mt-7 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold uppercase">
            Product information & supplied guides
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open the product information for its current options and documents.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {guides.map((p) => (
              <div key={p.slug}>
                <Button asChild variant="outline">
                  <Link to="/product/$slug" params={{ slug: p.slug }}>
                    {p.name}
                  </Link>
                </Button>
                {(p.links ?? [])
                  .filter((l) => /guide|manual|instruction/i.test(l.label) && safeUrl(l.url))
                  .map((l) => (
                    <a
                      key={l.url}
                      href={safeUrl(l.url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-sm text-primary underline"
                    >
                      {l.label}
                    </a>
                  ))}
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
