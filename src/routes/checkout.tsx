import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { OrderSummary } from "@/components/OrderSummary";
import { AddressFields } from "@/components/AddressFields";
import { addressPartsSchema, composeAddress, emptyAddress } from "@/lib/address";
import { useShop } from "@/lib/shop-context";
import { useAuth } from "@/hooks/useAuth";
import { getOrderPayment, listCryptoMethods, placeOrder, submitTransactionHash } from "@/lib/shop.functions";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  ref: z.string().trim().max(20).optional(),
  email: z.string().trim().max(255).optional(),
  hash: z.string().trim().max(150).optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Checkout — Titan Labs Austrlia" },
      {
        name: "description",
        content: "Review your kit selection and check out as a guest or with a Titan Labs Australia account.",
      },
      { property: "og:title", content: "Checkout — Titan Labs Australia" },
      { property: "og:description", content: "Guest or member checkout with flat $70 USD worldwide shipping." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

const formSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    email: z.string().trim().email("Enter a valid email address").max(255),
    mobileNumber: z
      .string()
      .trim()
      .regex(/^\+[0-9][0-9 ()-]{6,28}$/, "Enter your mobile number with country code")
      .max(30),
    whatsappNumber: z
      .string()
      .trim()
      .regex(/^\+[0-9][0-9 ()-]{6,28}$/, "Enter your WhatsApp number with country code")
      .max(30),
    notes: z.string().trim().max(600).optional(),
  })
  .merge(addressPartsSchema);

function CheckoutPage() {
  const shop = useShop();
  const { user } = useAuth();
  const submitOrder = useServerFn(placeOrder);
  const submitHash = useServerFn(submitTransactionHash);
  const cryptoFn = useServerFn(listCryptoMethods);
  const orderPaymentFn = useServerFn(getOrderPayment);
  const navigate = useNavigate();
  const search = Route.useSearch();

  const methodsQuery = useQuery({ queryKey: ["crypto-methods"], queryFn: () => cryptoFn() });
  const methods = methodsQuery.data ?? [];
  const [methodId, setMethodId] = useState<string>("");
  const activeMethod = methods.find((m) => m.id === methodId) ?? methods[0];

  useEffect(() => {
    if (!methodId && methods.length > 0) setMethodId(methods[0]!.id);
  }, [methods, methodId]);

  const [mode, setMode] = useState<"guest" | "account">("guest");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    whatsappNumber: "",
    ...emptyAddress,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [hash, setHash] = useState("");
  const [hashSaved, setHashSaved] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    reference: string;
    total: number;
    email: string;
    wallet: { label: string; asset: string; network: string; wallet_address: string; memo: string } | null;
  } | null>(null);

  // Returning from the payment page: restore the order and pre-fill the hash.
  useEffect(() => {
    const ref = search.ref;
    const mail = search.email;
    if (!ref || !mail) return;
    let cancelled = false;
    orderPaymentFn({ data: { reference: ref, email: mail } })
      .then((order) => {
        if (cancelled) return;
        setConfirmed({ reference: order.reference, total: order.total, email: order.email, wallet: order.wallet });
        if (search.hash) setHash(search.hash);
        else if (order.transactionHash) setHash(order.transactionHash);
      })
      .catch(() => {
        if (!cancelled) toast.error("We couldn't match that order. Please check your confirmation email.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.ref, search.email, search.hash]);

  useEffect(() => {
    if (!user) return;
    setMode("account");
    supabase
      .from("profiles")
      .select(
        "first_name, last_name, email, mobile_number, whatsapp_number, street_address, city, state_province, postal_code, country",
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setForm((f) => ({
          ...f,
          firstName: data?.first_name || f.firstName,
          lastName: data?.last_name || f.lastName,
          email: data?.email || user.email || f.email,
          mobileNumber: data?.mobile_number || f.mobileNumber,
          whatsappNumber: data?.whatsapp_number || f.whatsappNumber,
          street_address: data?.street_address || f.street_address,
          city: data?.city || f.city,
          state_province: data?.state_province || f.state_province,
          postal_code: data?.postal_code || f.postal_code,
          country: data?.country || f.country,
        }));
      });
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    if (shop.lines.length === 0) {
      toast.error("Your order is empty.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitOrder({
        data: {
          ...parsed.data,
          address: composeAddress(parsed.data),
          notes: parsed.data.notes ?? "",
          currency: shop.currency,
          isGuest: !user,
          userId: user?.id ?? null,
          cryptoMethodId: activeMethod?.id ?? null,
          items: shop.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        },
      });
      setConfirmed({
        reference: result.reference,
        total: result.total,
        email: parsed.data.email,
        wallet: result.wallet,
      });
      shop.clear();
      navigate({ to: "/pay", search: { ref: result.reference, email: parsed.data.email } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't place that order.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHash() {
    if (!confirmed) return;
    if (hash.trim().length < 10) {
      toast.error("Please paste the full transaction hash.");
      return;
    }
    try {
      await submitHash({ data: { reference: confirmed.reference, email: confirmed.email, hash: hash.trim() } });
      setHashSaved(true);
      toast.success("Order complete — we'll confirm your payment shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't record that hash.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl tracking-[0.2em] text-steel">CHECKOUT</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          {confirmed ? (
            <PaymentStage
              reference={confirmed.reference}
              total={confirmed.total}
              email={confirmed.email}
              wallet={confirmed.wallet}
              hash={hash}
              setHash={setHash}
              hashSaved={hashSaved}
              onComplete={handleHash}
            />
          ) : (
            <div className="panel rounded-sm p-6">
              {!user && (
                <div className="mb-6 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode("guest")}
                    className={`rounded-sm border px-4 py-3 text-xs tracking-[0.18em] transition-colors ${
                      mode === "guest"
                        ? "border-primary bg-secondary text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    CONTINUE AS GUEST
                  </button>
                  <Link
                    to="/auth"
                    className="rounded-sm border border-border px-4 py-3 text-center text-xs tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    SIGN IN / CREATE ACCOUNT
                  </Link>
                </div>
              )}

              {user && (
                <p className="mb-6 text-xs tracking-[0.18em] text-muted-foreground">SIGNED IN AS {user.email}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      className="mt-1.5"
                      maxLength={80}
                      placeholder="John"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      className="mt-1.5"
                      maxLength={80}
                      placeholder="Smith"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    className="mt-1.5"
                    maxLength={255}
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="mobileNumber">Mobile number with country code</Label>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      className="mt-1.5"
                      maxLength={30}
                      placeholder="+00 000 000 000"
                      value={form.mobileNumber}
                      onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsappNumber">WhatsApp number with country code</Label>
                    <Input
                      id="whatsappNumber"
                      type="tel"
                      className="mt-1.5"
                      maxLength={30}
                      placeholder="+00 000 000 000"
                      value={form.whatsappNumber}
                      onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      If this is the same as your mobile number, enter it again. If different, enter your WhatsApp
                      number, or install WhatsApp using your mobile number, as DARKMATTER//BIO sales representatives may
                      contact you through the app.
                    </p>
                  </div>
                </div>

                <div className="rounded-sm border border-moon/40 bg-secondary/20 p-4">
                  <Label className="text-[11px] tracking-[0.18em] text-muted-foreground">DELIVERY ADDRESS</Label>
                  <div className="mt-3">
                    <AddressFields
                      idPrefix="checkout"
                      value={form}
                      onChange={(next) => setForm({ ...form, ...next })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Order notes (optional)</Label>
                  <Textarea
                    id="notes"
                    className="mt-1.5"
                    maxLength={600}
                    placeholder="Delivery instructions or other order information"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div className="rounded-sm border border-moon/40 bg-secondary/30 p-4">
                  <Label className="text-[11px] tracking-[0.18em] text-muted-foreground">PAYMENT METHOD</Label>
                  {methods.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Cryptocurrency (USDC) — wallet details are sent with your order confirmation.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {methods.map((m) => (
                        <label
                          key={m.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-sm transition-colors ${
                            activeMethod?.id === m.id ? "border-primary bg-secondary" : "border-border"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            checked={activeMethod?.id === m.id}
                            onChange={() => setMethodId(m.id)}
                          />
                          <span>
                            {m.label}
                            <span className="block text-[11px] text-muted-foreground">
                              {m.asset} · {m.network}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {activeMethod?.wallet_address && (
                    <div className="mt-4 rounded-sm border border-moon/40 bg-background/50 p-3">
                      <p className="text-[11px] tracking-[0.18em] text-muted-foreground">
                        SEND {activeMethod.asset} TO · {activeMethod.network}
                      </p>
                      <CopyLine value={activeMethod.wallet_address} />
                      {activeMethod.memo && (
                        <p className="mt-2 text-[11px] text-muted-foreground">Memo/tag: {activeMethod.memo}</p>
                      )}
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Pay the total to the wallet above, then place your order and paste your transaction hash to finalise
                    it.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || shop.lines.length === 0}
                  className="w-full text-xs tracking-[0.2em]"
                >
                  {submitting ? "PLACING ORDER…" : "PLACE ORDER"}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  A flat $70 USD shipping fee is included in your total.
                </p>
              </form>
            </div>
          )}

          {!confirmed && (
            <aside className="order-first lg:order-last lg:sticky lg:top-24 lg:h-fit">
              <OrderSummary compact />
              {shop.lines.length === 0 && (
                <Link
                  to="/products"
                  className="mt-4 block rounded-sm border border-border px-4 py-3 text-center text-xs tracking-[0.2em] hover:bg-accent"
                >
                  BROWSE CATALOGUE
                </Link>
              )}
            </aside>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function CopyLine({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-start gap-2">
      <p className="flex-1 break-all font-display text-sm">{value}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 text-[11px] tracking-[0.16em]"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
          } catch {
            toast.error("Copy failed — please select the address manually.");
            return;
          }
          setCopied(true);
          toast.success("Wallet address copied.");
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
        {copied ? "COPIED" : "COPY"}
      </Button>
    </div>
  );
}

function PaymentStage({
  reference,
  total,
  email,
  wallet,
  hash,
  setHash,
  hashSaved,
  onComplete,
}: {
  reference: string;
  total: number;
  email: string;
  wallet: { label: string; asset: string; network: string; wallet_address: string; memo: string } | null;
  hash: string;
  setHash: (v: string) => void;
  hashSaved: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="panel rounded-sm p-6 lg:col-span-2">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-foreground" />
        <div>
          <h2 className="text-sm tracking-[0.2em] text-steel">ORDER RECEIVED — AWAITING PAYMENT HASH</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Reference <span className="font-display text-foreground">{reference}</span> · Amount{" "}
            <span className="text-foreground">${total.toFixed(2)} USD</span> (includes $70 USD shipping)
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-sm border border-moon/40 bg-secondary/40 p-5">
        <h3 className="text-xs tracking-[0.2em] text-steel">PAY WITH {wallet?.asset ?? "USDC"}</h3>
        {wallet?.wallet_address ? (
          <>
            <p className="mt-2 text-[11px] tracking-[0.16em] text-muted-foreground">
              {wallet.asset} · {wallet.network}
            </p>
            <CopyLine value={wallet.wallet_address} />
            {wallet.memo && <p className="mt-2 text-xs text-muted-foreground">Memo/tag: {wallet.memo}</p>}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Payment wallet details will be emailed to you shortly.</p>
        )}
        {!hashSaved && (
          <Link
            to="/pay"
            search={{ ref: reference, email }}
            className="mt-5 inline-block rounded-sm border border-moon/50 px-6 py-3 text-xs tracking-[0.2em] hover:bg-accent"
          >
            PAY FROM MY WALLET
          </Link>
        )}
      </div>

      {hashSaved ? (
        <div className="mt-6 rounded-sm border border-border p-5">
          <p className="text-sm text-muted-foreground">
            Thank you — your order is complete and marked <strong>Pending</strong> while we verify the payment. A
            confirmation email is on its way.
          </p>
          <Link
            to="/products"
            className="mt-5 inline-block rounded-sm border border-border px-6 py-3 text-xs tracking-[0.2em] hover:bg-accent"
          >
            BACK TO CATALOGUE
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <Label htmlFor="txhash">Transaction hash</Label>
          <Input
            id="txhash"
            className="mt-1.5"
            placeholder="Paste your transaction hash here"
            maxLength={150}
            value={hash}
            onChange={(e) => setHash(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Your order is only finalised once the transaction hash is submitted.
          </p>
          <Button
            className="mt-4 w-full text-xs tracking-[0.2em] sm:w-auto"
            disabled={hash.trim().length < 10}
            onClick={onComplete}
          >
            COMPLETE ORDER
          </Button>
        </div>
      )}
    </div>
  );
}
