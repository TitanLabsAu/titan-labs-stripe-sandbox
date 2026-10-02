import { Link, useRouterState } from "@tanstack/react-router";
import { Check, ChevronRight, Minus, Plus, ShoppingCart, Trash2, Wrench } from "lucide-react";
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
import {
  FreeShippingMeter,
  TitanStackBanner,
  TitanTrustStrip,
} from "@/components/CartExtras";
import { CryptoEstimate } from "@/components/CryptoEstimate";
import { useCart } from "@/lib/cart";
import { equipmentUpsellState } from "@/lib/cart-upsell";
import { formatPrice, sortedProductVariants } from "@/lib/products";
import { computeTotals } from "@/lib/pricing";
import { useProducts } from "@/lib/useCatalog";

export function CartSheet({ floating = false }: { floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const {
    items,
    count,
    subtotal,
    addItem,
    setQuantity,
    removeItem,
    getLinePrice,
    getLineLabel,
  } = useCart();
  const { getProduct } = useProducts();
  const bacWater = getProduct("bac-water");
  const bacWaterVariants = bacWater
    ? sortedProductVariants(bacWater).filter(
        (variant) => variant.id === "3ml" || variant.id === "10ml",
      )
    : [];

  const totals = computeTotals({
    subtotal,
    units: count,
    shippingMethod: "express",
    paymentMethod: "payid",
  });

  if (floating && count === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {floating ? (
          <Button
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-40 h-12 -translate-x-1/2 gap-3 border-accent bg-foreground px-5 text-background shadow-gold md:hidden"
            aria-label={`View cart with ${count} ${count === 1 ? "item" : "items"}`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span>View cart</span>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground">
              {count}
            </span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="titan-nav-icon relative"
            aria-label="View cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col border-l-primary/30 bg-background sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="uppercase tracking-wide">Your cart</SheetTitle>
          <SheetDescription>
            Review your items before checkout.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Your cart is empty.
            </p>
          ) : (
            <>
              <FreeShippingMeter amount={totals.itemsTotal} />

              <ul className="space-y-4">
                {items.map((item) => {
                  const product = getProduct(item.slug);
                  if (!product) return null;
                  const linePrice = getLinePrice(item);
                  return (
                    <li
                      key={item.key}
                      className="flex gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <img
                        src={product.image}
                        alt={product.alt}
                        className="brand-cut h-16 w-16 object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold uppercase text-foreground">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getLineLabel(item, product)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.key)}
                            aria-label={`Remove ${product.name}`}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatPrice(linePrice)} each
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                setQuantity(item.key, item.quantity - 1)
                              }
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
                              onClick={() =>
                                setQuantity(item.key, item.quantity + 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-extrabold text-accent">
                            {formatPrice(linePrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <section className="overflow-hidden rounded-lg border border-primary/35 bg-secondary/45">
                <Link
                  to="/range"
                  search={{ section: "equipment" }}
                  onClick={() => setOpen(false)}
                  aria-label="Need Equipment? Tap to browse the Equipment catalogue"
                  className="group flex w-full items-center gap-3 border-b border-primary/20 bg-primary/10 px-4 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring hover:bg-primary/20"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-background text-primary">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-black uppercase text-foreground">
                      Need Equipment? Tap to browse
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Or add BAC Water below before checkout.
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                </Link>

                {bacWater && bacWaterVariants.length > 0 ? (
                  <div className="divide-y divide-border">
                    {bacWaterVariants.map((variant) => {
                      const state = equipmentUpsellState(bacWater, variant.id, items);
                      const comingSoon = Boolean(bacWater.comingSoon || variant.comingSoon);
                      return (
                        <div
                          key={variant.id}
                          className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
                        >
                          <img
                            src={bacWater.image}
                            alt={bacWater.alt}
                            className="h-11 w-11 rounded-md border border-border bg-card object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold uppercase text-foreground">
                              BAC Water {variant.label}
                            </p>
                            <p className="text-xs font-semibold text-accent">
                              {formatPrice(state.option.unitPrice)} AUD
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={state.quantity > 0 ? "outline" : "default"}
                            className="h-8 min-w-[5.5rem] gap-1 px-2 text-[10px] font-bold uppercase"
                            disabled={!state.canAdd}
                            aria-label={`Add BAC Water ${variant.label} to cart`}
                            onClick={() =>
                              addItem(bacWater.slug, 1, {
                                variantId: variant.id,
                                variantLabel: variant.label,
                                pack: "single",
                              })
                            }
                          >
                            {comingSoon ? (
                              "Coming soon"
                            ) : state.unavailable ? (
                              "Out of stock"
                            ) : state.atMaximum ? (
                              "Stock max"
                            ) : state.quantity > 0 ? (
                              <>
                                <Check className="h-3.5 w-3.5" /> Added {state.quantity}
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" /> Add
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

              </section>

              <TitanStackBanner units={count} />
              <TitanTrustStrip />
            </>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(totals.subtotal)}</span>
            </div>
            {totals.stackDiscount > 0 ? (
              <div className="flex justify-between font-bold text-accent">
                <span>Titan Stack {totals.stackPercent}% off</span>
                <span>−{formatPrice(totals.stackDiscount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1">
              <span className="uppercase tracking-wide text-muted-foreground">
                Total
              </span>
              <span className="text-xl font-extrabold text-accent">
                {formatPrice(totals.itemsTotal)}{" "}
                <span className="text-xs font-bold text-muted-foreground">
                  AUD
                </span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Shipping chosen at checkout. Pay with crypto for another 10% off.
            </p>
            <CryptoEstimate amountAud={totals.itemsTotal} className="mt-3" />
          </div>
          <Button
            asChild={items.length > 0}
            disabled={items.length === 0}
            className="mt-4 w-full font-bold uppercase tracking-wide"
          >
            {items.length > 0 ? (
              <Link to="/checkout" onClick={() => setOpen(false)}>
                Checkout · {formatPrice(totals.itemsTotal)} AUD
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
