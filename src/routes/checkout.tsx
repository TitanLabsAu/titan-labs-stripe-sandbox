import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
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
import { catalogueName, homeValue, termsVersion, type PaymentMethodKey } from "@/lib/homeContent";
import { ResearchAcknowledgement } from "@/components/ResearchAcknowledgement";
import { linkAcknowledgement, recordAcknowledgement } from "@/lib/acknowledgement";
import { submitOrder, saveOrderPaymentReference, type SubmittedOrder } from "@/lib/orders.functions";
import {
  createStripeSandboxPayment,
  verifyStripeSandboxPayment,
} from "@/lib/stripe.functions";
import { ShippingPicker, TitanStackBanner, TitanTrustStrip } from "@/components/CartExtras";
import {
  FREE_SHIPPING_THRESHOLD,
  computeTotals,
  type ShippingMethodKey,
} from "@/lib/pricing";

const stripePublishableKey =
  import.meta.env["VITE_STRIPE_PUBLISHABLE_KEY"];

const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

function StripePaymentForm({
  onPaid,
  onCancel,
  acknowledged,
}: {
  onPaid: (paymentIntentId: string) => void;
  onCancel: () => void;
  acknowledged: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handlePayment = async () => {
    if (!stripe || !elements || submitting) return;
    if (!acknowledged) {
      toast.error("Please tick the Research Use Acknowledgement to continue.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: submitError } =
        await elements.submit();

      if (submitError) {
        toast.error(
          submitError.message ??
            "Please check your payment details.",
        );
        return;
      }

      const { error, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/checkout`,
          },
          redirect: "if_required",
        });

      if (error) {
        toast.error(
          error.message ??
            "The card payment could not be completed.",
        );
        return;
      }

      if (!paymentIntent) {
        toast.error(
          "Stripe did not return the payment result.",
        );
        return;
      }

      if (paymentIntent.status === "succeeded") {
        onPaid(paymentIntent.id);
        return;
      }

      toast.error(
        `Payment status: ${paymentIntent.status}`,
      );
    } catch (error: any) {
      toast.error(
        error?.message ??
          "The card payment could not be completed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded border border-border bg-background p-4">
        <PaymentElement
          options={{
            layout: {
              type: "accordion",
              defaultCollapsed: false,
              radios: true,
              spacedAccordionItems: false,
            },
            paymentMethodOrder: ["card", "zip", "klarna"],
            wallets: { link: "never" },
          }}
        />
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full font-bold uppercase tracking-wide"
        disabled={!stripe || !elements || submitting || !acknowledged}
        onClick={handlePayment}
      >
        {submitting
          ? "Processing payment…"
          : "Pay securely with Stripe"}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full font-bold uppercase"
        disabled={submitting}
        onClick={onCancel}
      >
        Cancel card payment
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Payment details are securely handled by Stripe.
      </p>
    </div>
  );
}
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
  const { items, count, subtotal, getLinePrice, getLineLabel, clear } = useCart();
  const { getProduct } = useProducts();
  const { data: content } = useSiteContent();
  const submit = useServerFn(submitOrder);
  const saveReference = useServerFn(saveOrderPaymentReference);
  const createStripePayment =
  useServerFn(createStripeSandboxPayment);

const verifyStripePayment =
  useServerFn(verifyStripeSandboxPayment);

const [stripeClientSecret, setStripeClientSecret] =
  useState<string | null>(null);

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
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodKey>("express");
  const [address, setAddress] = useState<AddressValue>({
    address_line: "",
    city: "",
    state: "",
    postcode: "",
  });
  const [confirmed, setConfirmed] = useState<SubmittedOrder | null>(null);
  const [reference, setReference] = useState("");
  const [referenceSaved, setReferenceSaved] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const ackVersion = termsVersion(content);

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

  const cardCheckoutData = () => ({
    firstName,
    lastName,
    email,
    phone,
    addressLine: address.address_line,
    city: address.city,
    state: address.state,
    postcode: address.postcode,
    notes,
    shippingMethod,
    items: items.map((i) => ({
      slug: i.slug,
      variantId: i.variantId ?? null,
      pack: i.pack ?? "single",
      quantity: i.quantity,
    })),
  });
const verifyStripeCardPayment = useMutation({
  mutationFn: (paymentIntentId: string) =>
    verifyStripePayment({
      data: { paymentIntentId },
    }),

  onSuccess: (result) => {
    setConfirmed(result);
    setStripeClientSecret(null);
    clear();
    void linkAcknowledgement(result.id);

    toast.success(
      `Payment approved — order ${result.reference} confirmed`,
    );

    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/checkout");
    }
  },

  onError: (error: any) =>
    toast.error(
      error?.message ??
        "We could not verify the Stripe payment.",
    ),
});

  /*
   * Redirect-based payment methods (Zip, Klarna) send the
   * customer back to /checkout with Stripe's query params.
   * We ignore redirect_status entirely — the server-side
   * verification against Stripe is the only source of truth.
   */
  const runStripeReturn = verifyStripeCardPayment.mutate;
  const stripeReturnHandled = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (stripeReturnHandled.current) return;

    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get("payment_intent");
    if (!paymentIntentId) return;

    stripeReturnHandled.current = true;

    params.delete("payment_intent");
    params.delete("payment_intent_client_secret");
    params.delete("redirect_status");
    const rest = params.toString();
    window.history.replaceState(
      {},
      "",
      rest ? `/checkout?${rest}` : "/checkout",
    );

    runStripeReturn(paymentIntentId);
  }, [runStripeReturn]);

const startStripeCardPayment = useMutation({
  mutationFn: async () => {
    if (!acknowledged) {
      throw new Error("Please tick the Research Use Acknowledgement to continue.");
    }
    // Acknowledgement is recorded before any payment is initiated.
    await recordAcknowledgement(ackVersion);
    return createStripePayment({
      data: cardCheckoutData(),
    });
  },

  onSuccess: ({ clientSecret }) => {
    setStripeClientSecret(clientSecret);
  },

  onError: (error: any) =>
    toast.error(
      error?.message ??
        "Could not start the Stripe payment.",
    ),
});
  
  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!acknowledged) {
        throw new Error("Please tick the Research Use Acknowledgement to continue.");
      }
      await recordAcknowledgement(ackVersion);
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
          paymentMethod: method === "crypto" ? "crypto" : "payid",
          shippingMethod,
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
      void linkAcknowledgement(result.id);
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
              {confirmed.paymentMethod === "card"
                ? "Your card payment was approved and verified with Stripe. Your order is confirmed."
                : homeValue(content, "payment_confirmation_note")}
            </p>

            <h2 className="technical-label mt-8 text-foreground">Payment details</h2>
            <PaymentDetails
              method={confirmed.paymentMethod}
              content={content}
              reference={confirmed.reference}
              amountAud={confirmed.total}
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

              <h2 className="technical-label mt-8 text-foreground">Shipping method</h2>
              <div className="mt-4">
                <ShippingPicker
                  value={shippingMethod}
                  onChange={setShippingMethod}
                  freeShipping={freeShipping}
                />
              </div>

              <h2 className="technical-label mt-8 text-foreground">Payment method</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                {homeValue(content, "payment_intro")}
              </p>
              <div className="mt-4">
                <PaymentMethodPicker value={method} onChange={setMethod} content={content} />
              </div>
              <ResearchAcknowledgement
                className="mt-4"
                checked={acknowledged}
                onChange={setAcknowledged}
                disabled={Boolean(stripeClientSecret)}
              />
             {method === "card" ? (
  <div className="mt-4">
    {!stripeClientSecret ? (
      <div className="rounded border border-border bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Pay securely by card using Stripe.
        </p>

        <Button
          type="button"
          className="mt-4 w-full font-bold uppercase"
          disabled={
            startStripeCardPayment.isPending ||
            !stripePromise ||
            !acknowledged
          }
          onClick={() =>
            startStripeCardPayment.mutate()
          }
        >
          {startStripeCardPayment.isPending
            ? "Connecting securely…"
            : "Continue to secure payment"}
        </Button>

        {!stripePromise ? (
          <p className="mt-3 text-xs text-destructive">
            Secure card payments are not currently available.
          </p>
        ) : null}
      </div>
    ) : stripePromise ? (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: stripeClientSecret,
          appearance: {
            theme: "stripe",
          },
        }}
      >
        <StripePaymentForm
          onPaid={(paymentIntentId) =>
            verifyStripeCardPayment.mutate(
              paymentIntentId,
            )
          }
          onCancel={() =>
            setStripeClientSecret(null)
          }
          acknowledged={acknowledged}
        />
      </Elements>
    ) : null}
  </div>
) : (
  <PaymentDetails
    method={method}
    content={content}
    amountAud={totals.total}
    className="mt-4"
  />
)}
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

              <div className="mt-6">
                <p className="technical-label text-foreground">The Titan Stack</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  2 items = 10% off · 3 items = 15% off · 4 items = 20% off
                </p>
                <div className="mt-3">
                  <TitanStackBanner units={count} />
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
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
                {totals.cryptoDiscount > 0 ? (
                  <div className="flex justify-between font-bold text-accent">
                    <span>Crypto payment {totals.cryptoPercent}% off</span>
                    <span>−{formatPrice(totals.cryptoDiscount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {shippingMethod === "standard" ? "Standard tracked" : "Express + insurance"}{" "}
                    shipping
                  </span>
                  {freeShipping ? (
                    <span className="font-bold uppercase text-accent">Free</span>
                  ) : (
                    <span>{formatPrice(totals.shipping)}</span>
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
                  <span className="text-2xl font-extrabold text-accent">
                    {formatPrice(totals.total)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">All prices displayed in AUD.</p>
              </div>

              <div className="mt-5 border-t border-border pt-5">
                <TitanTrustStrip />
              </div>

             {session ? (
  method === "card" ? (
    <p className="mt-6 text-center text-xs text-muted-foreground">
      Complete your secure Stripe payment in the payment section.
    </p>
  ) : (
    <>
      <Button
        size="lg"
        className="mt-6 w-full font-bold uppercase tracking-wide"
        disabled={placeOrder.isPending || !acknowledged}
        onClick={() => placeOrder.mutate()}
      >
        {placeOrder.isPending
          ? "Submitting…"
          : "Submit order"}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {acknowledged
          ? "No payment is taken on this website."
          : "Tick the Research Use Acknowledgement to submit your order."}
      </p>
    </>
  )
) : (
  <>
    <Button
      asChild
      size="lg"
      className="mt-6 w-full font-bold uppercase tracking-wide"
    >
      <Link to="/auth">
        Log in to submit your order
      </Link>
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
