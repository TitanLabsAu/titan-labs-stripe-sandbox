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
    ? `Enjoy ${fmtPct(c.percent ?? 0)} off products on every eligible order, applied seamlessly at checkout whenever you're signed in.`
    : `Enjoy ${fmtAud(c.fixed_cents ?? 0)} off products on every eligible order, deducted automatically at checkout whenever you're signed in. Your saving applies to products only, up to their value.`;
  const allowed = [
    c.stack_multibuy && "multi-buy savings",
    c.stack_crypto && "the crypto payment discount",
    c.stack_code && "discount codes",
    c.stack_credit && "your referral rewards",
  ].filter(Boolean) as string[];
  const combos: string[] = [];
  if (allowed.length) combos.push(`Stackable Perks: Combine your Club discount with ${allowed.join(", ")}.`);
  if (c.stack_first_offer) combos.push("It can also combine with the new-member first-purchase offer, but only if you are still eligible for that offer.");
  if (c.stack_foundation) combos.push("If you hold Foundation Member status, your Club benefit can combine with it.");
  if (!allowed.length && !c.stack_first_offer && !c.stack_foundation) combos.push("Guaranteed Best Price: Your Club benefit applies on its own. If another saving is available, checkout automatically applies whichever single option saves you more.");
  else combos.push("Guaranteed Best Price: If a specific promotion cannot combine, checkout automatically calculates and applies whichever option saves you more.");
  const cap = `Maximum Savings: Combined Club checkout discounts can reach up to your exclusive ${fmtPct(c.max_cap_percent)} order cap. If checkout uses standard pricing instead, the website's usual cap applies. Shipping is not part of either cap.`;
  const kits = "Pre-discounted Items: Sale items, Range kits and starter kits already include built-in savings and retain their special pricing.";
  const shipping = c.free_shipping ? "Free shipping on every order, with no minimum spend." : null;
  const terms = "Your benefits apply while your Club membership and The Titan Club programme are active.";
  return { benefitHeadline, benefit, combos, cap, kits, shipping, terms };
}

export function clubWelcomeSubject(d: { firstName?: string }) {
  return d.firstName ? `You're in: Welcome to The Titan Club, ${d.firstName}` : "You're in: Welcome to The Titan Club";
}

/** Honest Admin toast after saving a membership; never claims inbox delivery. */
export function clubSaveMessage(r: { changed: boolean; welcome?: "sent" | "queued" | "none" }): string {
  if (!r.changed) return "No changes to save";
  if (r.welcome === "sent") return "Titan Club updated. Welcome email handed to the email service.";
  if (r.welcome === "queued") return "Titan Club updated. Welcome email is queued and will go out on the next hourly send.";
  return "Titan Club updated";
}
