import { useQuery } from "@tanstack/react-query";
import { getReferralSettings } from "@/lib/referrals.functions";
import { settingsFromRow, type PriceLine } from "@/lib/order-pricing";
import { getProductOption, type Product } from "@/lib/products";

export function useReferralSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ["referral-settings"],
    queryFn: () => getReferralSettings(),
    staleTime: 60_000,
  });
  return { settings: settingsFromRow(data), raw: data, isLoading };
}

/** Build pricing lines from cart items (single items only; the 10x bulk-kit is retired). */
export function cartPriceLines(
  items: { slug: string; variantId?: string | null; pack?: "single" | "kit"; quantity: number }[],
  getProduct: (slug: string) => Product | undefined,
  getLinePrice: (item: any) => number,
): PriceLine[] {
  return items.map((item) => {
    const product = getProduct(item.slug);
    const unit = getLinePrice(item);
    return {
      unitCents: Math.round(unit * 100),
      baseCents: Math.round(unit * 100),
      quantity: item.quantity,
      // Titan Stack counts Range products only; unknown products fail closed.
      multibuyEligible: product?.catalogueSection === "range",
    };
  });
}
