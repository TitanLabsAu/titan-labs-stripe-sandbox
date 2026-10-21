import { cmsValues } from "@/lib/storefrontContent";
import { cancelAndRefreshQuote, isVerifiedQuote } from "@/lib/checkout-quote-refresh";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { getStripePublicConfig } from "@/lib/stripe-config.functions";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AddressFields, type AddressValue } from "@/components/AddressFields";
import {
  PaymentDetails,
  PaymentMethodPicker,
} from "@/components/PaymentDetails";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import {
  catalogueName,
  homeValue,
  termsVersion,
  type PaymentMethodKey,
} from "@/lib/homeContent";
import { ResearchAcknowledgement } from "@/components/ResearchAcknowledgement";
import { FirstOfferBanner } from "@/components/FirstOfferBanner";
import {
  quoteCheckoutAny,
  recordCheckoutAcknowledgement,
  startGuestCheckout,
  getGuestCheckoutStatus,
} from "@/lib/checkout.functions";
import { checkoutErrorCode, checkoutErrorText, type CheckoutMode } from "@/lib/guest-capability";
import {
  submitOrder,
  saveOrderPaymentReference,
  type SubmittedOrder,
} from "@/lib/orders.functions";
import {
  cancelStripeCheckout,
  createStripeSandboxPayment,
  verifyStripeSandboxPayment,
} from "@/lib/stripe.functions";
import {
  ShippingPicker,
  TitanStackBanner,
  TitanTrustStrip,
} from "@/components/CartExtras";
import {
  FREE_SHIPPING_THRESHOLD,
  type ShippingMethodKey,
} from "@/lib/pricing";
import { clubLabel, quoteOrder } from "@/lib/order-pricing";

const MODE_KEY = "titan_checkout_mode";
import { cartPriceLines, useReferralSettings } from "@/lib/useReferralSettings";

// Publishable key is looked up at runtime (mode-checked against the secret key on the server).
const stripePromiseCache = new Map<string, ReturnType<typeof loadStripe>>();
function stripePromiseFor(key: string) {
  let p = stripePromiseCache.get(key);
  if (!p) {
    p = loadStripe(key);
    stripePromiseCache.set(key, p);
  }
  return p;
}

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
      const { error: submitError } = await elements.submit();

      if (submitError) {
        toast.error(
          submitError.message ?? "Please check your payment details.",
        );
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(
          error.message ?? "The card payment could not be completed.",
        );
        return;
      }

      if (!paymentIntent) {
        toast.error("Stripe did not return the payment result.");
        return;
      }

      if (paymentIntent.status === "succeeded") {
        onPaid(paymentIntent.id);
        return;
      }

      toast.error(`Payment status: ${paymentIntent.status}`);
    } catch (error: any) {
      toast.error(error?.message ?? "The card payment could not be completed.");
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
        {submitting ? "Processing payment…" : "Pay securely with Stripe"}
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
        content:
          "Review your Titan Labs order and confirm your delivery details.",
      },
      { property: "og:title", content: "Order Summary | Titan Labs Aus" },
      {
        property: "og:description",
        content:
          "Review your Titan Labs order and confirm your delivery details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const copy = cmsValues(useSiteContent().data, "checkout_copy");
  const { items, count, subtotal, getLinePrice, getLineLabel, clear } =
    useCart();
  const { getProduct } = useProducts();
  const { data: content } = useSiteContent();
  const submit = useServerFn(submitOrder);
  const saveReference = useServerFn(saveOrderPaymentReference);
  const createStripePayment = useServerFn(createStripeSandboxPayment);

  const verifyStripePayment = useServerFn(verifyStripeSandboxPayment);
  const cancelStripe = useServerFn(cancelStripeCheckout);
  const recordAck = useServerFn(recordCheckoutAcknowledgement);
  const startGuest = useServerFn(startGuestCheckout);
  const guestStatus = useServerFn(getGuestCheckoutStatus);
  const fetchStripeConfig = useServerFn(getStripePublicConfig);
  const { data: stripeConfig } = useQuery({
    queryKey: ["stripe-public-config"],
    queryFn: () => fetchStripeConfig(),
    staleTime: 60_000,
  });
  const stripePromise = stripeConfig?.ok ? stripePromiseFor(stripeConfig.publishableKey) : null;
  const [stripeIntentId, setStripeIntentId] = useState<string | null>(null);
  const [guestMode, setGuestModeState] = useState(false);
  const [authLost, setAuthLost] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const setGuestMode = (v: boolean) => {
    setGuestModeState(v);
    try {
      if (v) window.sessionStorage.setItem(MODE_KEY, "guest");
      else window.sessionStorage.removeItem(MODE_KEY);
    } catch {
      /* storage unavailable */
    }
  };
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(MODE_KEY) === "guest") setGuestModeState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null,
  );
  // Key returned with the PaymentIntent, so the form never uses a stale cached key.
  const [intentPublishableKey, setIntentPublishableKey] = useState<string | null>(null);
  const intentStripePromise = intentPublishableKey ? stripePromiseFor(intentPublishableKey) : stripePromise;

  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ["checkout-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });
  const wasMember = useRef(false);
  useEffect(() => {
    if (session) {
      wasMember.current = true;
      setAuthLost(false);
      setGuestMode(false); // a signed-in member always checks out as a member
    }
  }, [session]);
  // React to sign-in / sign-out / expiry straight away; never downgrade silently.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && wasMember.current) {
        wasMember.current = false;
        setAuthLost(true);
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void refetchSession();
    });
    return () => sub.subscription.unsubscribe();
  }, [refetchSession]);
  const mode: CheckoutMode | null = session ? "member" : guestMode ? "guest" : null;

  /** Turns server auth/capability errors into an actionable next step. */
  const handleCheckoutError = async (error: unknown, fallback: string) => {
    const code = checkoutErrorCode(error);
    if (code === "AUTH_EXPIRED") {
      const { data } = await supabase.auth.refreshSession();
      if (data.session) {
        await refetchSession();
        toast.message("Your login was refreshed. Please try again.");
        return;
      }
      wasMember.current = false;
      setAuthLost(true);
      await refetchSession();
    } else if (code === "GUEST_SESSION_INVALID") {
      setGuestMode(false);
      setGuestError(checkoutErrorText(error, "Your guest checkout session has expired. Please choose Continue as guest again."));
    }
    const text = checkoutErrorText(error, fallback);
    // Server repriced (e.g. member benefit changed): refresh the summary before any payment is created.
    if (/order summary has been updated/i.test(text)) void serverQuote.refetch();
    toast.error(text);
  };

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethodKey>("card");
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethodKey>("express");
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
      .select(
        "first_name, last_name, email, phone_number, address_line, city, state, postcode",
      )
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

  const { settings } = useReferralSettings();
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [creditUnits, setCreditUnits] = useState(0);
  const runQuote = useServerFn(quoteCheckoutAny);
  const quoteItems = items.map((i) => ({
    slug: i.slug,
    variantId: i.variantId ?? null,
    pack: i.pack ?? "single",
    quantity: i.quantity,
  }));
  const quotePayment: "card" | "payid" | "wise" | "crypto" =
    method === "crypto" ? "crypto" : method === "card" ? "card" : method === "wise" ? "wise" : "payid";
  const quoteEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? email.trim().toLowerCase() : "";
  const serverQuote = useQuery({
    queryKey: ["checkout-quote", mode, session?.id, JSON.stringify(quoteItems), shippingMethod, quotePayment, appliedCode, creditUnits, quoteEmail],
    queryFn: () =>
      runQuote({
        data: { mode: mode ?? "member", items: quoteItems, shippingMethod, paymentMethod: quotePayment, code: appliedCode, creditUnits: session ? creditUnits : 0, contactEmail: quoteEmail },
      }),
    enabled: Boolean(mode) && items.length > 0,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const queryClient = useQueryClient();
  const [cancellingPayment, setCancellingPayment] = useState(false);
  const quoteReady = !mode || isVerifiedQuote(serverQuote);
  const localQuote = quoteOrder(
    { lines: cartPriceLines(items, getProduct, getLinePrice), shippingMethod, paymentMethod: quotePayment },
    settings,
  );
  useEffect(() => {
    if (serverQuote.error) void handleCheckoutError(serverQuote.error, "We couldn't price your order.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverQuote.error]);
  const quote = mode && serverQuote.data ? serverQuote.data.quote : localQuote;
  const codeError = serverQuote.data?.codeError ?? null;
  const availableCredit = serverQuote.data?.availableCreditUnits ?? 0;
  const maxCredit = Math.min(serverQuote.data?.maxCreditUnits ?? settings.maxCreditUnits, availableCredit);
  useEffect(() => {
    if (creditUnits > maxCredit && serverQuote.data) setCreditUnits(Math.max(0, maxCredit));
  }, [creditUnits, maxCredit, serverQuote.data]);
  useEffect(() => {
    if (codeError && appliedCode) toast.error(codeError);
  }, [codeError, appliedCode]);
  const totals = {
    subtotal: quote.itemsCents / 100,
    shipping: quote.shippingCents / 100,
    total: quote.totalCents / 100,
  };
  void subtotal;
  void count;
  const freeShipping = items.length > 0 && quote.shippingCents === 0;
  const clubFreeShipping = items.length > 0 && Boolean(quote.clubFreeShipping);
  const remaining = quote.remainingForFreeShippingCents / 100;
  const pricingExtras = () => ({
    code: appliedCode && !codeError ? appliedCode : null,
    creditUnits: quote.creditUnits,
    ...(serverQuote.data && !serverQuote.isPlaceholderData && !serverQuote.isFetching
      ? { expectedTotalCents: serverQuote.data.quote.totalCents }
      : {}),
  });

  const cardCheckoutData = (acknowledgementId: string) => ({
    mode: mode ?? "member",
    acknowledgementId,
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
    ...pricingExtras(),
  });
  const verifyStripeCardPayment = useMutation({
    mutationFn: (args: { paymentIntentId: string; mode: CheckoutMode }) =>
      verifyStripePayment({ data: args }),

    onSuccess: (result) => {
      setConfirmed(result);
      setStripeClientSecret(null);
      setStripeIntentId(null);
      clear();

      toast.success(`Payment approved — order ${result.reference} confirmed`);

      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/checkout");
      }
    },

    onError: (error: any) => void handleCheckoutError(error, "We could not verify the Stripe payment."),
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

    const returnMode: CheckoutMode = (() => {
      try {
        return window.sessionStorage.getItem(MODE_KEY) === "guest" ? "guest" : "member";
      } catch {
        return "member";
      }
    })();
    runStripeReturn({ paymentIntentId, mode: returnMode });
  }, [runStripeReturn]);

  const startStripeCardPayment = useMutation({
    mutationFn: async () => {
      if (!acknowledged) {
        throw new Error(
          "Please tick the Research Use Acknowledgement to continue.",
        );
      }
      if (!mode) throw new Error("Please log in, join, or choose Continue as guest.");
      // Acknowledgement is recorded server side before any payment is initiated.
      const { ackId } = await recordAck({ data: { version: ackVersion, mode } });
      return createStripePayment({
        data: { ...cardCheckoutData(ackId), ...(stripeConfig?.ok ? { expectedStripeMode: stripeConfig.mode } : {}) },
      });
    },

    onSuccess: ({ clientSecret, paymentIntentId, publishableKey }) => {
      setIntentPublishableKey(publishableKey);
      setStripeClientSecret(clientSecret);
      setStripeIntentId(paymentIntentId);
    },

    onError: (error: any) => void handleCheckoutError(error, "Could not start the Stripe payment."),
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!acknowledged) {
        throw new Error(
          "Please tick the Research Use Acknowledgement to continue.",
        );
      }
      if (!mode) throw new Error("Please log in, join, or choose Continue as guest.");
      const { ackId } = await recordAck({ data: { version: ackVersion, mode } });
      const result = await submit({
        data: {
          mode,
          acknowledgementId: ackId,
          firstName,
          lastName,
          email,
          phone,
          addressLine: address.address_line,
          city: address.city,
          state: address.state,
          postcode: address.postcode,
          notes,
          paymentMethod: method === "crypto" ? "crypto" : method === "wise" ? "wise" : "payid",
          shippingMethod,
          items: items.map((i) => ({
            slug: i.slug,
            variantId: i.variantId ?? null,
            pack: i.pack ?? "single",
            quantity: i.quantity,
          })),
          ...pricingExtras(),
        },
      });
      return result;
    },
    onSuccess: (result) => {
      setConfirmed(result);
      clear();
      toast.success(`Order ${result.reference} received`);
    },
    onError: (error: any) => void handleCheckoutError(error, "We could not submit that order. Please try again."),
  });

  const [startingGuest, setStartingGuest] = useState(false);
  const chooseGuest = async () => {
    setStartingGuest(true);
    setGuestError(null);
    try {
      await startGuest();
      const res = await guestStatus();
      if (!res?.active) {
        // The server issued the cookie but the browser didn't send it back
        // (e.g. cookies blocked or the shop is embedded in another site).
        setGuestError(
          "Your browser didn't keep the guest checkout session. Allow cookies for this site, or open the shop directly in its own tab, then try again.",
        );
        return;
      }
      setGuestMode(true);
      setAuthLost(false);
    } catch (error: any) {
      const msg = error?.message ?? "We couldn't start a guest checkout.";
      setGuestError(msg);
      toast.error(msg);
    } finally {
      setStartingGuest(false);
    }
  };

  const submitReference = useMutation({
    mutationFn: () =>
      saveReference({ data: { orderId: confirmed!.id, reference, mode: confirmed?.guest ? "guest" : "member" } }),
    onSuccess: () => {
      setReferenceSaved(true);
      toast.success("Thanks — we'll confirm your payment shortly.");
    },
    onError: (error: any) =>
      toast.error(error?.message ?? "Could not save that reference."),
  });

  if (confirmed) {
    return (
      <div className="bg-hero min-h-screen">
        <SiteHeader />
        <main className="page-shell py-8 sm:py-12">
          <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 text-accent" />
              <h1 className="font-display text-2xl font-black uppercase tracking-[0.08em] sm:text-3xl">
                Order received
              </h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Your order number is{" "}
              <span className="font-bold text-foreground">
                {confirmed.reference}
              </span>
              . Order total{" "}
              <span className="font-bold text-foreground">
                {formatPrice(confirmed.total)}
              </span>
              .
            </p>
            {confirmed.guest ? (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="whitespace-pre-line">{copy.guest_confirmed_note}</span>
              </p>
            ) : null}
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {confirmed.paymentMethod === "card"
                ? "Your card payment was approved and verified with Stripe. Your order is confirmed."
                : homeValue(content, "payment_confirmation_note")}
            </p>

            <h2 className="technical-label mt-8 text-foreground">
              Payment details
            </h2>
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
              {confirmed.guest ? null : (
                <Button asChild variant="outline" className="font-bold uppercase">
                  <Link to="/orders">View my orders</Link>
                </Button>
              )}
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
      <main className="page-shell py-8 sm:py-12">
        <TitanPageHeading
          as="h1"
          icon={ShoppingBag}
          eyebrow="Review · Confirm · Complete"
          title="Order summary"
        />
        {copy.intro ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{copy.intro}</p> : null}
        <FirstOfferBanner className="mt-4" />
        {authLost && !session ? (
          <div role="alert" className="mt-4 border border-destructive/60 bg-destructive/10 p-4 text-sm">
            <p className="font-bold text-foreground">Your login has expired.</p>
            <p className="mt-1 text-muted-foreground">
              Sign in again to keep your member rewards, or choose to continue as a guest.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" className="font-bold uppercase">
                <a href="/auth?redirect=%2Fcheckout">Sign in again</a>
              </Button>
              <Button size="sm" variant="outline" className="font-bold uppercase" onClick={() => void chooseGuest()}>
                Continue as guest
              </Button>
            </div>
          </div>
        ) : null}
        {guestError && !session ? (
          <div role="alert" data-testid="guest-error" className="mt-4 border border-destructive/60 bg-destructive/10 p-4 text-sm">
            <p className="font-bold text-foreground">Guest checkout couldn't start.</p>
            <p className="mt-1 text-muted-foreground">{guestError}</p>
          </div>
        ) : null}
        {mode === "guest" ? (
          <div role="status" data-testid="guest-active" className="mt-4 border border-primary/60 bg-primary/10 p-4 text-sm">
            <p className="font-bold text-foreground">{copy.guest_active_title}</p>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">
              {String(copy.guest_active_body).split("{login}").map((part: string, i: number) => (
                <span key={i}>{i > 0 ? <a className="underline" href="/auth?redirect=%2Fcheckout">{copy.login_label}</a> : null}{part}</span>
              ))}
            </p>
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-6 font-bold uppercase">
              <Link to="/range">Browse {catalogueName(content)}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
            {/* Left: customer + delivery details */}
            <section className="rounded-xl border border-border bg-card p-6 sm:p-8 lg:col-span-7">
              <h2 className="technical-label text-foreground">
                Customer details
              </h2>

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

              <h2 className="technical-label mt-8 text-foreground">
                Delivery address
              </h2>
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

              <h2 className="technical-label mt-8 text-foreground">
                Shipping method
              </h2>
              <div className="mt-4">
                <ShippingPicker
                  value={shippingMethod}
                  onChange={setShippingMethod}
                  freeShipping={freeShipping}
                  club={clubFreeShipping}
                />
              </div>

              <h2 className="technical-label mt-8 text-foreground">
                Payment method
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                {homeValue(content, "payment_intro")}
              </p>
              <div className="mt-4">
                <PaymentMethodPicker
                  value={method}
                  onChange={setMethod}
                  content={content}
                />
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
                          !acknowledged ||
                          !quoteReady || cancellingPayment ||
                          !mode
                        }
                        onClick={() => startStripeCardPayment.mutate()}
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
                      stripe={intentStripePromise}
                      options={{
                        clientSecret: stripeClientSecret,
                        appearance: {
                          theme: "stripe",
                        },
                      }}
                    >
                      <StripePaymentForm
                        onPaid={(paymentIntentId) =>
                          verifyStripeCardPayment.mutate({ paymentIntentId, mode: mode ?? "member" })
                        }
                        onCancel={() => {
                          const id = stripeIntentId;
                          if (!id || !mode || cancellingPayment) return;
                          setCancellingPayment(true);
                          void cancelAndRefreshQuote({
                            cancel: () => cancelStripe({ data: { paymentIntentId: id, mode } }),
                            clear: () => { setStripeClientSecret(null); setStripeIntentId(null); },
                            refresh: async () => {
                              await queryClient.invalidateQueries({ queryKey: ["cart-member-quote"] });
                              await queryClient.invalidateQueries({ queryKey: ["checkout-quote"] });
                            },
                          }).catch(() => toast.error("Payment cancellation could not be confirmed. Your offer remains reserved; please try again."))
                            .finally(() => setCancellingPayment(false));
                        }}
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
            <aside className="rounded-xl border border-border bg-card p-6 sm:p-8 lg:col-span-5 lg:sticky lg:top-6">
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
                <p className="technical-label text-foreground">
                  The Titan Stack
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {settings.multibuyTiers.map((t) => `${t.units} Range items = ${t.percent}% off`).join(" · ")}
                  {` · pens and equipment don't count · multi-buy, kit and crypto savings combined are capped at ${settings.combinedCapPercent}%`}
                </p>
                <div className="mt-3">
                  <TitanStackBanner units={quote.multibuyUnits} />
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-border pt-4">
                <p className="technical-label text-foreground">Code &amp; referral rewards</p>
                {mode ? (
                  <>
                    {appliedCode && !codeError ? (
                      <div className="flex items-center justify-between rounded border border-accent/50 bg-accent/10 px-3 py-2 text-sm">
                        <span className="font-bold uppercase tracking-wide">{appliedCode}</span>
                        <Button type="button" variant="ghost" size="sm" disabled={Boolean(stripeClientSecret)} onClick={() => { setAppliedCode(null); setCodeInput(""); }}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const c = codeInput.trim().toUpperCase();
                          if (c) setAppliedCode(c);
                        }}
                      >
                        <Label htmlFor="discount-code" className="sr-only">Discount or referral code</Label>
                        <Input id="discount-code" value={codeInput} maxLength={32} placeholder="Discount or referral code" disabled={Boolean(stripeClientSecret)} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} />
                        <Button type="submit" variant="outline" className="font-bold uppercase" disabled={!codeInput.trim() || Boolean(stripeClientSecret)}>Apply</Button>
                      </form>
                    )}
                    {appliedCode && codeError ? <p className="text-xs text-destructive" role="alert">{codeError}</p> : null}
                    {session && availableCredit > 0 && settings.maxCreditUnits > 0 ? (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          You have {availableCredit} referral reward{availableCredit === 1 ? "" : "s"} ({settings.rewardPercent}% off each). Use up to {settings.maxCreditUnits} per order on products (not shipping); all discounts stop at {settings.combinedCapPercent}% off.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Referral rewards to use">
                          {Array.from({ length: Math.max(0, maxCredit) + 1 }, (_, n) => (
                            <Button key={n} type="button" size="sm" role="radio" aria-checked={creditUnits === n} variant={creditUnits === n ? "default" : "outline"} disabled={Boolean(stripeClientSecret)} onClick={() => setCreditUnits(n)}>
                              {n === 0 ? "None" : `${n} × ${settings.rewardPercent}% off`}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Log in or continue as guest to apply a code. Referral rewards are for members.</p>
                )}
                {quote.notices.filter((n) => n !== codeError).map((n) => (
                  <p key={n} className="text-xs text-muted-foreground">{n}</p>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                {!quoteReady && <p role="status" className="text-muted-foreground">{serverQuote.isError ? "Unable to confirm your total. Please try again." : "Checking your total and member benefits…"}</p>}
                <div className={!quoteReady ? "invisible" : "contents"} aria-hidden={!quoteReady}>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(quote.itemsCents / 100)}</span>
                </div>
                {quote.kitSavingsCents > 0 ? (
                  <p className="text-xs text-muted-foreground">Includes {formatPrice(quote.kitSavingsCents / 100)} kit savings (counts toward the {quote.capPercent}% cap).</p>
                ) : null}
                {quote.multibuyCents > 0 ? (
                  <div className="flex justify-between font-bold text-accent">
                    <span>Titan Stack {quote.multibuyPercent}% off</span>
                    <span>−{formatPrice(quote.multibuyCents / 100)}</span>
                  </div>
                ) : null}
                {quote.cryptoCents > 0 ? (
                  <div className="flex justify-between font-bold text-accent">
                    <span>Crypto payment {quote.cryptoPercent}% off</span>
                    <span>−{formatPrice(quote.cryptoCents / 100)}</span>
                  </div>
                ) : null}
                {quote.capApplied ? (
                  <p className="text-xs text-muted-foreground">Combined savings capped at {quote.capPercent}%.</p>
                ) : null}
                {quote.firstOfferCents > 0 ? (
                  <div className="flex justify-between font-bold text-accent">
                    <span>First purchase {quote.firstOfferPercent}% off</span>
                    <span>−{formatPrice(quote.firstOfferCents / 100)}</span>
                  </div>
                ) : null}
                {quote.codeCents > 0 ? (
                  <div className="flex justify-between font-bold text-accent">
                    <span>Code {quote.code}</span>
                    <span>−{formatPrice(quote.codeCents / 100)}</span>
                  </div>
                ) : null}
                {quote.foundationCents > 0 ? (
                  <div className="flex justify-between font-bold text-accent">
                    <span>Foundation Member {quote.foundationPercent}%</span>
                    <span>−{formatPrice(quote.foundationCents / 100)}</span>
                  </div>
                ) : null}
                {quote.clubCents > 0 ? (
                  <div className="flex justify-between font-bold text-accent">
                    <span>Titan Club {clubLabel(quote)}</span>
                    <span>−{formatPrice(quote.clubCents / 100)}</span>
                  </div>
                ) : null}
                {quote.clubType && quote.capPercent !== settings.combinedCapPercent ? (
                  <p className="text-xs text-muted-foreground">Your personal maximum combined saving is {quote.capPercent}% of products.</p>
                ) : null}
                {quote.creditCents > 0 ? (
                  <div className="flex justify-between font-bold text-accent">
                    <span>Referral reward ({quote.creditUnits}×)</span>
                    <span>−{formatPrice(quote.creditCents / 100)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {shippingMethod === "standard"
                      ? "Standard tracked"
                      : "Express + insurance"}{" "}
                    shipping
                  </span>
                  {freeShipping ? (
                    <span className="font-bold uppercase text-accent">
                      Free
                    </span>
                  ) : (
                    <span>{formatPrice(totals.shipping)}</span>
                  )}
                </div>
                {clubFreeShipping ? (
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    Titan Club free shipping — no minimum spend
                    {quote.clubFreeShippingCents > 0 ? ` (you save ${formatPrice(quote.clubFreeShippingCents / 100)})` : ""}
                  </p>
                ) : freeShipping ? (
                  <p className="text-xs font-bold uppercase tracking-wide text-accent">
                    Free express shipping applied — order over{" "}
                    {formatPrice(FREE_SHIPPING_THRESHOLD)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Spend {formatPrice(remaining)} more for free express
                    shipping.
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 text-base">
                  <span className="font-bold uppercase tracking-wide text-foreground">
                    Total
                  </span>
                  <span className="text-2xl font-extrabold text-accent">
                    {formatPrice(totals.total)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  All prices displayed in AUD.
                </p>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-5">
                <TitanTrustStrip />
              </div>

              {mode ? (
                method === "card" ? (
                  <p className="mt-6 text-center text-xs text-muted-foreground">
                    Complete your secure Stripe payment in the payment section.
                  </p>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="mt-6 w-full font-bold uppercase tracking-wide"
                      disabled={placeOrder.isPending || !acknowledged || !quoteReady || cancellingPayment}
                      onClick={() => placeOrder.mutate()}
                    >
                      {placeOrder.isPending ? "Submitting…" : "Submit order"}
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
                  <div className="mt-6 grid gap-2">
                    <Button asChild size="lg" className="w-full font-bold uppercase tracking-wide">
                      <a href="/auth?redirect=%2Fcheckout">{copy.login_label}</a>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="w-full font-bold uppercase tracking-wide">
                      <a href="/auth/signup?redirect=%2Fcheckout">{copy.join_label}</a>
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="ghost"
                      className="w-full font-bold uppercase tracking-wide underline underline-offset-4"
                      disabled={startingGuest}
                      onClick={() => void chooseGuest()}
                    >
                      {startingGuest ? "Starting…" : copy.guest_label}
                    </Button>
                  </div>

                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    <span className="whitespace-pre-line">{copy.choice_note}</span>
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
