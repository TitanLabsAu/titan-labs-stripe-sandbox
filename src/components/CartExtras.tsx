import { Bitcoin, CreditCard, Landmark, Layers, ShieldCheck, Truck } from "lucide-react";
import { formatPrice } from "@/lib/products";
import {
  CRYPTO_DISCOUNT_PERCENT,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_OPTIONS,
  STACK_TIERS,
  nextStackTier,
  stackPercentFor,
  type ShippingMethodKey,
} from "@/lib/pricing";
import { useSiteContent } from "@/lib/useCatalog";
import { homeValue } from "@/lib/homeContent";
import { cn } from "@/lib/utils";
import { useReferralSettings } from "@/lib/useReferralSettings";
import { multibuyPercentFor } from "@/lib/order-pricing";

/** Progress bar toward free express shipping. */
export function FreeShippingMeter({ amount }: { amount: number }) {
  const progress = Math.min(100, (amount / FREE_SHIPPING_THRESHOLD) * 100);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - amount);
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs text-foreground">
        <Truck className="h-4 w-4 text-accent" />
        {remaining > 0 ? (
          <span>
            Add <strong>{formatPrice(remaining)}</strong> more for free express shipping.
          </span>
        ) : (
          <span className="font-bold uppercase tracking-wide text-accent">
            Free express shipping unlocked
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full bg-border">
        <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/** The Titan Stack tier banner — highlights the tier currently reached. */
export function TitanStackBanner({ units }: { units: number }) {
  const { settings } = useReferralSettings();
  const tiers = settings.multibuyTiers.length ? settings.multibuyTiers : [...STACK_TIERS];
  const active = multibuyPercentFor(units, { ...settings, multibuyTiers: tiers });
  const next = tiers.find((t) => units < t.units) ?? null;
  const lastUnits = tiers[tiers.length - 1]?.units;
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-accent" />
        <p className="technical-label text-foreground">The Titan Stack</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {tiers.map((tier) => {
          const reached = active === tier.percent;
          return (
            <div
              key={tier.units}
              className={cn(
                "border px-2 py-2 text-center transition-colors",
                reached
                  ? "border-accent bg-accent/10"
                  : "border-border bg-background/40 text-muted-foreground",
              )}
            >
              <p className={cn("text-sm font-extrabold", reached && "text-accent")}>
                {tier.percent}%
              </p>
              <p className="text-[10px] uppercase tracking-[0.14em]">
                {tier.units}
                {tier.units === lastUnits ? "+" : ""} units
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {next ? (
          <>
            Add {next.units - units} more {next.units - units === 1 ? "unit" : "units"} to unlock{" "}
            <strong className="text-foreground">{next.percent}% off</strong> your vials.
          </>
        ) : (
          <>
            Top tier reached —{" "}
            <strong className="text-accent">{active}% off</strong> the more you stack, the more you
            save.
          </>
        )}
      </p>
    </div>
  );
}

/** Payment and delivery reassurance strip. */
export function TitanTrustStrip() {
  const { data: content } = useSiteContent();
  const badges = [
    { label: "Credit / Debit Card", Icon: CreditCard },
    ...(homeValue(content, "payment_bank_enabled") === "true" ? [{ label: homeValue(content, "payment_payid_label"), Icon: Landmark }] : []),
    ...(homeValue(content, "payment_wise_enabled") === "true" ? [{ label: homeValue(content, "payment_wise_label"), Icon: Landmark }] : []),
    { label: `Crypto · ${CRYPTO_DISCOUNT_PERCENT}% off`, Icon: Bitcoin },
    { label: "BTC · ETH · USDT", Icon: ShieldCheck },
    { label: "AusPost tracked", Icon: Truck },
  ];
  return (
    <div>
      <p className="technical-label text-center text-muted-foreground">Ways to pay</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {badges.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex items-center justify-center gap-1.5 border border-border bg-background/60 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground"
          >
            <Icon className="h-3.5 w-3.5 text-accent" />
            {label}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Secure and flexible payment options
      </p>
    </div>
  );
}

/** Shipping method selection. */
export function ShippingPicker({
  value,
  onChange,
  freeShipping,
}: {
  value: ShippingMethodKey;
  onChange: (next: ShippingMethodKey) => void;
  freeShipping: boolean;
}) {
  return (
    <div className="space-y-3">
      {SHIPPING_OPTIONS.map((option) => (
        <label
          key={option.key}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
            value === option.key
              ? "border-accent bg-accent/5"
              : "border-border hover:border-foreground/40",
          )}
        >
          <input
            type="radio"
            name="shipping-method"
            checked={value === option.key}
            onChange={() => onChange(option.key)}
          />
          <Truck className="h-5 w-5 shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block font-bold uppercase tracking-wide text-foreground">
              {option.label}
            </span>
            <span className="block text-xs text-muted-foreground">{option.eta}</span>
          </span>
          <span className="shrink-0 font-extrabold text-foreground">
            {freeShipping ? (
              <span className="text-accent">Free</span>
            ) : (
              formatPrice(option.price)
            )}
          </span>
        </label>
      ))}
      <p className="text-xs text-muted-foreground">
        Free express shipping on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)}.
      </p>
    </div>
  );
}

