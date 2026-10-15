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
  /** Percent off per referral reward (one reward per `rewardEvery` paid referrals). */
  rewardPercent: number;
  rewardEvery: number;
  rewardExpiryDays: number;
  programEnabled: boolean;
  firstOffer: FirstOfferSettings;
};

/** New-member first-purchase offer (admin configurable). */
export type FirstOfferSettings = {
  enabled: boolean;
  percent: number;
  combineMultibuy: boolean;
  combineCrypto: boolean;
  combineCode: boolean;
  combineCredit: boolean;
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
  rewardPercent: 10,
  rewardEvery: 5,
  rewardExpiryDays: 90,
  programEnabled: true,
  firstOffer: {
    enabled: true,
    percent: 10,
    combineMultibuy: false,
    combineCrypto: false,
    combineCode: false,
    combineCredit: false,
  },
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
    creditUnitCents: 1000, // fixed AUD10 denomination
    maxCreditUnits: num(row.max_credit_units, d.maxCreditUnits),
    referralRewardUnits: num(row.referral_reward_units, d.referralRewardUnits),
    rewardPercent: Math.min(100, Math.max(0, num(row.reward_percent, d.rewardPercent))),
    rewardEvery: Math.max(1, Math.floor(num(row.reward_every_referrals, d.rewardEvery))),
    rewardExpiryDays: Math.max(1, Math.floor(num(row.reward_expiry_days, d.rewardExpiryDays))),
    programEnabled: row.program_enabled ?? d.programEnabled,
    firstOffer: {
      enabled: row.first_offer_enabled ?? d.firstOffer.enabled,
      percent: Math.min(100, Math.max(0, num(row.first_offer_percent, d.firstOffer.percent))),
      combineMultibuy: row.first_offer_combine_multibuy ?? d.firstOffer.combineMultibuy,
      combineCrypto: row.first_offer_combine_crypto ?? d.firstOffer.combineCrypto,
      combineCode: row.first_offer_combine_code ?? d.firstOffer.combineCode,
      combineCredit: row.first_offer_combine_credit ?? d.firstOffer.combineCredit,
    },
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
  firstOfferApplied: boolean;
  firstOfferPercent: number;
  firstOfferCents: number;
  /** Foundation Member permanent benefit (server-verified awards only). */
  foundationApplied: boolean;
  foundationPercent: number;
  foundationCents: number;
  /** True when the combined cap reduced (or zeroed) the Foundation saving. */
  foundationCapReached: boolean;
  /** Titan Club admin-assigned benefit (server-verified only). */
  clubApplied: boolean;
  clubType: "percent" | "fixed" | null;
  clubPercent: number;
  clubFixedCents: number;
  clubCents: number;
  clubCapReached: boolean;
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
  offer: FirstOfferSettings | null = null,
): Quote & { codeError?: string | undefined } {
  const notices: string[] = [];
  // An active Titan Club member's personal maximum replaces the site-wide combined cap (products only).
  const club = sanitizeClub(input.club);
  if (club) s = { ...s, combinedCapPercent: club.maxCapPercent };
  const itemsCents = input.lines.reduce((a, l) => a + Math.round(l.unitCents) * l.quantity, 0);
  const baseCents = Math.max(
    itemsCents,
    input.lines.reduce((a, l) => a + Math.round(Math.max(l.baseCents, l.unitCents)) * l.quantity, 0),
  );
  const kitSavingsCents = Math.max(0, baseCents - itemsCents);
  const units = input.lines.reduce((a, l) => a + l.quantity, 0);

  const blocked = (input as InternalQuoteInput)._block;
  let mb = itemsCents > 0 && !blocked?.multibuy ? multibuyPercentFor(units, s) : 0;
  let cr = itemsCents > 0 && !blocked?.crypto && input.paymentMethod === "crypto" ? s.cryptoPercent : 0;
  if (!s.allowMultibuyCrypto && mb > 0 && cr > 0) {
    if (mb >= cr) cr = 0;
    else mb = 0;
  }
  if (code) {
    if (!(s.allowCodeMultibuy && code.combineMultibuy)) mb = 0;
    if (!(s.allowCodeCrypto && code.combineCrypto)) cr = 0;
  }
  if (offer) {
    if (!offer.combineMultibuy) mb = 0;
    if (!offer.combineCrypto) cr = 0;
  }
  const pct = mb + cr;
  const raw = Math.round((itemsCents * pct) / 100);
  const room = Math.max(0, Math.floor((baseCents * s.combinedCapPercent) / 100) - kitSavingsCents);
  const pctCents = Math.min(raw, room);
  const capApplied = pctCents < raw;
  const multibuyCents = pct > 0 ? Math.round((pctCents * mb) / pct) : 0;
  const cryptoCents = pctCents - multibuyCents;
  const afterPct = itemsCents - pctCents;

  // First-purchase offer: item subtotal only, and it shares the combined cap.
  let offerCents = 0;
  if (offer) {
    const want = Math.round((afterPct * Math.min(100, Math.max(0, offer.percent))) / 100);
    offerCents = Math.max(0, Math.min(want, room - pctCents));
  }
  const afterOffer = afterPct - offerCents;

  let codeCents = 0;
  let codeError: string | undefined;
  if (code) {
    if (itemsCents < code.minSpendCents) {
      codeError = `Code ${code.code} needs a minimum spend of $${(code.minSpendCents / 100).toFixed(2)}.`;
    } else if (code.discountType === "percent") {
      codeCents = Math.round((afterOffer * Math.min(100, Math.max(0, code.value))) / 100);
    } else {
      codeCents = Math.min(toCents(Math.max(0, code.value)), afterOffer);
    }
  }
  if (offer) codeCents = Math.min(codeCents, Math.max(0, room - pctCents - offerCents));
  // Foundation Member: permanent automatic benefit, applied BEFORE consumable referral rewards.
  // For members the TOTAL discount (kit savings included) never exceeds the combined cap.
  const fPct = Math.min(100, Math.max(0, Number(input.foundationPercent) || 0));
  const capCents = Math.floor((baseCents * s.combinedCapPercent) / 100);
  if ((fPct > 0 || club) && itemsCents > 0) {
    const over = baseCents - (afterOffer - codeCents) - capCents;
    if (over > 0) codeCents -= Math.min(over, codeCents);
  }
  let foundationCents = 0;
  let foundationCapReached = false;
  if (fPct > 0 && itemsCents > 0) {
    const want = Math.round((baseCents * fPct) / 100);
    const roomLeft = Math.max(0, capCents - (baseCents - (afterOffer - codeCents)));
    foundationCents = Math.max(0, Math.min(want, roomLeft, afterOffer - codeCents));
    foundationCapReached = foundationCents < want;
    if (foundationCapReached)
      notices.push(
        foundationCents === 0
          ? `Your other discounts already reach the ${s.combinedCapPercent}% maximum, so your Foundation Member 5% couldn't add more this time.`
          : `Your Foundation Member saving was reduced so total savings stay within the ${s.combinedCapPercent}% maximum.`,
      );
  }
  // Titan Club: after Foundation, before consumable referral rewards; products only, shares the cap.
  let clubCents = 0;
  let clubCapReached = false;
  if (club && itemsCents > 0) {
    const want = club.type === "percent" ? Math.round((itemsCents * club.percent) / 100) : club.fixedCents;
    const left = afterOffer - codeCents - foundationCents;
    const roomLeft = Math.max(0, capCents - (baseCents - left));
    clubCents = Math.max(0, Math.min(want, roomLeft, left));
    clubCapReached = clubCents < want;
    if (clubCapReached)
      notices.push(
        clubCents === 0
          ? `Your other discounts already reach the ${s.combinedCapPercent}% maximum, so your Titan Club benefit couldn't add more this time.`
          : `Your Titan Club saving was reduced so total savings stay within the ${s.combinedCapPercent}% maximum.`,
      );
  }
  const afterCode = afterOffer - codeCents - foundationCents - clubCents;

  let creditUnits = 0;
  let creditCents = 0;
  const requested = Math.max(0, Math.floor(input.creditUnits ?? 0));
  if (requested > 0) {
    const codeOk = !code || (s.allowCreditCode && code.combineCredit);
    const discountsOk = pctCents === 0 || s.allowCreditDiscounts;
    if (offer && offerCents > 0 && !offer.combineCredit) notices.push("Referral rewards can't be combined with the first-purchase offer.");
    else if (!codeOk) notices.push("Referral rewards can't be combined with this code.");
    else if (!discountsOk) notices.push("Referral rewards can't be combined with multi-buy or crypto discounts.");
    else {
      // Each referral reward takes rewardPercent off the products; all discounts share the combined cap.
      const perUnit = Math.round((afterCode * s.rewardPercent) / 100);
      const capRoom = Math.max(0, Math.floor((baseCents * s.combinedCapPercent) / 100) - (baseCents - afterCode));
      const usable = perUnit > 0 ? Math.ceil(Math.min(capRoom, afterCode) / perUnit) : 0;
      creditUnits = Math.min(requested, s.maxCreditUnits, Math.max(0, input.availableCreditUnits ?? requested), usable);
      creditCents = Math.min(creditUnits * perUnit, capRoom, afterCode);
      if (creditUnits < requested)
        notices.push(
          creditUnits === 0
            ? `Your discounts already reach the ${s.combinedCapPercent}% maximum, so no referral reward was used.`
            : `Only ${creditUnits} referral reward(s) can be used — the ${s.combinedCapPercent}% maximum applies.`,
        );
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
    firstOfferApplied: offerCents > 0,
    firstOfferPercent: offerCents > 0 && offer ? offer.percent : 0,
    firstOfferCents: offerCents,
    foundationApplied: foundationCents > 0,
    foundationPercent: foundationCents > 0 ? fPct : 0,
    foundationCents,
    foundationCapReached,
    clubApplied: clubCents > 0,
    clubType: club ? club.type : null,
    clubPercent: club?.type === "percent" ? club.percent : 0,
    clubFixedCents: club?.type === "fixed" ? club.fixedCents : 0,
    clubCents,
    clubCapReached,
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
  /** Server-verified only: the buyer is a member eligible for the first-purchase offer. */
  firstOfferEligible?: boolean;
  /** Server-verified only: Foundation Member benefit percent (0 when not awarded). */
  foundationPercent?: number;
  /** Server-verified only: active Titan Club benefit (null for non-members). */
  club?: ClubBenefit | null;
};

/** Per-member Titan Club stacking policy (all editable by Admin). */
export type ClubStacking = { multibuy: boolean; crypto: boolean; firstOffer: boolean; code: boolean; credit: boolean; foundation: boolean };
/** Defaults for NEW assignments: Foundation off, everything else on. */
export const DEFAULT_CLUB_STACKING: ClubStacking = { multibuy: true, crypto: true, firstOffer: true, code: true, credit: true, foundation: false };
/** Behaviour of rows saved before stacking columns existed (everything combined). */
export const LEGACY_CLUB_STACKING: ClubStacking = { ...DEFAULT_CLUB_STACKING, foundation: true };
type InternalQuoteInput = QuoteInput & { _block?: { multibuy: boolean; crypto: boolean } };

export type ClubBenefit = ({ type: "percent"; percent: number; fixedCents?: 0 } | { type: "fixed"; fixedCents: number; percent?: 0 }) & {
  /** Personal maximum combined product discount, 0.01–100 (2dp). */
  maxCapPercent: number;
  /** Which EXTRA checkout discounts may combine with Club (missing = all allowed, legacy behaviour). */
  stacking?: Partial<ClubStacking>;
};

/** True for a finite value in (0, max] with at most 2 decimals (integer basis points). */
export function isTwoDpPercent(v: unknown, max = 100) {
  const n = Number(v);
  return typeof v !== "boolean" && Number.isFinite(n) && n > 0 && n <= max && Math.abs(Math.round(n * 100) - n * 100) < 1e-9;
}

export function sanitizeStacking(v: Partial<ClubStacking> | null | undefined, fallback: ClubStacking = LEGACY_CLUB_STACKING): ClubStacking {
  const o = { ...fallback };
  for (const k of Object.keys(o) as (keyof ClubStacking)[]) if (v && typeof v[k] === "boolean") o[k] = v[k] as boolean;
  return o;
}

type CleanClub = ({ type: "percent"; percent: number; fixedCents: 0 } | { type: "fixed"; percent: 0; fixedCents: number }) & { maxCapPercent: number; stacking: ClubStacking };

/** Strict: percent 0.01–100, fixed 1c–$1000 integer cents, max cap 0.01–100; anything else = no benefit. */
export function sanitizeClub(c: ClubBenefit | null | undefined): CleanClub | null {
  if (!c || !isTwoDpPercent(c.maxCapPercent)) return null;
  const maxCapPercent = Math.round(Number(c.maxCapPercent) * 100) / 100;
  const stacking = sanitizeStacking(c.stacking);
  if (c.type === "percent") {
    if (!isTwoDpPercent(c.percent)) return null;
    return { type: "percent", percent: Math.round(Number(c.percent) * 100) / 100, fixedCents: 0, maxCapPercent, stacking };
  }
  if (c.type === "fixed") {
    const f = Number(c.fixedCents);
    if (!Number.isInteger(f) || f <= 0 || f > 100000) return null;
    return { type: "fixed", percent: 0, fixedCents: f, maxCapPercent, stacking };
  }
  return null;
}

/**
 * Price an order. When a code can't stack with active discounts, the
 * cheaper outcome for the customer wins and a notice explains why.
 */
export function quoteOrder(input: QuoteInput, settings: PricingSettings = DEFAULT_PRICING_SETTINGS): Quote {
  const club = sanitizeClub(input.club);
  const normal = quoteCore({ ...input, club: null }, settings);
  if (!club) return normal;
  // Club branch: only the member's allowed extra discounts (incl. Foundation when switched on) apply.
  // Global/first-offer/code rules still restrict further — Club permission can't bypass them.
  const st = club.stacking;
  const clubInput: InternalQuoteInput = {
    ...input,
    club,
    foundationPercent: st.foundation ? input.foundationPercent : 0,
    firstOfferEligible: Boolean(input.firstOfferEligible) && st.firstOffer,
    creditUnits: st.credit ? input.creditUnits : 0,
    code: st.code ? input.code : null,
    _block: { multibuy: !st.multibuy, crypto: !st.crypto },
  };
  let cq = quoteCore(clubInput, settings);
  if (!st.code && input.code) {
    const c = input.code;
    const itemsOk = cq.itemsCents >= c.minSpendCents;
    // A valid referral code still records attribution (zero saving); member codes are simply not applied.
    cq = c.kind === "referral" && itemsOk
      ? { ...cq, code: c.code, codeApplied: true, codeCents: 0, notices: [...cq.notices, `Code ${c.code} is recorded, but discount codes don't combine with your Titan Club benefit.`] }
      : { ...cq, notices: [...cq.notices, `Code ${c.code} doesn't combine with your Titan Club benefit.`] };
  }
  if (!st.credit && (input.creditUnits ?? 0) > 0)
    cq = { ...cq, notices: [...cq.notices, "Referral rewards don't combine with your Titan Club benefit, so none were used."] };
  const consumed = (q: Quote) => q.creditUnits + (q.firstOfferApplied ? 1 : 0);
  const useClub =
    cq.totalCents < normal.totalCents ||
    (cq.clubCents > 0 && cq.totalCents === normal.totalCents && consumed(cq) <= consumed(normal));
  if (useClub) {
    return normal.foundationCents > 0 && cq.foundationCents === 0
      ? { ...cq, notices: [...cq.notices, "Foundation Member 5% doesn't combine with Titan Club — your Titan Club benefit was applied as it saves more."] }
      : cq;
  }
  // Normal branch wins: standard cap only, personal Club cap does not leak.
  return {
    ...normal,
    clubType: club.type,
    clubPercent: club.type === "percent" ? club.percent : 0,
    clubFixedCents: club.type === "fixed" ? club.fixedCents : 0,
    notices: [...normal.notices, "Your standard discounts save more than your Titan Club benefit on this order, so they were applied instead."],
  };
}

function quoteCore(input: QuoteInput, settings: PricingSettings): Quote {
  const base = quoteWithoutOffer(input, settings);
  const offer = settings.firstOffer;
  if (!input.firstOfferEligible || !offer?.enabled || !(offer.percent > 0)) return base;
  let offerCode = input.code && offer.combineCode ? input.code : null;
  let w = evaluate(input, settings, offerCode, offer);
  if (offerCode && w.codeError) {
    offerCode = null;
    w = evaluate(input, settings, null, offer);
  }
  // Better-of: the offer is only used when it beats the customer's other discounts.
  if (!w.firstOfferApplied || w.totalCents >= base.totalCents) return base;
  const { codeError: _e, ...q } = w;
  const notices = [...q.notices];
  if (input.code && !offerCode) {
    const keepReferral = input.code.kind === "referral";
    notices.push(
      keepReferral
        ? `Code ${input.code.code} is recorded, but your first-purchase offer saves more, so it was applied.`
        : `Your first-purchase offer saves more than code ${input.code.code}, so the offer was applied.`,
    );
    if (keepReferral) return { ...q, code: input.code.code, codeApplied: true, codeCents: 0, notices };
  }
  return { ...q, notices };
}

function quoteWithoutOffer(input: QuoteInput, settings: PricingSettings): Quote {
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

/** Customer-facing label for a Club benefit, e.g. "7.5% off" or "$10.00 off". */
export function clubLabel(q: Pick<Quote, "clubType" | "clubPercent" | "clubFixedCents">) {
  return q.clubType === "fixed" ? `$${fromCents(q.clubFixedCents).toFixed(2)} off` : `${q.clubPercent}% off`;
}

/** Refuse to create an order/payment when the server price differs from what the customer was shown. */
export function assertExpectedTotal(expected: unknown, actualCents: number) {
  if (expected === undefined || expected === null) return;
  if (typeof expected !== "number" || !Number.isInteger(expected) || expected !== actualCents)
    throw new Error("Your order summary has been updated (for example, a member benefit changed). Please review the new total and try again.");
}
