import { promotedPrice } from "@/lib/variant-promotions";
import { effectivePack, effectiveStock, kitPriceFor, bundleSummary, sanitizeBundle, packLabel, sanitizePackSize } from "@/lib/products";
import type { ShippingMethodKey } from "@/lib/pricing";
import {
  fromCents,
  quoteOrder,
  sanitizeClub,
  clubLabel,
  settingsFromRow,
  type ClubBenefit,
  type CodeRule,
  type PricingSettings,
  type Quote,
} from "@/lib/order-pricing";

export type CheckoutItemInput = {
  slug: string;
  variantId?: string | null;
  pack?: "single" | "kit";
  quantity: number;
};

export type PricedLine = {
  product_slug: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  variant_label: string;
};

export type ResolvedCode = {
  rule: CodeRule;
  id: string;
  referrerUserId: string | null;
};

export type PricedCheckout = {
  lines: PricedLine[];
  quote: Quote;
  settings: PricingSettings;
  code: ResolvedCode | null;
  codeError: string | null;
  availableCreditUnits: number;
  firstOfferEligible: boolean;
  foundation: { memberNumber: number; percent: number } | null;
  club: ClubBenefit | null;
};

export type PricingBuyer = {
  /** null for guests: no store credit, no member codes, no first-purchase offer. */
  userId: string | null;
  emails: string[];
  emailVerified: boolean;
};

export function normalizeCode(raw: unknown) {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 32);
}

/** Validate a code for a specific buyer. Never reveals who owns a code. */
export function checkCodeRow(
  row: any,
  buyerId: string,
  now = new Date(),
): { ok: true; referrer: string | null } | { ok: false; error: string } {
  if (!row || !row.active) return { ok: false, error: "That code isn't valid." };
  if (row.expires_at && new Date(row.expires_at).getTime() <= now.getTime())
    return { ok: false, error: "That code has expired." };
  if (Number(row.times_used) >= Number(row.max_uses))
    return { ok: false, error: "That code has reached its use limit." };
  if (row.code_kind === "member") {
    if (row.user_id !== buyerId) return { ok: false, error: "That code isn't valid." };
    return { ok: true, referrer: null };
  }
  if (row.user_id && row.user_id === buyerId)
    return { ok: false, error: "You can't use your own referral code." };
  return { ok: true, referrer: row.user_id ?? null };
}

export async function priceCheckout(
  admin: any,
  buyer: PricingBuyer,
  input: {
    items: CheckoutItemInput[];
    shippingMethod: ShippingMethodKey;
    paymentMethod: "card" | "payid" | "wise" | "crypto";
    code?: string | null;
    creditUnits?: number;
  },
): Promise<PricedCheckout> {
  const items = (input.items ?? []).filter((i) => i && i.slug && i.quantity > 0).slice(0, 50);
  if (items.length === 0) throw new Error("Your order is empty.");

  const userId = buyer.userId ?? "";
  const slugs = [...new Set(items.map((i) => String(i.slug)))];
  const [{ data: products, error: productError }, { data: settingsRow }] = await Promise.all([
    admin
      .from("products")
      .select(
        "slug, name, price, sale_price, kit_price, product_variants, catalogue_section, stock_quantity, coming_soon, unlimited_stock",
      )
      .in("slug", slugs)
      .eq("active", true),
    admin.from("referral_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (productError) throw productError;
  const settings = settingsFromRow(settingsRow);

  const bySlug = new Map((products ?? []).map((p: any) => [p.slug, p]));
  const lines: PricedLine[] = [];
  const priceLines: { unitCents: number; baseCents: number; quantity: number }[] = [];
  const requestedStock = new Map<string, number>();
  for (const item of items) {
    const product: any = bySlug.get(item.slug);
    if (!product) throw new Error("One of the items is no longer available.");
    const variants = Array.isArray(product.product_variants) ? product.product_variants : [];
    const variant =
      variants.find((v: any) => String(v?.id) === String(item.variantId ?? "")) ?? null;
    if (variants.length && !variant) throw new Error("Choose a valid size for this product.");
    if (product.coming_soon || variant?.comingSoon)
      throw new Error("One of the items is coming soon and cannot be ordered yet.");
    if (
      !Number.isFinite(item.quantity) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    )
      throw new Error("Invalid item quantity.");
    const listPrice = Number(product.price);
    const sale = product.sale_price == null ? null : Number(product.sale_price);
    const basePrice = sale != null && sale > 0 && sale < listPrice ? sale : listPrice;
    const singlePrice = variant ? promotedPrice(Number(variant.price), variant.salePrice == null ? null : Number(variant.salePrice)) : basePrice;
    const pack = effectivePack(product, item.pack);
    const unitPrice =
      pack === "kit"
        ? kitPriceFor(singlePrice, variant?.kitPrice ?? product.kit_price)
        : singlePrice;
    const quantity = Math.min(99, Math.max(1, Math.floor(item.quantity)));
    if (!Number.isFinite(unitPrice) || unitPrice <= 0)
      throw new Error("One of the product prices is unavailable.");
    const stockKey = `${product.slug}::${variant?.id ?? "base"}`;
    const units = (requestedStock.get(stockKey) ?? 0) + quantity * (pack === "kit" ? 10 : 1);
    requestedStock.set(stockKey, units);
    // Unlimited Equipment (DB flag + section, never client input) skips the limit only.
    const stock = effectiveStock(product, variant ? variant.stock : product.stock_quantity);
    if (stock != null && units > Number(stock))
      throw new Error("There is not enough stock for one of the items. Please update your cart.");
    const baseLabel = variant?.label
      ? product.catalogue_section === "equipment"
        ? packLabel(String(variant.label), sanitizePackSize((variant as any)?.packSize))
        : String(variant.label)
      : product.catalogue_section === "pens"
        ? "Pre-filled Pen Only"
        : product.catalogue_section === "equipment"
          ? "Single item"
          : "Single vial";
    const bundle = bundleSummary(sanitizeBundle((variant as any)?.contents));
    const label = bundle ? `${baseLabel} (${bundle})`.slice(0, 500) : baseLabel;
    lines.push({
      product_slug: product.slug,
      product_name: product.name,
      unit_price: unitPrice,
      quantity,
      variant_label: pack === "kit" ? `${label} · 10x Kit` : label,
    });
    priceLines.push({
      unitCents: Math.round(unitPrice * 100),
      baseCents: Math.round((pack === "kit" ? singlePrice * 10 : singlePrice) * 100),
      quantity,
    });
  }

  let code: ResolvedCode | null = null;
  let codeError: string | null = null;
  const wanted = normalizeCode(input.code);
  if (wanted) {
    const { data: row } = await admin
      .from("discount_codes")
      .select("*")
      .eq("code", wanted)
      .maybeSingle();
    const check = checkCodeRow(row, userId);
    if (!check.ok) codeError = check.error;
    else {
      code = {
        id: row.id,
        referrerUserId:
          settings.programEnabled && row.code_kind === "referral" ? check.referrer : null,
        rule: {
          id: row.id,
          code: row.code,
          kind: row.code_kind,
          discountType: row.discount_type === "fixed" ? "fixed" : "percent",
          value: Number(row.value) || 0,
          minSpendCents: Number(row.min_spend_cents) || 0,
          combineMultibuy: Boolean(row.combine_multibuy),
          combineCrypto: Boolean(row.combine_crypto),
          combineCredit: Boolean(row.combine_credit),
        },
      };
    }
  }

  let availableCreditUnits = 0;
  if (buyer.userId) {
    const { data: avail } = await admin.rpc("store_credit_available_units", { _user_id: buyer.userId });
    availableCreditUnits = Math.max(0, Number(avail) || 0);
  }

  // First-purchase offer: verified members with no prior order/claim by account or email.
  let firstOfferEligible = false;
  if (buyer.userId && buyer.emailVerified && settings.firstOffer.enabled && settings.firstOffer.percent > 0) {
    const { data: eligible, error: eligibleError } = await admin.rpc("first_offer_eligible", {
      _user_id: buyer.userId,
      _emails: buyer.emails,
    });
    if (eligibleError) console.error("first_offer_eligible failed", eligibleError.message);
    firstOfferEligible = eligible === true;
  }

  const [foundation, club] = await Promise.all([
    foundationBenefitFor(admin, buyer.userId),
    clubBenefitFor(admin, buyer.userId),
  ]);

  const quote = quoteOrder(
    {
      lines: priceLines,
      shippingMethod: input.shippingMethod,
      paymentMethod: input.paymentMethod,
      code: code?.rule ?? null,
      creditUnits: buyer.userId ? (input.creditUnits ?? 0) : 0,
      availableCreditUnits,
      firstOfferEligible,
      foundationPercent: foundation?.percent ?? 0,
      club,
    },
    settings,
  );
  if (code && !quote.codeApplied) {
    // Code didn't win or failed min spend: no attribution.
    code = null;
  }
  return { lines, quote, settings, code, codeError, availableCreditUnits, firstOfferEligible, foundation, club };
}

const MISSING_RELATION = new Set(["42P01", "PGRST205", "PGRST202"]);

/**
 * Titan Club benefit for the trusted server user id only (never client fields).
 * Applies only while the programme is switched on and the member is active.
 * Not-yet-installed tables mean "no club"; any other read error fails closed with a retry message.
 */
export async function clubBenefitFor(admin: any, userId: string | null): Promise<ClubBenefit | null> {
  if (!userId) return null;
  const [{ data: cfg, error: cfgError }, { data: row, error }] = await Promise.all([
    admin.from("titan_club_settings").select("enabled").eq("id", 1).maybeSingle(),
    admin.from("titan_club_members").select("benefit_type, percent, fixed_cents, active").eq("user_id", userId).maybeSingle(),
  ]);
  const err = cfgError ?? error;
  if (err) {
    if (MISSING_RELATION.has(String(err.code))) return null;
    console.error("titan club lookup failed", err.message);
    throw new Error("We couldn't confirm your member benefits just now. Please try again in a moment.");
  }
  if (!cfg?.enabled || !row?.active) return null;
  const benefit: ClubBenefit =
    row.benefit_type === "fixed"
      ? { type: "fixed", fixedCents: Number(row.fixed_cents) }
      : { type: "percent", percent: Number(row.percent) };
  return sanitizeClub(benefit) ? benefit : null;
}

/**
 * Foundation Member benefit from the database award (trusted server user id only).
 * Read errors throw a retriable message rather than silently dropping the benefit.
 * Awards are permanent: pausing enrolment never removes the benefit.
 */
export async function foundationBenefitFor(admin: any, userId: string | null) {
  if (!userId) return null;
  const [{ data: award, error }, { data: cfg, error: cfgError }] = await Promise.all([
    admin.from("foundation_members").select("member_number").eq("user_id", userId).maybeSingle(),
    admin.from("foundation_member_settings").select("benefit_percent").eq("id", 1).maybeSingle(),
  ]);
  if (error || cfgError) {
    console.error("foundation lookup failed", (error ?? cfgError)?.message);
    throw new Error("We couldn't confirm your member benefits just now. Please try again in a moment.");
  }
  if (!award) return null;
  return { memberNumber: Number(award.member_number), percent: Number(cfg?.benefit_percent ?? 5) || 5 };
}

/** Human readable discount note stored on the order. */
export function pricingNote(q: Quote) {
  const parts: string[] = [];
  if (q.multibuyCents)
    parts.push(`Titan Stack ${q.multibuyPercent}% (−$${fromCents(q.multibuyCents).toFixed(2)})`);
  if (q.cryptoCents)
    parts.push(`crypto ${q.cryptoPercent}% (−$${fromCents(q.cryptoCents).toFixed(2)})`);
  if (q.capApplied) parts.push(`capped at ${q.capPercent}%`);
  if (q.firstOfferCents)
    parts.push(`first purchase ${q.firstOfferPercent}% (−$${fromCents(q.firstOfferCents).toFixed(2)})`);
  if (q.foundationCents)
    parts.push(`Foundation Member ${q.foundationPercent}% (−$${fromCents(q.foundationCents).toFixed(2)})`);
  if (q.clubCents) parts.push(`Titan Club ${clubLabel(q)} (−$${fromCents(q.clubCents).toFixed(2)})`);
  if (q.codeCents && q.code) parts.push(`code ${q.code} (−$${fromCents(q.codeCents).toFixed(2)})`);
  if (q.creditCents)
    parts.push(`referral reward ${q.creditUnits}x (−$${fromCents(q.creditCents).toFixed(2)})`);
  return parts.length ? `Discounts: ${parts.join(", ")}` : "";
}

/** Snapshot persisted on the order / payment attempt. */
export function pricingSnapshot(p: PricedCheckout, reservationId: string | null) {
  const q = p.quote;
  return {
    discount_code_id: p.code?.id ?? null,
    discount_code: p.code?.rule.code ?? null,
    discount_code_kind: p.code?.rule.kind ?? null,
    code_discount_cents: q.codeCents,
    referrer_user_id: p.code?.referrerUserId ?? null,
    credit_units: q.creditUnits,
    credit_cents: q.creditCents,
    credit_reservation_id: reservationId,
    first_purchase_offer: firstOfferSnapshot(q),
    foundation_member: p.foundation
      ? { member_number: p.foundation.memberNumber, percent: q.foundationPercent, cents: q.foundationCents, cap_reached: q.foundationCapReached }
      : null,
    titan_club: p.club
      ? { type: q.clubType, percent: q.clubPercent, fixed_cents: q.clubFixedCents, cents: q.clubCents, cap_reached: q.clubCapReached }
      : null,
    quote: q,
    settings: p.settings,
  };
}

/** Discount total in dollars (everything except shipping). */
export function discountDollars(q: Quote) {
  return fromCents(q.itemsCents - q.merchandiseCents);
}

/** Immutable record of the first-purchase offer as charged. */
export function firstOfferSnapshot(q: Quote) {
  return q.firstOfferApplied
    ? { applied: true, percent: q.firstOfferPercent, cents: q.firstOfferCents }
    : null;
}

/** Reserve the one-time offer atomically; throws a customer-safe message if already used. */
export async function claimFirstOffer(admin: any, userId: string, emails: string[], ttlMinutes: number) {
  const { data, error } = await admin.rpc("claim_first_offer", {
    _user_id: userId,
    _emails: emails,
    _ttl_minutes: ttlMinutes,
  });
  if (error || !data) {
    throw new Error(
      "Your first-purchase offer is already in use on another checkout or order. Please refresh your order summary.",
    );
  }
  return String(data);
}
