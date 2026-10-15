/** Titan Club congratulations email: shared types and plain-language copy (HTML + text use the same sentences). */
export const CLUB_WELCOME_TEMPLATE = "titan-club-welcome";
export const CLUB_WELCOME_ORIGIN = "https://titanlabsaus.com";
export const CLUB_WELCOME_MAX_ATTEMPTS = 24;

/** Final saved membership captured at commit. Deliberately has no note field. */
export type ClubSnapshot = {
  benefit_type: "percent" | "fixed";
  percent: number | null;
  fixed_cents: number | null;
  max_cap_percent: number;
  stack_multibuy: boolean;
  stack_crypto: boolean;
  stack_first_offer: boolean;
  stack_code: boolean;
  stack_credit: boolean;
  stack_foundation: boolean;
  free_shipping: boolean;
};

export type ClubWelcomeData = { firstName: string; club: ClubSnapshot; demo?: boolean };

const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const bool = (v: unknown) => v === true;

/** Strict parse: only known fields survive, so nothing private can reach the template. */
export function parseClubSnapshot(raw: any): ClubSnapshot | null {
  if (!raw || (raw.benefit_type !== "percent" && raw.benefit_type !== "fixed")) return null;
  const percent = num(raw.percent), fixed = num(raw.fixed_cents), cap = num(raw.max_cap_percent);
  if (raw.benefit_type === "percent" && !(percent && percent > 0)) return null;
  if (raw.benefit_type === "fixed" && !(fixed && fixed > 0)) return null;
  if (!(cap && cap > 0)) return null;
  return {
    benefit_type: raw.benefit_type, percent: raw.benefit_type === "percent" ? percent : null,
    fixed_cents: raw.benefit_type === "fixed" ? Math.round(fixed!) : null, max_cap_percent: cap,
    stack_multibuy: bool(raw.stack_multibuy), stack_crypto: bool(raw.stack_crypto), stack_first_offer: bool(raw.stack_first_offer),
    stack_code: bool(raw.stack_code), stack_credit: bool(raw.stack_credit), stack_foundation: bool(raw.stack_foundation),
    free_shipping: bool(raw.free_shipping),
  };
}

const fmtPct = (n: number) => `${Number(n.toFixed(2))}%`;
const fmtAud = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")} AUD`;

export function clubWelcomeCopy(c: ClubSnapshot) {
  const benefitHeadline = c.benefit_type === "percent" ? `${fmtPct(c.percent!)} off every purchase` : `${fmtAud(c.fixed_cents!)} off every purchase`;
  const benefit = c.benefit_type === "percent"
    ? `You receive ${fmtPct(c.percent!)} off the products in every eligible order, applied automatically when you check out signed in.`
    : `You receive ${fmtAud(c.fixed_cents!)} off every eligible order, applied automatically when you check out signed in. It never takes an order below $0.`;
  const allowed = [
    c.stack_multibuy && "multi-buy savings",
    c.stack_crypto && "the crypto payment discount",
    c.stack_code && "discount codes",
    c.stack_credit && "your referral rewards",
  ].filter(Boolean) as string[];
  const combos: string[] = [];
  if (allowed.length) combos.push(`Your Club benefit can combine with ${allowed.join(", ")}.`);
  if (c.stack_first_offer) combos.push("It can also combine with the new-member first-purchase offer, but only if you are still eligible for that offer.");
  if (c.stack_foundation) combos.push("If you hold Foundation Member status, your Club benefit can combine with it.");
  if (!allowed.length && !c.stack_first_offer) combos.push("Your Club benefit applies on its own; where another saving is available, checkout keeps whichever single option gives you the lower price.");
  else combos.push("Where a saving isn't allowed to combine, checkout compares the options and keeps the one that gives you the lower price.");
  const cap = `Your personal maximum is ${fmtPct(c.max_cap_percent)}: extra savings added at checkout are capped at this amount per order.`;
  const kits = "Sale prices and kit prices already include their savings and are kept as they are.";
  const shipping = c.free_shipping ? "Free shipping on every order, with no minimum spend." : null;
  const terms = "Your benefits apply while your Club membership and The Titan Club programme are active.";
  return { benefitHeadline, benefit, combos, cap, kits, shipping, terms };
}

export function clubWelcomeSubject(d: { firstName?: string }) {
  return d.firstName ? `Congratulations ${d.firstName} — welcome to The Titan Club` : "Congratulations — welcome to The Titan Club";
}
