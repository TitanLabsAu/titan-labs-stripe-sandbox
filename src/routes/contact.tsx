import { SITE_ORIGIN } from "@/lib/seo";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { CmsLink } from "@/components/CmsLink";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({ links: [{rel:"canonical",href:`${SITE_ORIGIN}/contact`}],
    meta: [
      { title: "Contact & Customer Support | Titan Labs // Aus" },
      { name: "description", content: "Contact the Titan Labs // Aus Sales Rep on WhatsApp for order enquiries and customer support." },
      { property: "og:title", content: "Contact & Customer Support | Titan Labs // Aus" },
      { property: "og:description", content: "Contact the Titan Labs // Aus Sales Rep on WhatsApp for order enquiries and customer support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const c = cmsValues(useSiteContent().data, "page_contact");
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <TitanPageHeading as="h1" icon={MessageCircle} eyebrow={c.eyebrow} title={c.title} />
        <section className="mt-8 max-w-4xl rounded-xl border border-primary/25 border-l-2 border-l-primary bg-card/85 p-6 sm:p-8">
          <p className="technical-label text-accent">{c.card_label}</p>
          <h2 className="mt-3 font-display text-lg font-extrabold uppercase text-foreground">{c.card_title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{c.body}</p>
          {c.phone_display ? <p className="mt-5 text-lg font-bold text-foreground">{c.phone_display}</p> : null}
          {c.button_label && c.whatsapp_url ? (
            <Button asChild className="mt-6" size="lg">
              <CmsLink href={c.whatsapp_url}>
                <MessageCircle aria-hidden="true" /> {c.button_label}
              </CmsLink>
            </Button>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
