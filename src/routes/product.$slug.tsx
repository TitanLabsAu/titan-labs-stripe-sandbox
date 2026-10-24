import { promotedPrice } from "@/lib/variant-promotions";
import { ThemedProductImage } from "@/components/ThemedImage";
import { seoHead, productUrl, productSchema, jsonLd } from "@/lib/seo";
import { ProductCertificates } from "@/components/ProductCertificates";
import { sanitizeProductLinks, isCertificate } from "@/lib/product-certificates";
import { CmsLink } from "@/components/CmsLink";
import { cmsValues } from "@/lib/storefrontContent";
import { DisposablePenGuide } from "@/components/DisposablePenGuide";
import { StarterKitOffer } from "@/components/StarterKitOffer";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { FlaskConical } from "lucide-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import {
  cartLineKey,
  firstAvailableVariant,
  formatPrice,
  getProductOption,
  isComingSoon,
  kitPriceFor,
  allowsKit,
  singleLabelFor,
  packLabel,
  productBasePrice,
  sortedProductVariants,
  stockState,
  variantStockFor,
  type ProductPack,
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
  const { product } = Route.useLoaderData();
  const { products } = useProducts();
  const { data: content } = useSiteContent();
  const pp = cmsValues(content, "product_page");
  const { addItem, items } = useCart();
  const variants = sortedProductVariants(product);
  const { variant: linkedVariant } = Route.useSearch();
  const [variantId, setVariantId] = useState<string | null>(() => {
    const linked = (product.variants ?? []).find((v) => v.id === linkedVariant);
    if (linked && !linked.comingSoon && (linked.stock === null || linked.stock === undefined || linked.stock > 0)) return linked.id;
    return firstAvailableVariant(product)?.id ?? null;
  });
  const [pack, setPack] = useState<ProductPack>("single");
  const selected = useMemo(
    () => getProductOption(product, variantId, pack),
    [product, variantId, pack],
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
  const promoLabel = selectedVariant ? selectedVariant.promoLabel || (selectedVariant.hotProduct ? "Hot product" : (product.variants ?? []).some(v => typeof v.hotProduct === "boolean") ? "" : product.promoLabel || "") : product.promoLabel;
  const wasPrice = selectedVariant && promotedPrice(selectedVariant.price, selectedVariant.salePrice) < selectedVariant.price ? selectedVariant.price : selectedVariant ? null : product.wasPrice;
  const singleOption = getProductOption(product, variantId, "single");
  const kitOption = getProductOption(product, variantId, "kit");
  const total = selected.unitPrice * qty;
  const stockCount = variantStockFor(product, variantId);
  const stock = stockState(stockCount);
  const soon = isComingSoon(product, variantId);
  const maxQty = stock === "out" ? 1 : Math.min(99, stockCount ?? 99);

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main className="page-shell py-8 sm:py-12">
        <TitanPageHeading
          icon={FlaskConical}
          eyebrow="Research product catalogue"
          title="Product details"
        />
        <div className="h-4" />
        <Link
          to="/range"
          className="text-sm text-muted-foreground hover:text-accent"
        >
          ← Back to {catalogueName(content)}
        </Link>

        <div className="mt-6 grid gap-8 border-t border-border pt-8 lg:grid-cols-[1fr_0.95fr]">
          <div>
            {selectedVariant?.image ? (
              <img
                src={selectedVariant.image}
                alt={`${product.alt} — ${selectedVariant.label}`}
                loading="lazy"
                decoding="async"
                className="w-full rounded-xl border border-border bg-card object-cover"
              />
            ) : (
              <ThemedProductImage
                slug={product.slug}
                src={product.image}
                sizes="(min-width: 1024px) 50vw, 100vw"
                alt={product.alt}
                className="w-full rounded-xl border border-border bg-card object-cover"
              />
            )}
          </div>

          <div>
            <h1 className="titan-hero-heading">{product.name}</h1>
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
              <p className="mt-4 inline-flex items-center border border-accent bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent-foreground">
                Low stock — only {stockCount} left
              </p>
            ) : null}

            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              {variants.length > 0 ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                    {allowsKit(product) ? "Vial size" : "Size"}
                  </p>
                  {variants.length >= 4 ? (
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
                            {packLabel(variant.label, variant.packSize)} — {formatPrice(promotedPrice(variant.price, variant.salePrice))}
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
                            {packLabel(variant.label, variant.packSize)}
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

              {allowsKit(product) ? (
              <div className={variants.length > 0 ? "mt-5" : ""}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  Buy option
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant={pack === "single" ? "default" : "outline"}
                    className="h-auto justify-between gap-3 px-4 py-3 font-bold uppercase"
                    onClick={() => setPack("single")}
                  >
                    <span>Single vial</span>
                    <span>{formatPrice(singleOption.unitPrice)}</span>
                  </Button>
                  <Button
                    variant={pack === "kit" ? "default" : "outline"}
                    className="h-auto justify-between gap-3 px-4 py-3 font-bold uppercase"
                    onClick={() => setPack("kit")}
                  >
                    <span>10x Kit · 20% off</span>
                    <span>{formatPrice(kitOption.unitPrice)}</span>
                  </Button>
                </div>
              </div>
              ) : (
                <p className={`${variants.length > 0 ? "mt-5" : ""} text-xs font-bold uppercase tracking-[0.2em] text-accent`}>
                  {singleLabelFor(product)} · {formatPrice(singleOption.unitPrice)}
                </p>
              )}

              <StarterKitOffer product={product}/>
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

            {product.description ? (
              <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-foreground">
                {product.description}
              </p>
            ) : null}
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {product.details.map((d) => (
                <li key={d}>★ {d}</li>
              ))}
            </ul>

            {(product.categories ?? []).length > 0 ? (
              <p className="mt-5 flex flex-wrap gap-2">
                {(product.categories ?? []).map((c) => (
                  <span
                    key={c}
                    className="brand-cut border border-accent/50 px-3 py-1 text-[10px] font-bold uppercase text-accent"
                  >
                    {c}
                  </span>
                ))}
              </p>
            ) : null}

            {product.catalogueSection === "pens" ? (
              <div className="mt-6"><DisposablePenGuide /></div>
            ) : null}

            {product.protocol ? (
              <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  {pp.usage_heading}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {product.protocol}
                </p>
              </div>
            ) : null}

            <ProductCertificates product={product}/>
            {sanitizeProductLinks(product.links).filter(l=>!isCertificate(l)).length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {sanitizeProductLinks(product.links).filter(l=>!isCertificate(l)).map((l) => (
                  <CmsLink
                    key={l.url}
                    href={l.url}
                    className="brand-cut border border-accent px-4 py-2 text-xs font-bold uppercase text-accent hover:bg-accent/10"
                  >
                    {l.label || pp.link_fallback}
                  </CmsLink>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-black uppercase tracking-[0.08em] text-foreground">
            {String(pp.more_heading).replace(/\{catalogue\}/g, catalogueName(content))}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products
              .filter((p) => p.slug !== product.slug)
              .map((p) => (
                <Link
                  key={p.slug}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary hover:shadow-glow"
                >
                  <ThemedProductImage
                    slug={p.slug}
                    src={p.image}
                    sizes="80px"
                    alt={p.alt}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                  <div className="flex items-center justify-between gap-3 p-5">
                    <h3 className="text-lg font-bold uppercase text-foreground">
                      {p.name}
                    </h3>
                    <span className="text-lg font-extrabold text-accent">
                      {formatPrice(productBasePrice(p))}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

