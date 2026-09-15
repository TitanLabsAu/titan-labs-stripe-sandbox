import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart } from "@/lib/cart";
import { formatPrice, getProduct } from "@/lib/products";

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

const SHIPPING = 15;

function CheckoutPage() {
  const { items, subtotal } = useCart();
  const total = items.length > 0 ? subtotal + SHIPPING : 0;

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
              <Link to="/">Browse the range</Link>
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
                return (
                  <li key={item.slug} className="flex items-center gap-4 py-4">
                    <img
                      src={product.image}
                      alt={product.alt}
                      className="h-14 w-14 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-bold uppercase text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatPrice(product.price)}
                      </p>
                    </div>
                    <span className="font-extrabold text-accent">
                      {formatPrice(product.price * item.quantity)}
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
                <span>{formatPrice(SHIPPING)}</span>
              </div>
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
