import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AddressFields, type AddressValue } from "@/components/AddressFields";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { catalogueName } from "@/lib/homeContent";
import { FREE_SHIPPING_THRESHOLD, shippingFor } from "@/lib/categories";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Order Summary | Titan Labs Aus" },
      {
        name: "description",
        content: "Review your Titan Labs order and confirm your delivery details.",
      },
      { property: "og:title", content: "Order Summary | Titan Labs Aus" },
      {
        property: "og:description",
        content: "Review your Titan Labs order and confirm your delivery details.",
      },
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
  const { data: content } = useSiteContent();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState<AddressValue>({
    address_line: "",
    city: "",
    state: "",
    postcode: "",
  });

  const shipping = shippingFor(subtotal);
  const freeShipping = items.length > 0 && shipping === 0;
  const total = items.length > 0 ? subtotal + shipping : 0;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-10 sm:py-12">
        <h1 className="text-3xl font-medium uppercase sm:text-4xl">Order Summary</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirm your delivery details and review your order.
        </p>

        {items.length === 0 ? (
          <div className="mt-8 border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-6 font-bold uppercase">
              <Link to="/range">Browse {catalogueName(content)}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
            {/* Left: customer + delivery details */}
            <section className="border border-border bg-card p-6 shadow-sm sm:p-8 lg:col-span-7">
              <h2 className="technical-label text-foreground">Customer details</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
                    autoComplete="given-name"
                    value={firstName}
                    maxLength={80}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                    id="last_name"
                    autoComplete="family-name"
                    value={lastName}
                    maxLength={80}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    maxLength={160}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    maxLength={30}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <h2 className="technical-label mt-8 text-foreground">Delivery address</h2>
              <div className="mt-5">
                <AddressFields value={address} onChange={setAddress} />
              </div>

              <div className="mt-6 space-y-2">
                <Label htmlFor="notes">Delivery notes (optional)</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  maxLength={500}
                  placeholder="Leave at front door, safe drop instructions, etc."
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </section>

            {/* Right: order breakdown */}
            <aside className="border border-border bg-card p-6 shadow-sm sm:p-8 lg:col-span-5 lg:sticky lg:top-6">
              <h2 className="technical-label text-foreground">Your order</h2>
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
                        className="h-14 w-14 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold uppercase text-foreground">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getLineLabel(item, product)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatPrice(linePrice)}
                        </p>
                      </div>
                      <span className="shrink-0 font-extrabold text-accent">
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
                    Free express shipping applied — order over{" "}
                    {formatPrice(FREE_SHIPPING_THRESHOLD)}
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
                <p className="text-xs text-muted-foreground">All prices displayed in AUD.</p>
              </div>

              <Button size="lg" className="mt-6 w-full font-bold uppercase tracking-wide" disabled>
                Submit order
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Order submission is not active yet.
              </p>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
