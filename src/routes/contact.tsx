import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Customer Support | Titan Labs // Aus" },
      { name: "description", content: "Contact the Titan Labs // Aus Sales Rep on WhatsApp for order enquiries and customer support." },
      { property: "og:title", content: "Contact & Customer Support | Titan Labs // Aus" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <TitanPageHeading as="h1" icon={MessageCircle} eyebrow="Here to help" title="Contact & Customer Support" />
        <section className="mt-8 max-w-4xl rounded-xl border border-primary/25 border-l-2 border-l-primary bg-card/85 p-6 sm:p-8">
          <p className="technical-label text-accent">WhatsApp support</p>
          <h2 className="mt-3 font-display text-lg font-extrabold uppercase text-foreground">Titan Labs // Aus Sales Rep</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Have a question about your order or need a hand? Contact our sales rep directly on WhatsApp. For an existing order, include your order number so we can help you sooner.</p>
          <p className="mt-5 text-lg font-bold text-foreground">+63 956 889 4105</p>
          <Button asChild className="mt-6" size="lg">
            <a href="https://wa.me/639568894105" target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" /> Chat on WhatsApp
            </a>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
