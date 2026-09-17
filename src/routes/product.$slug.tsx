import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { ReconstitutionCalculator } from "@/components/ReconstitutionCalculator";
import { useCart } from "@/lib/cart";
import {
  cartLineKey,
  formatPrice,
  getProductOption,
  kitPriceFor,
  type ProductPack,
} from "@/lib/products";
import { getProductBySlug } from "@/lib/catalog.functions";
import { useProducts } from "@/lib/useCatalog";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await getProductBySlug({ data: { slug: params.slug } });
    if (!product) throw notFound();
    return { product };
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
    const title = `${product.name} | Titan Labs Aus`;
    const description = product.description || product.blurb || `${product.name} from Titan Labs Aus.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { products } = useProducts();
  const { addItem, items } = useCart();
  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [pack, setPack] = useState<ProductPack>("single");
  const selected = useMemo(
    () => getProductOption(product, variantId, pack),
    [product, variantId, pack],
  );
  const selectedKey = cartLineKey(product.slug, selected.variantId, selected.pack);
  const carted = items.find((i) => i.key === selectedKey)?.quantity ?? null;

  const [qty, setQty] = useState(1);
  const [synced, setSynced] = useState<{ key: string; carted: number | null }>({
    key: selectedKey,
    carted: null,
  });
  const expectedCarted = useRef<number | null>(null);

  if (synced.key !== selectedKey || synced.carted !== carted) {
    const isOwnAdd =
      synced.key === selectedKey && expectedCarted.current !== null && carted === expectedCarted.current;
    if (!isOwnAdd) {
      setQty(carted ?? 1);
    }
    expectedCarted.current = null;
    setSynced({ key: selectedKey, carted });
  }

  const singleOption = getProductOption(product, variantId, "single");
  const kitOption = getProductOption(product, variantId, "kit");
  const total = selected.unitPrice * qty;

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <Link to="/range" className="text-sm text-muted-foreground hover:text-accent">
          ← Back to the range
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-6">
            <img
              src={product.image}
              alt={product.alt}
              className="w-full rounded-xl border border-border object-cover"
            />
            <div>
              {product.reconNotes ? (
                <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {product.reconNotes}
                </p>
              ) : null}
              <ReconstitutionCalculator
                title={`Reconstitution for ${product.name}`}
                vialMg={product.reconVialMg ?? null}
                waterMl={product.reconWaterMl ?? null}
                doseMcg={product.reconDoseMcg ?? null}
              />
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-extrabold uppercase tracking-tight text-foreground">
              {product.name}
            </h1>
            <p className="mt-3 flex flex-wrap items-baseline gap-3">
              {product.wasPrice && variants.length === 0 ? (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.wasPrice)}
                </span>
              ) : null}
              <span className="text-2xl font-extrabold text-accent">
                {variants.length > 0 ? `From ${formatPrice(singleOption.unitPrice)}` : formatPrice(product.price)}
              </span>
              {product.promoLabel ? (
                <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent-foreground">
                  {product.promoLabel}
                </span>
              ) : null}
            </p>

            <div className="mt-5 flex gap-3 rounded-xl border border-accent/60 bg-card/70 p-4">
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
              <p className="text-sm font-bold uppercase leading-6 tracking-wide text-foreground">
                Delivered Australia wide or your money back. Every order is covered by our 100%
                delivery guarantee.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card/70 p-5">
              {variants.length > 0 ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Vial size</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {variants.map((variant) => (
                      <Button
                        key={variant.id}
                        variant={selected.variantId === variant.id ? "default" : "outline"}
                        className="h-auto justify-between gap-3 px-4 py-3 font-bold uppercase"
                        onClick={() => setVariantId(variant.id)}
                      >
                        <span>{variant.label}</span>
                        <span>{formatPrice(variant.price)}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={variants.length > 0 ? "mt-5" : ""}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Buy option</p>
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
                  max={99}
                  value={qty}
                  onChange={(e) => setQty(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                  className="h-10 w-20 rounded-md border border-input bg-background text-center text-lg font-bold text-foreground"
                  aria-label="Quantity"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm uppercase tracking-wide text-muted-foreground">Total</span>
                <span className="text-2xl font-extrabold text-accent">{formatPrice(total)}</span>
              </div>

              <Button
                size="lg"
                className="mt-5 w-full font-bold uppercase tracking-wide"
                onClick={() => {
                  expectedCarted.current = (carted ?? 0) + qty;
                  addItem(product.slug, qty, {
                    variantId: selected.variantId,
                    variantLabel: selected.variantLabel,
                    pack: selected.pack,
                  });
                  toast.success(`${qty} × ${product.name} ${selected.label} added to cart`);
                }}
              >
                Add to cart
              </Button>
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
                    className="rounded-full border border-accent/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent"
                  >
                    {c}
                  </span>
                ))}
              </p>
            ) : null}

            {product.protocol ? (
              <div className="mt-6 rounded-xl border border-border bg-card/70 p-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  How to use this product
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {product.protocol}
                </p>
              </div>
            ) : null}

            {(product.links ?? []).length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {(product.links ?? []).map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-accent hover:bg-accent/10"
                  >
                    {l.label || "View link"}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">
            More from the range
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products
              .filter((p) => p.slug !== product.slug)
              .map((p) => (
                <Link
                  key={p.slug}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="overflow-hidden rounded-xl border border-border bg-card/70 transition-transform hover:-translate-y-1"
                >
                  <img
                    src={p.image}
                    alt={p.alt}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-3 p-5">
                    <h3 className="text-lg font-bold uppercase text-foreground">{p.name}</h3>
                    <span className="text-lg font-extrabold text-accent">{formatPrice(p.price)}</span>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
