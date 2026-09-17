import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useProducts } from "@/lib/useCatalog";
import { FREE_SHIPPING_THRESHOLD, shippingFor } from "@/lib/categories";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | Titan Labs Aus" },
      { name: "description", content: "Review your Titan Labs order and complete your payment." },
      { property: "og:title", content: "Checkout | Titan Labs Aus" },
      { property: "og:description", content: "Review your Titan Labs order and complete payment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, getLinePrice, getLineLabel } = useCart();
  const { getProduct } = useProducts();
  const shipping = shippingFor(subtotal);
  const freeShipping = items.length > 0 && shipping === 0;
  const total = items.length > 0 ? subtotal + shipping : 0;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24">
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-foreground">
          Checkout
        </h1>

        {items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card/70 p-8 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-6 font-bold uppercase">
              <Link to="/range">Browse the range</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-border bg-card/70 p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-accent">
              Order summary
            </h2>
            <ul className="mt-5 divide-y divide-border">
              {items.map((item) => {
                const product = getProduct(item.slug);
                if (!product) return null;
                const linePrice = getLinePrice(item);
                return (
                  <li key={item.key} className="flex items-center gap-4 py-4">
                    <img
                      src={product.image}
                      alt={product.alt}
                      className="h-14 w-14 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-bold uppercase text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{getLineLabel(item, product)}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatPrice(linePrice)}
                      </p>
                    </div>
                    <span className="font-extrabold text-accent">
                      {formatPrice(linePrice * item.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Express shipping</span>
                {freeShipping ? (
                  <span className="font-bold uppercase text-accent">Free</span>
                ) : (
                  <span>{formatPrice(shipping)}</span>
                )}
              </div>
              {freeShipping ? (
                <p className="text-xs font-bold uppercase tracking-wide text-accent">
                  Free express shipping applied — order over {formatPrice(FREE_SHIPPING_THRESHOLD)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Spend {formatPrice(remaining)} more for free express shipping.
                </p>
              )}
              <div className="flex items-center justify-between pt-2 text-base">
                <span className="font-bold uppercase tracking-wide text-foreground">Total</span>
                <span className="text-2xl font-extrabold text-accent">{formatPrice(total)}</span>
              </div>
            </div>

            <Button size="lg" className="mt-6 w-full font-bold uppercase tracking-wide" disabled>
              Pay {formatPrice(total)}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Payments are being set up — confirm your payment provider and this button goes live.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
