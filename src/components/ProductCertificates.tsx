import { Link } from "@tanstack/react-router";
import { CmsLink } from "./CmsLink";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { productCertificates, certificateTitle } from "@/lib/product-certificates";
import type { Product } from "@/lib/products";
import emblem from "@/assets/testing-transparency-emblem.png.asset.json";

export function ProductCoaLink({product}:{product:Product}) {
  const c=cmsValues(useSiteContent().data,"product_page");
  const reports=productCertificates(product);
  if (!reports.length || !c.coa_action) return null;
  const inner=<><img src={emblem.url} alt="" className="h-6 w-6 object-contain"/><span>{c.coa_action}</span></>;
  const cls="inline-flex min-h-7 items-center gap-1 text-xs font-semibold text-primary hover:underline";
  return reports.length===1 ? <CmsLink href={reports[0]!.url} newTab className={cls} aria-label={`${c.coa_action}: ${certificateTitle(product,reports[0]!)}`}>{inner}</CmsLink> : <Link to="/product/$slug" params={{slug:product.slug}} hash="certificates" className={cls} aria-label={`${c.coa_action}: ${product.name}, ${reports.length} reports`}>{inner}</Link>;
}
export function ProductCertificates({product, anchor=true}:{product:Product; anchor?:boolean}) {
  const c=cmsValues(useSiteContent().data,"product_page");
  const reports=productCertificates(product);
  if (!reports.length) return null;
  return <section id={anchor ? "certificates" : undefined} className="mt-6 scroll-mt-8 rounded-xl border border-primary/40 bg-primary/5 p-5" aria-label="Product Certificates of Analysis">
    <h2 className="flex items-center gap-3 font-display text-xl font-bold uppercase"><img src={emblem.url} alt="" className="h-10 w-10 object-contain"/>{c.coa_heading}</h2>
    <div className="mt-4 flex flex-col gap-3">{reports.map((l,i)=><CmsLink key={`${l.url}-${i}`} href={l.url} newTab className="rounded-md border border-accent px-4 py-3 text-sm font-bold text-accent hover:bg-accent/10">{c.coa_action} — {certificateTitle(product,l)}</CmsLink>)}</div>
  </section>;
}
