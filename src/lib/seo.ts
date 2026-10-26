import type { Product } from "./products";
import { stockState, variantStockFor } from "./products";
import { promotedPrice } from "./variant-promotions";
export const SITE_ORIGIN = "https://titanlabsaus.com";
export const productUrl = (slug: string) => `${SITE_ORIGIN}/product/${encodeURIComponent(slug)}`;
export function absoluteImage(value: string) {
  try { const u = new URL(value, SITE_ORIGIN); return u.protocol === "https:" ? u.href : undefined; } catch { return undefined; }
}
export function seoHead(title: string, description: string, url: string, image?: string, type = "website") {
  const photo = image?.trim() ? absoluteImage(image) : undefined;
  return {links:[{rel:"canonical",href:url}],meta:[{title},{name:"description",content:description},{property:"og:title",content:title},{property:"og:description",content:description},{property:"og:url",content:url},{property:"og:type",content:type},{name:"twitter:card",content:photo?"summary_large_image":"summary"},...(photo?[{property:"og:image",content:photo},{name:"twitter:image",content:photo}]:[])]};
}
export function productSchema(p: Product) {
  const url = productUrl(p.slug);
  const options = p.variants?.length ? p.variants.map(v=>({name:`${p.name} — ${v.label}`,price:promotedPrice(v.price,v.salePrice),stock:variantStockFor(p,v.id),comingSoon:p.comingSoon||v.comingSoon})) : [{name:p.name,price:p.price,stock:p.stock,comingSoon:p.comingSoon}];
  const offers = options.filter(o=>Number.isFinite(o.price)&&o.price>0).map(o=>({"@type":"Offer",name:o.name,url,price:o.price,priceCurrency:"AUD",availability:`https://schema.org/${o.comingSoon||stockState(o.stock)==="out"?"OutOfStock":"InStock"}`}));
  return {"@context":"https://schema.org","@type":"Product",name:p.name,description:p.description||p.blurb, image:absoluteImage(p.image),sku:p.slug,brand:{"@type":"Brand",name:"Titan Labs Aus"},url,...(offers.length?{offers}: {})};
}
export const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
export const xmlEscape = (value: string) => value.replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[c]!));
export function sitemapXml(paths: string[]) {return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map(path=>`<url><loc>${xmlEscape(new URL(path,SITE_ORIGIN).href)}</loc></url>`).join("")}</urlset>`;}
