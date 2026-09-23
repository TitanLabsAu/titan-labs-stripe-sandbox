import { homeValue, type PaymentMethodKey } from "./homeContent";

/** The Titan Stack: buy more units, save more. */
export const STACK_TIERS = [
  { units: 2, percent: 10 },
  { units: 3, percent: 15 },
  { units: 4, percent: 20 },
] as const;

export const CRYPTO_DISCOUNT_PERCENT = 10;
export const FREE_SHIPPING_THRESHOLD = 200;

export type ShippingMethodKey = "standard" | "express";

export const SHIPPING_OPTIONS: {
  key: ShippingMethodKey;
  label: string;
  eta: string;
  price: number;
}[] = [
  { key: "standard", label: "Standard Tracked Shipping", eta: "3 to 7 business days", price: 10 },
  { key: "express", label: "Express Shipping + Insurance", eta: "1 to 4 business days", price: 20 },
];

export function stackPercentFor(units: number) {
  let percent = 0;
  for (const tier of STACK_TIERS) {
    if (units >= tier.units) percent = tier.percent;
  }
  return percent;
}

/** Units still needed before the next stack tier unlocks. */
export function nextStackTier(units: number) {
  return STACK_TIERS.find((tier) => units < tier.units) ?? null;
}

const round = (value: number) => Math.round(value * 100) / 100;

export type OrderTotals = {
  subtotal: number;
  units: number;
  stackPercent: number;
  stackDiscount: number;
  cryptoPercent: number;
  cryptoDiscount: number;
  discountTotal: number;
  itemsTotal: number;
  shipping: number;
  freeShipping: number;
  total: number;
  remainingForFreeShipping: number;
};

export function computeTotals({
  subtotal,
  units,
  shippingMethod,
  paymentMethod,
}: {
  subtotal: number;
  units: number;
  shippingMethod: ShippingMethodKey;
  paymentMethod: PaymentMethodKey;
}): OrderTotals {
  const stackPercent = subtotal > 0 ? stackPercentFor(units) : 0;
  const stackDiscount = round((subtotal * stackPercent) / 100);
  const afterStack = round(subtotal - stackDiscount);
  const cryptoPercent = subtotal > 0 && paymentMethod === "crypto" ? CRYPTO_DISCOUNT_PERCENT : 0;
  const cryptoDiscount = round((afterStack * cryptoPercent) / 100);
  const itemsTotal = round(afterStack - cryptoDiscount);

  const option = SHIPPING_OPTIONS.find((o) => o.key === shippingMethod) ?? SHIPPING_OPTIONS[1]!;
  const qualifies = itemsTotal >= FREE_SHIPPING_THRESHOLD;
  const shipping = subtotal <= 0 || qualifies ? 0 : option.price;

  return {
    subtotal: round(subtotal),
    units,
    stackPercent,
    stackDiscount,
    cryptoPercent,
    cryptoDiscount,
    discountTotal: round(stackDiscount + cryptoDiscount),
    itemsTotal,
    shipping,
    freeShipping: qualifies && subtotal > 0 ? option.price : 0,
    total: subtotal <= 0 ? 0 : round(itemsTotal + shipping),
    remainingForFreeShipping: Math.max(0, round(FREE_SHIPPING_THRESHOLD - itemsTotal)),
  };
}

export type CryptoOption = {
  id: string;
  label: string;
  network: string;
  wallet: string;
  audPerUnit: number | null;
};

/**
 * Crypto options are edited in Admin as one line per coin:
 * `USDC | Ethereum (ERC-20) | 0xWallet... | 1.52`
 * (the last number is how many AUD one coin is worth).
 */
export function parseCryptoOptions(content: Record<string, string> | undefined): CryptoOption[] {
  const raw = homeValue(content, "payment_crypto_options").trim();
  const options: CryptoOption[] = [];

  for (const line of raw.split("\n")) {
    const parts = line.split("|").map((p) => p.trim());
    if (!parts[0]) continue;
    const rate = Number(parts[3]);
    options.push({
      id: `${parts[0]}-${options.length}`,
      label: parts[0],
      network: parts[1] ?? "",
      wallet: parts[2] ?? "",
      audPerUnit: Number.isFinite(rate) && rate > 0 ? rate : null,
    });
  }

  if (options.length === 0) {
    const wallet = homeValue(content, "payment_crypto_wallet").trim();
    const rate = Number(homeValue(content, "payment_crypto_rate"));
    options.push({
      id: "default",
      label: homeValue(content, "payment_crypto_label") || "USDC",
      network: homeValue(content, "payment_crypto_network"),
      wallet,
      audPerUnit: Number.isFinite(rate) && rate > 0 ? rate : null,
    });
  }

  return options;
}

export function cryptoAmountFor(amountAud: number, option: CryptoOption) {
  if (!option.audPerUnit || amountAud <= 0) return null;
  const amount = amountAud / option.audPerUnit;
  const decimals = amount < 1 ? 6 : amount < 100 ? 4 : 2;
  return amount.toFixed(decimals);
}
