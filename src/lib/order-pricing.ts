/**
 * Shared, pure order pricing in integer cents. Used by the cart, checkout,
 * and every server payment path so the customer always sees what they pay.
 */
import { FREE_SHIPPING_THRESHOLD, SHIPPING_OPTIONS, type ShippingMethodKey } from "./pricing";

export type PricingSettings = {
  multibuyTiers: { units: number; percent: number }[];
  cryptoPercent: number;
  combinedCapPercent: number;
  allowMultibuyCrypto: boolean;
  allowCodeMultibuy: boolean;
  allowCodeCrypto: boolean;
  allowCreditCode: boolean;
  allowCreditDiscounts: boolean;
  creditUnitCents: number;
  maxCreditUnits: number;
  referralRewardUnits: number;
  milestoneThresholds: number[];
  programEnabled: boolean;
};

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  multibuyTiers: [
    { units: 2, percent: 10 },
    { units: 3, percent: 15 },
    { units: 4, percent: 20 },
  ],
  cryptoPercent: 10,
  combinedCapPercent: 20,
  allowMultibuyCrypto: true,
  allowCodeMultibuy: false,
  allowCodeCrypto: false,
  allowCreditCode: true,
  allowCreditDiscounts: true,
  creditUnitCents: 1000,
  maxCreditUnits: 2,
  referralRewardUnits: 1,
  milestoneThresholds: [5, 10, 25, 50, 100],
  programEnabled: true,
};

/** Map a referral_settings row (snake_case) to PricingSettings. */
export function settingsFromRow(row: any | null | undefined): PricingSettings {
  if (!row) return DEFAULT_PRICING_SETTINGS;
  const d = DEFAULT_PRICING_SETTINGS;
  const tiers = Array.isArray(row.multibuy_tiers)
    ? row.multibuy_tiers
        .map((t: any) => ({ units: Math.floor(Number(t?.units)), percent: Number(t?.percent) }))
        .filter((t: any) => t.units > 0 && t.percent >= 0 && t.percent <= 100)
        .sort((a: any, b: any) => a.units - b.units)
    : d.multibuyTiers;
  const num = (v: any, f: number) => (Number.isFinite(Number(v)) ? Number(v) : f);
  return {
    multibuyTiers: tiers,
    cryptoPercent: num(row.crypto_percent, d.cryptoPercent),
    combinedCapPercent: num(row.combined_cap_percent, d.combinedCapPercent),
    allowMultibuyCrypto: row.allow_multibuy_crypto ?? d.allowMultibuyCrypto,
    allowCodeMultibuy: row.allow_code_multibuy ?? d.allowCodeMultibuy,
    allowCodeCrypto: row.allow_code_crypto ?? d.allowCodeCrypto,
    allowCreditCode: row.allow_credit_code ?? d.allowCreditCode,
    allowCreditDiscounts: row.allow_credit_discounts ?? d.allowCreditDiscounts,
    creditUnitCents: num(row.credit_unit_cents, d.creditUnitCents),
    maxCreditUnits: num(row.max_credit_units, d.maxCreditUnits),
    referralRewardUnits: num(row.referral_reward_units, d.referralRewardUnits),
    milestoneThresholds: Array.isArray(row.milestone_thresholds)
      ? row.milestone_thresholds.map(Number).filter((n: number) => n > 0)
      : d.milestoneThresholds,
    programEnabled: row.program_enabled ?? d.programEnabled,
  };
}

export type PriceLine = {
  /** What the customer pays per unit (kits already discounted). */
  unitCents: number;
  /** Undiscounted reference per unit (10x single price for kits). */
  baseCents: number;
  quantity: number;
};

export type CodeRule = {
  id?: string;
  code: string;
  kind: "referral" | "member";
  discountType: "percent" | "fixed";
  /** Percent (0-100) or dollars for fixed. */
  value: number;
  minSpendCents: number;
  combineMultibuy: boolean;
  combineCrypto: boolean;
  combineCredit: boolean;
};

export type Quote = {
  itemsCents: number;
  baseCents: number;
  kitSavingsCents: number;
  units: number;
  multibuyPercent: number;
  multibuyCents: number;
  cryptoPercent: number;
  cryptoCents: number;
  capPercent: number;
  capApplied: boolean;
  codeApplied: boolean;
  code: string | null;
  codeCents: number;
  creditUnits: number;
  creditCents: number;
  merchandiseCents: number;
  shippingCents: number;
  freeShippingCents: number;
  totalCents: number;
  remainingForFreeShippingCents: number;
  notices: string[];
};

export const toCents = (dollars: number) => Math.round(Number(dollars) * 100);
export const fromCents = (cents: number) => Math.round(cents) / 100;

export function multibuyPercentFor(units: number, settings: PricingSettings) {
  let percent = 0;
  for (const t of settings.multibuyTiers) if (units >= t.units) percent = t.percent;
  return percent;
}

function evaluate(
  input: QuoteInput,
  s: PricingSettings,
  code: CodeRule | null,
): Quote & { codeError?: string | undefined } {
  const notices: string[] = [];
  const itemsCents = input.lines.reduce((a, l) => a + Math.round(l.unitCents) * l.quantity, 0);
  const baseCents = Math.max(
    itemsCents,
    input.lines.reduce((a, l) => a + Math.round(Math.max(l.baseCents, l.unitCents)) * l.quantity, 0),
  );
  const kitSavingsCents = Math.max(0, baseCents - itemsCents);
  const units = input.lines.reduce((a, l) => a + l.quantity, 0);

  let mb = itemsCents > 0 ? multibuyPercentFor(units, s) : 0;
  let cr = itemsCents > 0 && input.paymentMethod === "crypto" ? s.cryptoPercent : 0;
  if (!s.allowMultibuyCrypto && mb > 0 && cr > 0) {
    if (mb >= cr) cr = 0;
    else mb = 0;
  }
  if (code) {
    if (!(s.allowCodeMultibuy && code.combineMultibuy)) mb = 0;
    if (!(s.allowCodeCrypto && code.combineCrypto)) cr = 0;
  }
  const pct = mb + cr;
  const raw = Math.round((itemsCents * pct) / 100);
  const room = Math.max(0, Math.floor((baseCents * s.combinedCapPercent) / 100) - kitSavingsCents);
  const pctCents = Math.min(raw, room);
  const capApplied = pctCents < raw;
  const multibuyCents = pct > 0 ? Math.round((pctCents * mb) / pct) : 0;
  const cryptoCents = pctCents - multibuyCents;
  const afterPct = itemsCents - pctCents;

  let codeCents = 0;
  let codeError: string | undefined;
  if (code) {
    if (itemsCents < code.minSpendCents) {
      codeError = `Code ${code.code} needs a minimum spend of $${(code.minSpendCents / 100).toFixed(2)}.`;
    } else if (code.discountType === "percent") {
      codeCents = Math.round((afterPct * Math.min(100, Math.max(0, code.value))) / 100);
    } else {
      codeCents = Math.min(toCents(Math.max(0, code.value)), afterPct);
    }
  }
  const afterCode = afterPct - codeCents;

  let creditUnits = 0;
  let creditCents = 0;
  const requested = Math.max(0, Math.floor(input.creditUnits ?? 0));
  if (requested > 0) {
    const codeOk = !code || (s.allowCreditCode && code.combineCredit);
    const discountsOk = pctCents === 0 || s.allowCreditDiscounts;
    if (!codeOk) notices.push("Store credit can't be combined with this code.");
    else if (!discountsOk) notices.push("Store credit can't be combined with multi-buy or crypto discounts.");
    else {
      const maxByMerch = Math.floor(afterCode / s.creditUnitCents);
      creditUnits = Math.min(requested, s.maxCreditUnits, Math.max(0, input.availableCreditUnits ?? requested), maxByMerch);
      creditCents = creditUnits * s.creditUnitCents;
      if (creditUnits < requested) notices.push(`Only ${creditUnits} credit unit(s) can be used on this order.`);
    }
  }
  const merchandiseCents = Math.max(0, afterCode - creditCents);

  const option = SHIPPING_OPTIONS.find((o) => o.key === input.shippingMethod) ?? SHIPPING_OPTIONS[1]!;
  const threshold = toCents(FREE_SHIPPING_THRESHOLD);
  const qualifies = afterPct >= threshold;
  const shippingCents = itemsCents <= 0 || qualifies ? 0 : toCents(option.price);

  return {
    itemsCents,
    baseCents,
    kitSavingsCents,
    units,
    multibuyPercent: mb,
    multibuyCents,
    cryptoPercent: cr,
    cryptoCents,
    capPercent: s.combinedCapPercent,
    capApplied,
    codeApplied: Boolean(code) && !codeError,
    code: code && !codeError ? code.code : null,
    codeCents,
    creditUnits,
    creditCents,
    merchandiseCents,
    shippingCents,
    freeShippingCents: qualifies && itemsCents > 0 ? toCents(option.price) : 0,
    totalCents: itemsCents <= 0 ? 0 : merchandiseCents + shippingCents,
    remainingForFreeShippingCents: Math.max(0, threshold - afterPct),
    notices,
    codeError,
  };
}

export type QuoteInput = {
  lines: PriceLine[];
  shippingMethod: ShippingMethodKey;
  paymentMethod: string;
  code?: CodeRule | null;
  creditUnits?: number;
  availableCreditUnits?: number;
};

/**
 * Price an order. When a code can't stack with active discounts, the
 * cheaper outcome for the customer wins and a notice explains why.
 */
export function quoteOrder(input: QuoteInput, settings: PricingSettings = DEFAULT_PRICING_SETTINGS): Quote {
  const without = evaluate(input, settings, null);
  if (!input.code) {
    const { codeError: _e, ...q } = without;
    return q;
  }
  const withCode = evaluate(input, settings, input.code);
  if (withCode.codeError) {
    const { codeError, ...q } = without;
    return { ...q, notices: codeError ? [...q.notices, codeError] : q.notices };
  }
  if (without.totalCents < withCode.totalCents) {
    const { codeError: _e, ...q } = without;
    // A valid referral code still credits the referrer even when the
    // customer's other discounts beat the code's own discount.
    const keepReferral = input.code.kind === "referral";
    return {
      ...q,
      ...(keepReferral ? { code: input.code.code, codeApplied: true, codeCents: 0 } : {}),
      notices: [
        ...q.notices,
        keepReferral && input.code.value > 0
          ? `Code ${input.code.code} is recorded, but your current discounts save more, so they were kept.`
          : keepReferral
            ? `Code ${input.code.code} is recorded.`
            : `Code ${input.code.code} doesn't combine with your current discounts, so the better saving was kept.`,
      ],
    };
  }
  const { codeError: _e, ...q } = withCode;
  return q;
}
