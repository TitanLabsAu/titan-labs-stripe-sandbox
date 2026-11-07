import { STORAGE_SLUG, STORAGE_GIFT_VARIANT, STORAGE_OFFER } from "@/lib/storage-gift";
import { productDisplayName, productDisplaySize, relatedProductPresentation } from "@/lib/product-presentation";
import { productInformation, type ProductInformationEntry } from "@/lib/product-information";
import { ProductGallery } from "@/components/ProductGallery";
import { PhotoColourSelector } from "@/components/PhotoColourSelector";
import { hasPhotoColourOptions } from "@/lib/product-gallery";
import { Accordion,AccordionItem,AccordionTrigger,AccordionContent } from "@/components/ui/accordion";
import { promotedPrice } from "@/lib/variant-promotions";
import { CatalogueProductImage } from "@/components/RangeProductArt";
import { seoHead, productUrl, productSchema, jsonLd } from "@/lib/seo";
import { ProductCertificates } from "@/components/ProductCertificates";
import { isCertificate } from "@/lib/product-certificates";
import { CmsLink } from "@/components/CmsLink";
import { cmsValues } from "@/lib/storefrontContent";
import { StarterKitOffer } from "@/components/StarterKitOffer";
import { createFileRoute, Link, notFound, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { preloadVariantImages } from "@/lib/products";
import { toast } from "sonner";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { PenCompanionOffer } from "@/components/PenCompanionOffer";
import {
  cartLineKey,
  firstAvailableVariant,
  formatPrice,
  getProductOption,
  isComingSoon,
  subDescriptionFor,
  packLabel,
  sortedProductVariants,
  stockState,
  variantStockFor,
} from "@/lib/products";
import { getProductBySlug, getSiteContent } from "@/lib/catalog.functions";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { catalogueName } from "@/lib/homeContent";

export const Route = createFileRoute("/product/$slug")({
  // Optional exact-size deep link (welcome email); unknown ids fall back safely.
  validateSearch: (search: Record<string, unknown>): { variant?: string } =>
    typeof search["variant"] === "string" && /^[\w-]{1,80}$/.test(search["variant"]) ? { variant: search["variant"] } : {},
  loader: async ({ params }) => {
    const product = await getProductBySlug({ data: { slug: params.slug } });
    if (!product) throw notFound();
    return { product, seo: cmsValues(await getSiteContent().catch(() => ({})), "seo") };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product unavailable | Titan Labs Aus" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { product } = loaderData;
    const override = loaderData.seo.products.find((r: {slug:string})=>r.slug===product.slug);
    const title = override?.title?.trim() || `${product.name} | Titan Labs Aus`;
    const description = override?.description?.trim() || `${product.name}. ${product.description || product.blurb || "Explore product details and available certificates from Titan Labs Aus."}`;
    return {...seoHead(title,description,productUrl(product.slug),override?.image || product.image,"product"),scripts:[{type:"application/ld+json",children:jsonLd(productSchema(product))}]};
  },
  component: ProductPage,
});

function ProductPage() {
  const {product}=Route.useLoaderData();
  return <ProductPageBody key={product.slug}/>;
}

function ProductPageBody() {
  const { product } = Route.useLoaderData();
  const hash = useLocation({select: location=>location.hash});
  const [openInformation,setOpenInformation]=useState<string[]>([]);
  useEffect(()=>{if(hash.replace(/^#/,"")==="certificates") setOpenInformation(v=>v.includes("documents")?v:[...v,"documents"]);},[hash]);
  useEffect(()=>{if(hash.replace(/^#/,"")==="certificates"&&openInformation.includes("documents")){const frame=requestAnimationFrame(()=>document.getElementById("certificates")?.scrollIntoView({block:"start"}));return()=>cancelAnimationFrame(frame);}return undefined;},[hash,openInformation]);
  const { products } = useProducts();
  const { data: content } = useSiteContent();
  const pp = cmsValues(content, "product_page");
  const { addItem, items } = useCart();
  const variants = sortedProductVariants(product);
  useEffect(() => preloadVariantImages(product), [product]);
  const { variant: linkedVariant } = Route.useSearch();
  const [variantId, setVariantId] = useState<string | null>(() => {
    const linked = (product.variants ?? []).find((v) => v.id === linkedVariant);
    if (linked) return linked.id;
    return firstAvailableVariant(product)?.id ?? null;
  });
  useEffect(() => {
    if (linkedVariant && (product.variants ?? []).some(v => v.id === linkedVariant)) setVariantId(linkedVariant);
  }, [linkedVariant, product.variants]);
  const selected = useMemo(
    () => getProductOption(product, variantId, "single"),
    [product, variantId],
  );
  const selectedKey = cartLineKey(
    product.slug,
    selected.variantId,
    selected.pack,
  );
  const carted = items.find((i) => i.key === selectedKey)?.quantity ?? null;

  const [qty, setQty] = useState(1);
  const [synced, setSynced] = useState<{ key: string; carted: number | null }>({
    key: selectedKey,
    carted: null,
  });
  const expectedCarted = useRef<number | null>(null);

  if (synced.key !== selectedKey || synced.carted !== carted) {
    const isOwnAdd =
      synced.key === selectedKey &&
      expectedCarted.current !== null &&
      carted === expectedCarted.current;
    if (!isOwnAdd) {
      setQty(carted ?? 1);
    }
    expectedCarted.current = null;
    setSynced({ key: selectedKey, carted });
  }

  const selectedVariant = (product.variants ?? []).find(v => v.id === variantId);
  const information = productInformation(product, selectedVariant, cmsValues(content, "product_information").items as ProductInformationEntry[]);
  const promoLabel = selectedVariant ? selectedVariant.promoLabel || (selectedVariant.hotProduct ? "Hot product" : (product.variants ?? []).some(v => typeof v.hotProduct === "boolean") ? "" : product.promoLabel || "") : product.promoLabel;
  const wasPrice = selectedVariant && promotedPrice(selectedVariant.price, selectedVariant.salePrice) < selectedVariant.price ? selectedVariant.price : selectedVariant ? null : product.wasPrice;
  const singleOption = getProductOption(product, variantId, "single");
  const total = selected.unitPrice * qty;
  const stockCount = variantStockFor(product, variantId);
  const stock = stockState(stockCount);
  const soon = isComingSoon(product, variantId);
  const maxQty = stock === "out" ? 1 : Math.min(99, stockCount ?? 99);

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main className="product-page-main page-shell py-8 sm:py-12">
        <Link
          to="/range"
          className="text-sm text-muted-foreground hover:text-accent"
        >
          ← Back to {catalogueName(content)}
        </Link>

        <div className="mt-6 border-t border-border pt-8">
          <ProductGallery key={`${product.slug}:${variantId||"base"}`} product={product} variant={selectedVariant}>

          <div>
            <h1 className="titan-hero-heading">{productDisplayName(product)}</h1>
            <p className="mt-3 flex flex-wrap items-baseline gap-3">
              {wasPrice ? (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(wasPrice!)}
                </span>
              ) : null}
              <span className="text-2xl font-extrabold text-accent">
                {variants.length > 0
                  ? formatPrice(singleOption.unitPrice)
                  : formatPrice(product.price)}
              </span>
              {promoLabel ? (
                <span className="brand-cut bg-accent px-3 py-1 text-[10px] font-extrabold uppercase text-accent-foreground">
                  {promoLabel}
                </span>
              ) : null}
            </p>

            {soon ? (
              <p className="mt-4 inline-flex items-center border border-primary bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground">
                {product.comingSoon
                  ? "Coming soon"
                  : `${selected.variantLabel ?? "This size"} coming soon`}
              </p>
            ) : stock === "out" ? (
              <p className="mt-4 inline-flex items-center border border-destructive bg-destructive/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-destructive">
                Out of stock
              </p>
            ) : stock === "low" ? (
              <p className="mt-4 inline-flex items-center border border-accent bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Low stock — only {stockCount} left
              </p>
            ) : null}

            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              {variants.length > 0 ? (
                <div>
                {!hasPhotoColourOptions(variants)?<p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  {product.catalogueSection === "range" ? "Vial size" : "Size"}
                </p>:null}
                  {hasPhotoColourOptions(variants) ? <PhotoColourSelector product={product} variants={variants} value={variantId} onChange={setVariantId}/> : variants.length >= 4 ? (
                    <select
                      className="mt-3 h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground"
                      aria-label="Choose option"
                      value={selected.variantId ?? ""}
                      onChange={(e) => setVariantId(e.target.value)}
                    >
                      {variants.map((variant) => {
                        const soldOut = stockState(variantStockFor(product, variant.id)) === "out";
                        const vSoon = Boolean(variant.comingSoon) && !product.comingSoon;
                        return (
                          <option key={variant.id} value={variant.id}>
                            {packLabel(productDisplaySize(product, variant), variant.packSize)} — {formatPrice(promotedPrice(variant.price, variant.salePrice))}
                            {vSoon ? " · Coming soon" : soldOut ? " · Sold out" : ""}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {variants.map((variant) => {
                      const soldOut = stockState(variantStockFor(product, variant.id)) === "out";
                      const vSoon =
                        Boolean(variant.comingSoon) && !product.comingSoon;
                      return (
                        <Button
                          key={variant.id}
                          variant={
                            selected.variantId === variant.id
                              ? "default"
                              : "outline"
                          }
                          className={`h-9 min-w-16 px-3 font-bold uppercase ${soldOut ? "opacity-60" : ""}`}
                          onClick={() => setVariantId(variant.id)}
                        >
                          <span>
                            {packLabel(productDisplaySize(product, variant), variant.packSize)}
                            {vSoon
                              ? " · Coming soon"
                              : soldOut
                                ? " · Sold out"
                                : ""}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                  )}
                  {(() => {
                    const items = variants.find((v) => v.id === selected.variantId)?.contents ?? [];
                    return items.length ? (
                      <div className="mt-3 rounded-md border border-primary/25 bg-primary/5 p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Bundle includes</p>
                        <ul className="mt-1 space-y-0.5 text-sm text-foreground">
                          {items.map((it, k) => (
                            <li key={k}>{it.quantity} × {it.name}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : null}

              <p className={`${variants.length > 0 ? "mt-5" : ""} text-xs font-bold uppercase tracking-[0.2em] text-accent`}>
                {subDescriptionFor(product) ? `${subDescriptionFor(product)} · ` : ""}{formatPrice(singleOption.unitPrice)}
              </p>

        {product.slug === STORAGE_SLUG && variantId === STORAGE_GIFT_VARIANT ? <p className="mt-2 text-sm font-semibold text-accent">{STORAGE_OFFER}<span className="mt-1 block text-xs font-normal text-muted-foreground">Members · one per order · while stocks last</span></p> : null}
              <PenCompanionOffer key={`pen-${variantId || "base"}`} product={product} variantId={variantId} />
              <StarterKitOffer key={`kit-${variantId || "base"}`} product={product} variantId={variantId}/>
              <label className="mt-6 block text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Quantity
              </label>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={(e) =>
                    setQty(
                      Math.min(
                        maxQty,
                        Math.max(1, Number(e.target.value) || 1),
                      ),
                    )
                  }
                  className="quantity-input h-10 w-20 rounded-md border border-input bg-background text-center text-lg font-bold text-foreground"
                  aria-label="Quantity"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm uppercase tracking-wide text-muted-foreground">
                  Total
                </span>
                <span className="text-2xl font-extrabold text-accent">
                  {formatPrice(total)}
                </span>
              </div>

              <Button
                size="lg"
                disabled={soon || stock === "out"}
                className="mt-5 w-full font-bold uppercase tracking-wide"
                onClick={() => {
                  expectedCarted.current = (carted ?? 0) + qty;
                  addItem(product.slug, qty, {
                    variantId: selected.variantId,
                    variantLabel: selected.variantLabel,
                    pack: selected.pack,
                  });
                  toast.success(
                    `${qty} × ${product.name} ${selected.label} added to cart`,
                  );
                }}
              >
                {soon
                  ? "Coming soon"
                  : stock === "out"
                    ? "Out of stock"
                    : "Add to cart"}
              </Button>
            </div>

            <div className="mt-5 flex gap-3 rounded-xl border border-border bg-card p-4">
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
              <p className="text-sm font-bold uppercase leading-6 tracking-wide text-foreground">
                Delivered Australia wide or your money back. Every order is
                covered by our 100% delivery guarantee.
              </p>
            </div>

          </div>
          </ProductGallery>
        </div>

        <Accordion type="multiple" value={openInformation} onValueChange={setOpenInformation} className="product-information mt-8 space-y-3">
          {([ ["details", "Product details", information.details], ["included", "What's included", information.included], ["care", "Compatibility & care", information.care], ["shipping", "Shipping & returns", information.shipping] ] as const).filter(([, , value])=>Boolean(value)).map(([key,title,value])=><AccordionItem key={key} value={key} className="rounded-lg border border-primary/25 bg-card px-5"><AccordionTrigger className="font-display font-bold uppercase">{title}</AccordionTrigger><AccordionContent><p className="whitespace-pre-wrap leading-7">{value}</p></AccordionContent></AccordionItem>)}
          {information.documents.length ? <AccordionItem value="documents" className="rounded-lg border border-primary/25 bg-card px-5"><AccordionTrigger className="font-display font-bold uppercase">Documents & certificates</AccordionTrigger><AccordionContent>
            <ProductCertificates product={product}/>
            {information.documents.filter(l=>!isCertificate(l)).map(l=><CmsLink key={l.url} href={l.url} className="mt-3 inline-block text-primary underline">{l.label || pp.link_fallback}</CmsLink>)}
          </AccordionContent></AccordionItem> : null}
        </Accordion>


        <section className="mt-16">
          <h2 className="font-display text-2xl font-black uppercase tracking-[0.08em] text-foreground">
            {String(pp.more_heading).replace(/\{catalogue\}/g, catalogueName(content))}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products
              .filter((p) => p.slug !== product.slug)
              .map((p) => {
                const { variant, option } = relatedProductPresentation(p);
                return (
                <Link
                  key={p.slug}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  search={variant ? { variant: variant.id } : {}}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary hover:shadow-glow"
                >
                  <CatalogueProductImage
                    product={p}
                    variant={variant}
                    sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                    alt={p.alt}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                  <div className="flex items-center justify-between gap-3 p-5">
                    <h3 className="text-lg font-bold uppercase text-foreground">
                      {productDisplayName(p)}{variant ? <span className="block text-sm font-normal normal-case text-muted-foreground">{productDisplaySize(p, variant)}</span> : null}
                    </h3>
                    <span className="text-lg font-extrabold text-accent">
                      {formatPrice(option.unitPrice)}
                    </span>
                  </div>
                </Link>
              );})}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}





