import { createServerFn } from "@tanstack/react-start";
import type { ShippingMethodKey } from "@/lib/pricing";
import type { CheckoutItemInput } from "@/lib/checkout-pricing.server";
import type { Quote } from "@/lib/order-pricing";
import type { CheckoutMode } from "@/lib/guest-capability";

const modeOf = (m: unknown): CheckoutMode => (m === "guest" ? "guest" : "member");

/** Explicit "Continue as guest": issues a short-lived httpOnly guest capability. */
export const startGuestCheckout = createServerFn({ method: "POST" }).handler(async () => {
  const { startGuestSession } = await import("@/lib/checkout-buyer.server");
  await startGuestSession();
  return { ok: true };
});

/** Reports whether the browser presented a live guest capability (no data exposed). */
export const getGuestCheckoutStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { hasActiveGuestSession } = await import("@/lib/checkout-buyer.server");
  return { active: await hasActiveGuestSession() };
});

/**
 * Records the Research Use & Terms acknowledgement server side, for members and
 * guests, before any order or payment is created. Returns the id that the
 * order/payment step must present; the server re-checks its owner.
 */
export const recordCheckoutAcknowledgement = createServerFn({ method: "POST" })
  .inputValidator((input: { version: string; mode: CheckoutMode }) => input)
  .handler(async ({ data }) => {
    const version = String(data.version ?? "").trim().slice(0, 40);
    if (!version) throw new Error("The terms version is missing. Please refresh and try again.");
    const { resolveBuyer, ownerColumns } = await import("@/lib/checkout-buyer.server");
    const buyer = await resolveBuyer(modeOf(data.mode));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("order_acknowledgements")
      .insert({ version, accepted: true, ...ownerColumns(buyer) })
      .select("id")
      .single();
    if (error || !row) {
      console.error("[checkout] acknowledgement insert failed", error?.code, error?.message);
      throw new Error("We could not record your acknowledgement. Please try again.");
    }
    return { ackId: String(row.id) };
  });

export type CheckoutQuoteResult = {
  quote: Quote;
  codeError: string | null;
  codeApplied: string | null;
  availableCreditUnits: number;
  maxCreditUnits: number;
  creditUnitCents: number;
  buyer: "member" | "guest";
  firstOfferEligible: boolean;
};

export const quoteCheckoutAny = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      mode: CheckoutMode;
      items: CheckoutItemInput[];
      shippingMethod: ShippingMethodKey;
      paymentMethod: "card" | "payid" | "wise" | "crypto";
      code?: string | null;
      creditUnits?: number;
      contactEmail?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<CheckoutQuoteResult> => {
    const { resolveBuyer, buyerEmails } = await import("@/lib/checkout-buyer.server");
    const buyer = await resolveBuyer(modeOf(data.mode));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { priceCheckout } = await import("@/lib/checkout-pricing.server");
    const priced = await priceCheckout(
      supabaseAdmin,
      { userId: buyer.userId, emails: buyerEmails(buyer, String(data.contactEmail ?? "")), emailVerified: buyer.emailVerified },
      {
        items: data.items,
        shippingMethod: data.shippingMethod === "standard" ? "standard" : "express",
        paymentMethod: data.paymentMethod === "crypto" ? "crypto" : data.paymentMethod === "payid" ? "payid" : data.paymentMethod === "wise" ? "wise" : "card",
        code: data.code ?? null,
        creditUnits: Math.max(0, Math.floor(Number(data.creditUnits) || 0)),
      },
    );
    return {
      quote: priced.quote,
      codeError: priced.codeError,
      codeApplied: priced.code?.rule.code ?? null,
      availableCreditUnits: priced.availableCreditUnits,
      maxCreditUnits: priced.settings.maxCreditUnits,
      creditUnitCents: priced.settings.creditUnitCents,
      buyer: buyer.kind,
      firstOfferEligible: priced.firstOfferEligible,
    };
  });
