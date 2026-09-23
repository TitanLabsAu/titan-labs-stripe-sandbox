import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bitcoin } from "lucide-react";
import { getCryptoRates } from "@/lib/crypto.functions";
import { cryptoAmountFor, parseCryptoOptions, CRYPTO_DISCOUNT_PERCENT } from "@/lib/pricing";
import { formatPrice } from "@/lib/products";
import { useSiteContent } from "@/lib/useCatalog";
import { cn } from "@/lib/utils";

/**
 * Compact live crypto preview: shows what the order costs in each accepted coin
 * once the crypto discount is applied. Shown in the cart drawer and the
 * catalogue order summary so customers see it before reaching checkout.
 */
export function CryptoEstimate({
  amountAud,
  className,
}: {
  amountAud: number;
  className?: string | undefined;
}) {
  const { data: content } = useSiteContent();
  const options = parseCryptoOptions(content);
  const ids = options.map((o) => o.coinId).filter((id): id is string => Boolean(id));
  const fetchRates = useServerFn(getCryptoRates);
  const { data: rates } = useQuery({
    queryKey: ["crypto-rates", ids.join(",")],
    queryFn: () => fetchRates({ data: { ids } }),
    enabled: amountAud > 0 && ids.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (amountAud <= 0 || options.length === 0) return null;

  const discounted = amountAud * (1 - CRYPTO_DISCOUNT_PERCENT / 100);
  const rows = options
    .map((option) => {
      const liveRate = option.coinId ? rates?.[option.coinId] : undefined;
      const amount = cryptoAmountFor(discounted, liveRate ?? option.audPerUnit);
      return amount ? { label: option.label, amount, live: Boolean(liveRate) } : null;
    })
    .filter((r): r is { label: string; amount: string; live: boolean } => Boolean(r));

  if (rows.length === 0) return null;

  return (
    <div className={cn("border border-accent/40 bg-accent/5 p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
          <Bitcoin className="h-3.5 w-3.5 text-accent" />
          Pay with crypto
        </p>
        <span className="text-[11px] font-bold uppercase text-accent">
          Save {CRYPTO_DISCOUNT_PERCENT}%
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="uppercase tracking-wide text-muted-foreground">{row.label}</span>
            <span className="font-mono font-bold text-foreground">
              ≈ {row.amount} {row.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {formatPrice(discounted)} AUD after the crypto discount
        {rows.some((r) => r.live) ? " · live market rate" : ""}
      </p>
    </div>
  );
}
