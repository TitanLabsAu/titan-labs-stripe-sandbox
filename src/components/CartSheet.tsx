import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useProducts } from "@/lib/useCatalog";

export function CartSheet() {
  const [open, setOpen] = useState(false);
  const { items, count, subtotal, setQuantity, removeItem } = useCart();
  const { getProduct } = useProducts();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="View cart">
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="uppercase tracking-wide">Your cart</SheetTitle>
          <SheetDescription>Review your items before checkout.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const product = getProduct(item.slug);
                if (!product) return null;
                return (
                  <li
                    key={item.slug}
                    className="flex gap-3 rounded-lg border border-border bg-card/60 p-3"
                  >
                    <img
                      src={product.image}
                      alt={product.alt}
                      className="h-16 w-16 rounded object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold uppercase text-foreground">
                          {product.name}
                        </p>
                        <button
                          onClick={() => removeItem(item.slug)}
                          aria-label={`Remove ${product.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(product.price)} each
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity(item.slug, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Increase quantity"
                            onClick={() => setQuantity(item.slug, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-extrabold text-accent">
                          {formatPrice(product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="uppercase tracking-wide text-muted-foreground">Total</span>
            <span className="text-xl font-extrabold text-accent">{formatPrice(subtotal)}</span>
          </div>
          <Button
            asChild={items.length > 0}
            disabled={items.length === 0}
            className="mt-4 w-full font-bold uppercase tracking-wide"
          >
            {items.length > 0 ? (
              <Link to="/checkout" onClick={() => setOpen(false)}>
                Proceed to checkout
              </Link>
            ) : (
              <span>Proceed to checkout</span>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
