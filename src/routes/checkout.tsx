import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AddressFields, type AddressValue } from "@/components/AddressFields";
import { PaymentDetails, PaymentMethodPicker } from "@/components/PaymentDetails";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { catalogueName, homeValue, type PaymentMethodKey } from "@/lib/homeContent";
import { submitOrder, saveOrderPaymentReference, type SubmittedOrder } from "@/lib/orders.functions";
import { ShippingPicker, TitanStackBanner, TitanTrustStrip } from "@/components/CartExtras";
import {
  FREE_SHIPPING_THRESHOLD,
  computeTotals,
  type ShippingMethodKey,
} from "@/lib/pricing";

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
  const { items, subtotal, getLinePrice, getLineLabel, clear } = useCart();
  const { getProduct } = useProducts();
  const { data: content } = useSiteContent();
  const submit = useServerFn(submitOrder);
  const saveReference = useServerFn(saveOrderPaymentReference);

  const { data: session } = useQuery({
    queryKey: ["checkout-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethodKey>("payid");
  const [address, setAddress] = useState<AddressValue>({
    address_line: "",
    city: "",
    state: "",
    postcode: "",
  });
  const [confirmed, setConfirmed] = useState<SubmittedOrder | null>(null);
  const [reference, setReference] = useState("");
  const [referenceSaved, setReferenceSaved] = useState(false);

  // Pre-fill from the saved profile once we know who is signed in.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("first_name, last_name, email, phone_number, address_line, city, state, postcode")
      .eq("id", session.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setFirstName((v) => v || data.first_name || "");
        setLastName((v) => v || data.last_name || "");
        setEmail((v) => v || data.email || session.email || "");
        setPhone((v) => v || data.phone_number || "");
        setAddress((v) =>
          v.address_line
            ? v
            : {
                address_line: data.address_line ?? "",
                city: data.city ?? "",
                state: data.state ?? "",
                postcode: data.postcode ?? "",
              },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const totals = computeTotals({
    subtotal,
    units: count,
    shippingMethod,
    paymentMethod: method,
  });
  const freeShipping = items.length > 0 && totals.shipping === 0;
  const remaining = totals.remainingForFreeShipping;

  const placeOrder = useMutation({
    mutationFn: async () => {
      const result = await submit({
        data: {
          firstName,
          lastName,
          email,
          phone,
          addressLine: address.address_line,
          city: address.city,
          state: address.state,
          postcode: address.postcode,
          notes,
          paymentMethod: method,
          items: items.map((i) => ({
            slug: i.slug,
            variantId: i.variantId ?? null,
            pack: i.pack ?? "single",
            quantity: i.quantity,
          })),
        },
      });
      return result;
    },
    onSuccess: (result) => {
      setConfirmed(result);
      clear();
      toast.success(`Order ${result.reference} received`);
    },
    onError: (error: any) =>
      toast.error(error?.message ?? "We could not submit that order. Please try again."),
  });

  const submitReference = useMutation({
    mutationFn: () =>
      saveReference({ data: { orderId: confirmed!.id, reference } }),
    onSuccess: () => {
      setReferenceSaved(true);
      toast.success("Thanks — we'll confirm your payment shortly.");
    },
    onError: (error: any) => toast.error(error?.message ?? "Could not save that reference."),
  });

  if (confirmed) {
    return (
      <div className="bg-hero min-h-screen">
        <SiteHeader />
        <main className="page-shell py-10 sm:py-12">
          <div className="mx-auto max-w-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 text-accent" />
              <h1 className="text-2xl font-medium uppercase sm:text-3xl">Order received</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Your order number is{" "}
              <span className="font-bold text-foreground">{confirmed.reference}</span>. Order total{" "}
              <span className="font-bold text-foreground">{formatPrice(confirmed.total)}</span>.
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {homeValue(content, "payment_confirmation_note")}
            </p>

            <h2 className="technical-label mt-8 text-foreground">Payment details</h2>
            <PaymentDetails
              method={confirmed.paymentMethod}
              content={content}
              reference={confirmed.reference}
              className="mt-3"
            />

            {confirmed.paymentMethod === "crypto" ? (
              <div className="mt-6 space-y-2">
                <Label htmlFor="tx">Transaction hash</Label>
                <Input
                  id="tx"
                  value={reference}
                  maxLength={160}
                  placeholder="Paste your transaction hash"
                  onChange={(e) => setReference(e.target.value)}
                  disabled={referenceSaved}
                />
                <Button
                  className="font-bold uppercase"
                  disabled={referenceSaved || submitReference.isPending}
                  onClick={() => submitReference.mutate()}
                >
                  {referenceSaved ? "Saved" : "Complete order"}
                </Button>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="outline" className="font-bold uppercase">
                <Link to="/orders">View my orders</Link>
              </Button>
              <Button asChild className="font-bold uppercase">
                <Link to="/range">Keep shopping</Link>
              </Button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

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

              <h2 className="technical-label mt-8 text-foreground">Payment method</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                {homeValue(content, "payment_intro")}
              </p>
              <div className="mt-4">
                <PaymentMethodPicker value={method} onChange={setMethod} content={content} />
              </div>
              <PaymentDetails method={method} content={content} className="mt-4" />
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

              {session ? (
                <>
                  <Button
                    size="lg"
                    className="mt-6 w-full font-bold uppercase tracking-wide"
                    disabled={placeOrder.isPending}
                    onClick={() => placeOrder.mutate()}
                  >
                    {placeOrder.isPending ? "Submitting…" : "Submit order"}
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    No payment is taken on this website.
                  </p>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="mt-6 w-full font-bold uppercase tracking-wide">
                    <Link to="/auth">Log in to submit your order</Link>
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Your cart is saved while you log in.
                  </p>
                </>
              )}
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
