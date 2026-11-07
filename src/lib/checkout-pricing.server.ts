import { readWebsitePromotion, websiteSalePrice } from "./website-promotion";
import { promotedPrice } from "@/lib/variant-promotions";
import { effectivePack, effectiveStock, bundleSummary, sanitizeBundle, packLabel, sanitizePackSize } from "@/lib/products";
import type { ShippingMethodKey } from "@/lib/pricing";
import {
  fromCents,
  quoteOrder,
  sanitizeClub,
  clubLabel,
  settingsFromRow,
  type ClubBenefit,
  type CodeRule,
  type PriceLine,
  type PricingSettings,
  type Quote,
} from "@/lib/order-pricing";

import { isFreeGift, paidRangeEligible, validateGiftLines, type GiftProduct } from "./equipment-gifts";
import { readEquipmentGiftOffers } from "./equipment-gifts.server";

export type CheckoutItemInput = {
  slug: string;
  variantId?: string | null;
  pack?: "single" | "kit";
  freeGift?: boolean;
  giftOfferId?: string | null;
  quantity: number;
};

export type PricedLine = {
  product_slug: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  variant_label: string;
  variant_id: string | null;
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

function resolvedCode(row: any, settings: PricingSettings, referrer: string | null): ResolvedCode {
  return {
    id: row.id,
    referrerUserId: settings.programEnabled && row.code_kind === "referral" ? referrer : null,
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

/**
 * Referral-code gate beyond checkCodeRow: signed-in buyer, not the referrer's own
 * email, and no successful use of this specific code by account or normalized
 * email (historical guest uses included). Other purchases/codes do not block it.
 */
async function referralRedemptionGate(
  admin: any,
  row: any,
  buyer: PricingBuyer,
): Promise<string | null> {
  if (!buyer.userId) {
    return "Sign in or join to use a referral code, once per specific code per member. You can still check out as a guest without the code.";
  }
  if (row.user_id) {
    const { data: owner } = await admin
      .from("profiles")
      .select("email")
      .eq("id", row.user_id)
      .maybeSingle();
    const ownerEmail = String(owner?.email ?? "").trim().toLowerCase();
    if (ownerEmail && buyer.emails.map((e) => String(e).trim().toLowerCase()).includes(ownerEmail)) {
      return "You can't use your own referral code.";
    }
  }
  const { data: eligible, error } = await admin.rpc("referral_redemption_eligible", {
    _user_id: buyer.userId,
    _emails: buyer.emails,
    _code_id: row.id,
    _except_order_id: null,
  });
  if (error) {
    console.error("referral_redemption_eligible failed", error.message);
    return "We couldn't confirm your referral eligibility just now. Please try again in a moment.";
  }
  if (eligible !== true) {
    return "You've already used this referral code, or it is held on another checkout. Each specific referral code is usable once per member on successful payment; a different unused code remains eligible.";
  }
  return null;
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
  if ((input.items ?? []).length > 50) throw new Error("Your cart has too many separate items. Please keep it to 50 lines or fewer.");
  const items = (input.items ?? []).filter((i) => i && i.slug && i.quantity > 0);
  if (items.length === 0) throw new Error("Your order is empty.");

  const userId = buyer.userId ?? "";
  const slugs = [...new Set(items.map((i) => String(i.slug)))];
  const [{ data: products, error: productError }, { data: settingsRow }, websitePromotion, giftRules] = await Promise.all([
    admin
      .from("products")
      .select(
        "id, slug, name, price, sale_price, product_variants, catalogue_section, stock_quantity, coming_soon, unlimited_stock",
      )
      .in("slug", slugs)
      .eq("active", true),
    admin.from("referral_settings").select("*").eq("id", 1).maybeSingle(),
    readWebsitePromotion(admin),
    readEquipmentGiftOffers(admin),
  ]);
  if (productError) throw productError;
  const settings = settingsFromRow(settingsRow);

  const bySlug = new Map((products ?? []).map((p: any) => [p.slug, p]));
  const giftProduct = (slug: string): GiftProduct | undefined => {
    const p: any = bySlug.get(slug);
    if (!p) return undefined;
    return { slug: p.slug, catalogueSection: p.catalogue_section, comingSoon: Boolean(p.coming_soon),
      stock: effectiveStock(p, p.stock_quantity),
      variants: (Array.isArray(p.product_variants) ? p.product_variants : []).map((v: any) => ({ id: String(v.id), stock: effectiveStock(p, v.stock), comingSoon: Boolean(v.comingSoon) })) };
  };
  validateGiftLines(giftRules, items, Boolean(buyer.userId), giftProduct);
  const lines: PricedLine[] = [];
  const priceLines: PriceLine[] = [];
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
    // The 10x bulk-kit is retired: every line prices as a single item, so a
    // crafted pack:"kit" request simply pays the ordinary single price.
    const regularPrice = websiteSalePrice(variant ? Number(variant.price) : listPrice, singlePrice, product.id, websitePromotion);
    const unitPrice = isFreeGift(item) ? 0 : regularPrice;
    const quantity = Math.min(99, Math.max(1, Math.floor(item.quantity)));
    if (!Number.isFinite(regularPrice) || regularPrice <= 0)
      throw new Error("One of the product prices is unavailable.");
    const stockKey = `${product.slug}::${variant?.id ?? "base"}`;
    const units = (requestedStock.get(stockKey) ?? 0) + quantity;
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
      variant_label: isFreeGift(item) ? `${label} · Complimentary gift` : label,
      variant_id: variant ? String(variant.id) : null,
    });
    priceLines.push({
      unitCents: Math.round(unitPrice * 100),
      baseCents: Math.round(unitPrice * 100),
      quantity,
      // Titan Stack eligibility comes only from the stored catalogue section
      // (never client input); anything that is not exactly "range" fails closed.
      multibuyEligible: paidRangeEligible(item, product.catalogue_section),
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
    else if (row.code_kind === "referral") {
      // Signed-in members: once per specific code, matched by account and email.
      // Other paid purchases/codes do not block an unused code; guests shop without it.
      const gate = await referralRedemptionGate(admin, row, buyer);
      if (gate) codeError = gate;
      else code = resolvedCode(row, settings, check.referrer);
    } else {
      code = resolvedCode(row, settings, check.referrer);
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
    selectClubRow(admin, userId),
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
      ? { type: "fixed", fixedCents: Number(row.fixed_cents), maxCapPercent: Number(row.max_cap_percent) }
      : { type: "percent", percent: Number(row.percent), maxCapPercent: Number(row.max_cap_percent) };
  return sanitizeClub({ ...benefit, stacking: stackingFromRow(row), freeShipping: row.free_shipping === true });
}

const STACK_COLS = "stack_multibuy, stack_crypto, stack_first_offer, stack_code, stack_credit, stack_foundation";
/** Reads the persisted stacking policy; before the stacking columns are installed, legacy all-allowed applies. */
async function selectClubRow(admin: any, userId: string) {
  const base = "benefit_type, percent, fixed_cents, max_cap_percent, active";
  // Missing newer columns (not yet installed) fall back step by step: free shipping off, then legacy stacking.
  const r = await admin.from("titan_club_members").select(`${base}, ${STACK_COLS}, free_shipping`).eq("user_id", userId).maybeSingle();
  if (!(r.error && String(r.error.code) === "42703")) return r;
  const r2 = await admin.from("titan_club_members").select(`${base}, ${STACK_COLS}`).eq("user_id", userId).maybeSingle();
  if (r2.error && String(r2.error.code) === "42703") return admin.from("titan_club_members").select(base).eq("user_id", userId).maybeSingle();
  return r2;
}

export function stackingFromRow(row: any) {
  const b = (v: any) => (typeof v === "boolean" ? v : true);
  return { multibuy: b(row?.stack_multibuy), crypto: b(row?.stack_crypto), firstOffer: b(row?.stack_first_offer), code: b(row?.stack_code), credit: b(row?.stack_credit), foundation: b(row?.stack_foundation) };
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
      ? { type: q.clubType, percent: q.clubPercent, fixed_cents: q.clubFixedCents, cents: q.clubCents, cap_reached: q.clubCapReached, max_cap_percent: sanitizeClub(p.club)?.maxCapPercent ?? null, effective_cap_percent: q.capPercent, applied: q.clubCents > 0, stacking: sanitizeClub(p.club)?.stacking ?? null, free_shipping: q.clubFreeShipping, free_shipping_waived_cents: q.clubFreeShippingCents, site_cap_percent: p.settings.combinedCapPercent }
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

/**
 * Reserve the one-time referral redemption atomically; throws a customer-safe
 * message if the buyer is no longer eligible or another checkout holds it.
 */
export async function claimReferralRedemption(
  admin: any,
  userId: string,
  emails: string[],
  codeId: string | null,
  ttlMinutes: number,
) {
  const { data, error } = await admin.rpc("claim_referral_redemption", {
    _user_id: userId,
    _emails: emails,
    _code_id: codeId,
    _ttl_minutes: ttlMinutes,
  });
  if (error || !data) {
    throw new Error(
      "That referral code is already used or held on another checkout. Each specific referral code is usable once per member on successful payment. Please refresh your order summary.",
    );
  }
  return String(data);
}

/** Release a held referral claim (failed/abandoned checkout); safe to repeat. */
export async function releaseReferralRedemptionForAttempt(admin: any, paymentAttemptId: string) {
  await admin.rpc("release_referral_redemption_for_attempt", { _payment_attempt_id: paymentAttemptId });
}




