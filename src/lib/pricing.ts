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
  /** Live market id used to look up the current AUD price. */
  coinId: string | null;
  /** Network warning shown above the wallet address. */
  note: string;
};

/** Well known tickers mapped to their live market id. */
export const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  BITCOIN: "bitcoin",
  ETH: "ethereum",
  ETHEREUM: "ethereum",
  USDT: "tether",
  TETHER: "tether",
  USDC: "usd-coin",
  SOL: "solana",
  XRP: "ripple",
  LTC: "litecoin",
  BNB: "binancecoin",
  DOGE: "dogecoin",
};

export const DEFAULT_CRYPTO_LINES = [
  "BTC | Bitcoin network | | | bitcoin | Send BTC on the Bitcoin network only. Coins sent on any other network cannot be recovered.",
  "ETH | Ethereum (ERC-20) | | | ethereum | Send ETH on the Ethereum (ERC-20) network only. Coins sent on any other network cannot be recovered.",
  "USDT | Ethereum (ERC-20) | | | tether | Send USDT on the Ethereum (ERC-20) network only. Do not use TRC-20 (Tron), BEP-20 (BSC) or any other network, or the funds will be permanently lost.",
].join("\n");

function coinIdFor(label: string, explicit: string | undefined) {
  const given = (explicit ?? "").trim().toLowerCase();
  if (given && given !== "live") return given;
  return COIN_IDS[label.trim().toUpperCase()] ?? null;
}

/**
 * Crypto options are edited in Admin, one line per coin:
 * `USDT | Ethereum (ERC-20) | 0xWallet... | 1.52 | tether | network warning`
 */
export function parseCryptoOptions(content: Record<string, string> | undefined): CryptoOption[] {
  const configured = homeValue(content, "payment_crypto_options").trim();
  const raw = configured || DEFAULT_CRYPTO_LINES;
  const options: CryptoOption[] = [];

  for (const line of raw.split("\n")) {
    const parts = line.split("|").map((p) => p.trim());
    const label = parts[0];
    if (!label) continue;
    const rate = Number(parts[3]);
    options.push({
      id: `${label}-${options.length}`,
      label,
      network: parts[1] ?? "",
      wallet: parts[2] ?? "",
      audPerUnit: Number.isFinite(rate) && rate > 0 ? rate : null,
      coinId: coinIdFor(label, parts[4]),
      note: parts[5] ?? "",
    });
  }

  return options;
}

export function cryptoAmountFor(amountAud: number, audPerUnit: number | null) {
  if (!audPerUnit || amountAud <= 0) return null;
  const amount = amountAud / audPerUnit;
  const decimals = amount < 1 ? 6 : amount < 100 ? 4 : 2;
  return amount.toFixed(decimals);
}

/** Serialise admin crypto rows back into the stored one-line-per-coin format. */
export function serialiseCryptoOptions(
  rows: { label: string; network: string; wallet: string; audPerUnit: string; coinId: string; note: string }[],
) {
  return rows
    .filter((r) => r.label.trim())
    .map((r) =>
      [r.label, r.network, r.wallet, r.audPerUnit, r.coinId, r.note]
        .map((v) => v.replace(/[|\n]/g, " ").trim())
        .join(" | "),
    )
    .join("\n");
}

