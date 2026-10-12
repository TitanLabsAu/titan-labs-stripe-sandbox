import type { Product } from "./products";
import { hotProductSelections } from "./product-promotions";
import { featuredSlugs } from "./homeContent";

/** Bumping this re-keys the queue/idempotency for a new template generation. */
export const WELCOME_TEMPLATE_VERSION = "v1";
export const WELCOME_TEMPLATE = "member-welcome";
export const WELCOME_ORIGIN = "https://titanlabsaus.com";
/** Hourly retries for ~2 days while a referral code is not yet issued. */
export const WELCOME_MAX_ATTEMPTS = 48;

export type WelcomeProductCard = { name: string; size: string | null; url: string; imageUrl: string; alt: string };
export type WelcomeSettings = {
  program_enabled: boolean;
  reward_every_referrals: number;
  reward_percent: number;
  reward_expiry_days: number;
  combined_cap_percent: number;
  crypto_percent: number;
  multibuy_tiers: { units: number; percent: number }[];
  first_offer_enabled: boolean;
  first_offer_percent: number;
  first_offer_combine_multibuy: boolean;
  first_offer_combine_crypto: boolean;
  first_offer_combine_code: boolean;
  first_offer_combine_credit: boolean;
};
export type WelcomeEmailData = {
  firstName: string;
  referralCode: string;
  products: WelcomeProductCard[];
  settings: WelcomeSettings;
  demo?: boolean;
};

export function absoluteUrl(path: string) {
  if (/^https:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${WELCOME_ORIGIN}${path}`;
  return "";
}

/** Same selector/order as the homepage Hot Products strip; never padded. */
export function welcomeHotProducts(products: Product[], content: Record<string, string> | undefined): WelcomeProductCard[] {
  return hotProductSelections(products, featuredSlugs(content)).slice(0, 4).flatMap((p) => {
    const v = p.variants?.[0];
    const imageUrl = absoluteUrl(p.image);
    if (!imageUrl) return [];
    const q = v ? `?variant=${encodeURIComponent(v.id)}` : "";
    return [{ name: p.name, size: v?.label ?? null, url: `${WELCOME_ORIGIN}/product/${encodeURIComponent(p.slug)}${q}`, imageUrl, alt: p.alt || p.name }];
  });
}

export function settingsFromDb(row: any): WelcomeSettings {
  const n = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    program_enabled: Boolean(row?.program_enabled),
    reward_every_referrals: Math.max(1, n(row?.reward_every_referrals, 5)),
    reward_percent: n(row?.reward_percent),
    reward_expiry_days: n(row?.reward_expiry_days),
    combined_cap_percent: n(row?.combined_cap_percent),
    crypto_percent: n(row?.crypto_percent),
    multibuy_tiers: (Array.isArray(row?.multibuy_tiers) ? row.multibuy_tiers : [])
      .map((t: any) => ({ units: n(t?.units), percent: n(t?.percent) }))
      .filter((t: any) => t.units > 0 && t.percent > 0)
      .sort((a: any, b: any) => a.units - b.units),
    first_offer_enabled: Boolean(row?.first_offer_enabled),
    first_offer_percent: n(row?.first_offer_percent),
    first_offer_combine_multibuy: Boolean(row?.first_offer_combine_multibuy),
    first_offer_combine_crypto: Boolean(row?.first_offer_combine_crypto),
    first_offer_combine_code: Boolean(row?.first_offer_combine_code),
    first_offer_combine_credit: Boolean(row?.first_offer_combine_credit),
  };
}

/** Plain sentences reused by HTML and text versions so both state the same terms. */
export function welcomeCopy(s: WelcomeSettings) {
  const combos = [
    s.first_offer_combine_multibuy && "multi-buy savings",
    s.first_offer_combine_crypto && "the crypto payment discount",
    s.first_offer_combine_code && "a discount code",
    s.first_offer_combine_credit && "store credit",
  ].filter(Boolean) as string[];
  const offer = s.first_offer_enabled && s.first_offer_percent > 0
    ? `No code needed: sign in with this account at checkout and the discount is applied automatically to your first paid order.${combos.length ? ` It can be used together with ${combos.join(", ")}, subject to the ${s.combined_cap_percent}% combined discount cap.` : ""}`
    : null;
  const tiers = s.multibuy_tiers.map((t) => `${t.units}+ items: ${t.percent}% off`);
  const discounts = [
    tiers.length ? `Multi-buy: ${tiers.join(" · ")}.` : null,
    s.crypto_percent > 0 ? `Pay with crypto (BTC, ETH or USDT): ${s.crypto_percent}% off.` : null,
    s.combined_cap_percent > 0 ? `Combined discounts are capped at ${s.combined_cap_percent}% per order, and not every discount combines with every other.` : null,
  ].filter(Boolean) as string[];
  const referral = s.program_enabled
    ? `Share your code with friends who are new to Titan Labs Aus. Your code is for them to use, not for your own orders. For every ${s.reward_every_referrals} paid orders placed with your code, you earn a ${s.reward_percent}% reward${s.reward_expiry_days > 0 ? ` that expires after ${s.reward_expiry_days} days` : ""}.`
    : null;
  return { offer, discounts, referral };
}

export function welcomeSubject(d: { firstName?: string }) {
  return d.firstName ? `Welcome to Titan Labs Aus, ${d.firstName}` : "Welcome to Titan Labs Aus";
}
