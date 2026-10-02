import { effectivePack, kitPriceFor } from "@/lib/products";
import type { ShippingMethodKey } from "@/lib/pricing";
import {
  fromCents,
  quoteOrder,
  settingsFromRow,
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
  userId: string,
  input: {
    items: CheckoutItemInput[];
    shippingMethod: ShippingMethodKey;
    paymentMethod: "card" | "payid" | "crypto";
    code?: string | null;
    creditUnits?: number;
  },
): Promise<PricedCheckout> {
  const items = (input.items ?? []).filter((i) => i && i.slug && i.quantity > 0).slice(0, 50);
  if (items.length === 0) throw new Error("Your order is empty.");

  const slugs = [...new Set(items.map((i) => String(i.slug)))];
  const [{ data: products, error: productError }, { data: settingsRow }] = await Promise.all([
    admin
      .from("products")
      .select(
        "slug, name, price, sale_price, kit_price, product_variants, catalogue_section, stock_quantity, coming_soon",
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
    const singlePrice = variant ? Number(variant.price) : basePrice;
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
    const stock = variant ? variant.stock : product.stock_quantity;
    if (stock != null && units > Number(stock))
      throw new Error("There is not enough stock for one of the items. Please update your cart.");
    const label = variant?.label
      ? String(variant.label)
      : product.catalogue_section === "pens"
        ? "Pre-filled Pen Only"
        : product.catalogue_section === "equipment"
          ? "Single item"
          : "Single vial";
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
  const { data: avail } = await admin.rpc("store_credit_available_units", { _user_id: userId });
  availableCreditUnits = Math.max(0, Number(avail) || 0);

  const quote = quoteOrder(
    {
      lines: priceLines,
      shippingMethod: input.shippingMethod,
      paymentMethod: input.paymentMethod,
      code: code?.rule ?? null,
      creditUnits: input.creditUnits ?? 0,
      availableCreditUnits,
    },
    settings,
  );
  if (code && !quote.codeApplied) {
    // Code didn't win or failed min spend: no attribution.
    code = null;
  }
  return { lines, quote, settings, code, codeError, availableCreditUnits };
}

/** Human readable discount note stored on the order. */
export function pricingNote(q: Quote) {
  const parts: string[] = [];
  if (q.multibuyCents)
    parts.push(`Titan Stack ${q.multibuyPercent}% (−$${fromCents(q.multibuyCents).toFixed(2)})`);
  if (q.cryptoCents)
    parts.push(`crypto ${q.cryptoPercent}% (−$${fromCents(q.cryptoCents).toFixed(2)})`);
  if (q.capApplied) parts.push(`capped at ${q.capPercent}%`);
  if (q.codeCents && q.code) parts.push(`code ${q.code} (−$${fromCents(q.codeCents).toFixed(2)})`);
  if (q.creditCents)
    parts.push(`store credit ${q.creditUnits}x (−$${fromCents(q.creditCents).toFixed(2)})`);
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
    quote: q,
    settings: p.settings,
  };
}

/** Discount total in dollars (everything except shipping). */
export function discountDollars(q: Quote) {
  return fromCents(q.itemsCents - q.merchandiseCents);
}
