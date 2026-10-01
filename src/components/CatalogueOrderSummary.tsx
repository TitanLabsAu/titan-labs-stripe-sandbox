import { Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CryptoEstimate } from "@/components/CryptoEstimate";
import { useCart } from "@/lib/cart";
import { FREE_SHIPPING_THRESHOLD, shippingFor } from "@/lib/categories";
import { formatPrice } from "@/lib/products";
import { useProducts } from "@/lib/useCatalog";

export function CatalogueOrderSummary() {
  const {
    items,
    subtotal,
    setQuantity,
    removeItem,
    getLinePrice,
    getLineLabel,
  } = useCart();
  const { getProduct } = useProducts();
  const shipping = shippingFor(subtotal);
  const total = items.length ? subtotal + shipping : 0;

  return (
    <aside className="rounded-xl border border-border bg-card p-5 lg:sticky lg:top-5">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
        Order summary
      </h2>
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Nothing selected yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {items.map((item) => {
            const product = getProduct(item.slug);
            if (!product) return null;
            const price = getLinePrice(item);
            return (
              <li key={item.key} className="py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getLineLabel(item, product)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeItem(item.key)}
                    aria-label={`Remove ${product.name}`}
                  >
                    <X />
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 border-0"
                      onClick={() => setQuantity(item.key, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus />
                    </Button>
                    <span className="w-7 text-center text-xs font-semibold">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 border-0"
                      onClick={() => setQuantity(item.key, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatPrice(price * item.quantity)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping{shipping ? " (express)" : ""}</dt>
          <dd>
            {items.length && shipping === 0 ? "FREE" : formatPrice(shipping)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
      {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Spend {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free
          express shipping.
        </p>
      ) : null}
      <CryptoEstimate amountAud={subtotal} className="mt-4" />
      <Button
        asChild={items.length > 0}
        disabled={!items.length}
        className="mt-6 w-full"
      >
        {items.length ? (
          <Link to="/checkout">Go to checkout</Link>
        ) : (
          <span>Go to checkout</span>
        )}
      </Button>
    </aside>
  );
}
