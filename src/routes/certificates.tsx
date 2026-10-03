import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { CmsLink } from "@/components/CmsLink";
import { TestingTransparencyBanner } from "@/components/TestingTransparencyBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";

export const Route = createFileRoute("/certificates")({
  head: () => ({
    meta: [
      { title: "Product Certificates | Titan Labs Aus" },
      {
        name: "description",
        content: "View product certificates published by Titan Labs Aus as they become available.",
      },
      { property: "og:title", content: "Product Certificates | Titan Labs Aus" },
      {
        property: "og:description",
        content: "Product certificates from Titan Labs Aus will be listed here as they are added.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const c = cmsValues(useSiteContent().data, "page_certificates");
  return (
    <div className="min-h-screen bg-hero">
      <SiteHeader />
      <main className="page-shell py-10 sm:py-14">
        <TestingTransparencyBanner placement="certificates" />
        <section className="mx-auto max-w-3xl py-16 text-center sm:py-24" aria-labelledby="certificates-heading">
          <FileCheck2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h1 id="certificates-heading" className="mt-5 font-display text-3xl font-black uppercase text-foreground sm:text-5xl">
            {c.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            <span className="whitespace-pre-line">{c.intro}</span>
          </p>
          {c.verify_label ? (
            <CmsLink href={c.verify_url} className="mt-6 inline-block font-bold text-primary underline underline-offset-4">
              {c.verify_label}
            </CmsLink>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}