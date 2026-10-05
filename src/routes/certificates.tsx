import { SITE_ORIGIN } from "@/lib/seo";
import { ProductCertificates } from "@/components/ProductCertificates";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/catalog.functions";
import { productCertificates } from "@/lib/product-certificates";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { CmsLink } from "@/components/CmsLink";
import { TestingTransparencyBanner } from "@/components/TestingTransparencyBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";

export const Route = createFileRoute("/certificates")({
  head: () => ({ links: [{rel:"canonical",href:`${SITE_ORIGIN}/certificates`}],
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
  const catalog=useQuery({queryKey:["catalog-products"],queryFn:()=>listProducts(),staleTime:30_000});
  const certified=(catalog.data ?? []).filter(p=>productCertificates(p).length);
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
        {catalog.isLoading ? <p role="status">Loading product certificates…</p> : catalog.isError ? <p role="alert">Unable to load certificates. <button className="text-primary underline" onClick={()=>void catalog.refetch()}>Try again</button></p> : certified.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{certified.map(p=><article key={p.slug}><h2 className="font-display text-xl font-bold uppercase">{p.name}</h2><ProductCertificates product={p} anchor={false}/></article>)}</div> : <p className="text-center text-muted-foreground">{c.empty_text}</p>}
      </main>
      <SiteFooter />
    </div>
  );
}