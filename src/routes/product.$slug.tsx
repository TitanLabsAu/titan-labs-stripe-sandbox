import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
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
        meta: [{ title: "Product unavailable | Titan Labs Aus" }, { name: "robots", content: "noindex" }],
      };
    }
    const { product } = loaderData;
    const title = `${product.name} | Titan Labs Aus`;
    return {
      meta: [
        { title },
        { name: "description", content: product.blurb },
        { property: "og:title", content: title },
        { property: "og:description", content: product.blurb },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { addItem, items } = useCart();
  const carted = items.find((i) => i.slug === product.slug)?.quantity ?? null;

  const [qty, setQty] = useState(1);
  const [synced, setSynced] = useState<{ slug: string; carted: number | null }>({
    slug: product.slug,
    carted: null,
  });
  const expectedCarted = useRef<number | null>(null);

  if (synced.slug !== product.slug || synced.carted !== carted) {
    const isOwnAdd =
      synced.slug === product.slug &&
      expectedCarted.current !== null &&
      carted === expectedCarted.current;
    if (!isOwnAdd) {
      setQty(carted ?? 1);
    }
    expectedCarted.current = null;
    setSynced({ slug: product.slug, carted });
  }

  const total = product.price * qty;

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <Link to="/" className="text-sm text-muted-foreground hover:text-accent">
          ← Back to the range
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <img
            src={product.image}
            alt={product.alt}
            className="w-full rounded-xl border border-border object-cover"
          />

          <div>
            <h1 className="text-4xl font-extrabold uppercase tracking-tight text-foreground">
              {product.name}
            </h1>
            <p className="mt-3 text-2xl font-extrabold text-accent">
              {formatPrice(product.price)}
            </p>
            <p className="mt-4 text-muted-foreground">{product.blurb}</p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {product.details.map((d) => (
                <li key={d}>★ {d}</li>
              ))}
            </ul>

            <div className="mt-8 rounded-xl border border-border bg-card/70 p-5">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
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
                  onChange={(e) =>
                    setQty(Math.min(99, Math.max(1, Number(e.target.value) || 1)))
                  }
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
                <span className="text-sm uppercase tracking-wide text-muted-foreground">
                  Total
                </span>
                <span className="text-2xl font-extrabold text-accent">{formatPrice(total)}</span>
              </div>

              <Button
                size="lg"
                className="mt-5 w-full font-bold uppercase tracking-wide"
                onClick={() => {
                  expectedCarted.current = (carted ?? 0) + qty;
                  addItem(product.slug, qty);
                  toast.success(`${qty} × ${product.name} added to cart`);
                }}
              >
                Add to cart
              </Button>
            </div>
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
                  <img src={p.image} alt={p.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  <div className="flex items-center justify-between gap-3 p-5">
                    <h3 className="text-lg font-bold uppercase text-foreground">{p.name}</h3>
                    <span className="text-lg font-extrabold text-accent">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
