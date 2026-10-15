import { useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CryptoQr } from "@/components/CryptoQr";
import { getCryptoRates } from "@/lib/crypto.functions";
import { homeValue, type PaymentMethodKey } from "@/lib/homeContent";
import { cryptoAmountFor, parseCryptoOptions, CRYPTO_DISCOUNT_PERCENT } from "@/lib/pricing";
import { cn } from "@/lib/utils";


export function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value.trim()) return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-all font-mono text-sm text-foreground">{value}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded border border-border p-1.5 text-muted-foreground hover:text-foreground"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success(`${label} copied`);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error("Could not copy that");
          }
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** The payment details shown once a method is chosen. */
export function PaymentDetails({
  method,
  content,
  reference,
  amountAud,
  className,
}: {
  method: PaymentMethodKey;
  content: Record<string, string> | undefined;
  reference?: string | undefined;
  amountAud?: number | undefined;
  className?: string | undefined;
}) {
  const value = (key: string) => homeValue(content, key).trim();

  if (method === "payid") {
    const payid = value("payment_payid_id");
    const account = value("payment_payid_account");
    const bsb = value("payment_payid_bsb");
    const accountNumber = value("payment_payid_account_number");
    const hasDetails = Boolean(payid || bsb || accountNumber);
    return (
      <div className={cn("border border-border bg-muted/20 p-4", className)}>
        {hasDetails ? (
          <div>
            <CopyLine label="PayID" value={payid} />
            <CopyLine label="Account name" value={account} />
            <CopyLine label="BSB" value={bsb} />
            <CopyLine label="Account number" value={accountNumber} />
            {reference ? <CopyLine label="Payment reference" value={reference} /> : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Bank transfer details will be sent to you with your order confirmation.
          </p>
        )}
        <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">
          {value("payment_payid_instructions")}
        </p>
      </div>
    );
  }

  if (method === "wise") {
    const link = value("payment_wise_link");
    const safeLink = /^https:\/\//i.test(link) ? link : "";
    return (
      <div className={cn("border border-border bg-muted/20 p-4", className)}>
        {safeLink ? (
          <a
            href={safeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-accent bg-accent/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-foreground hover:bg-accent/20"
          >
            Open Wise to pay <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">
            Wise payment details will be sent to you with your order confirmation.
          </p>
        )}
        {reference ? <div className="mt-3"><CopyLine label="Payment reference" value={reference} /></div> : null}
        <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">
          {value("payment_wise_instructions")}
        </p>
      </div>
    );
  }

  if (method === "card") {
    return (
      <div className={cn("border border-border bg-muted/20 p-4", className)}>
        <p className="font-bold uppercase tracking-wide text-foreground">Secure card payment</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your card details are securely handled by Stripe and are never stored by Titan Labs.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Sandbox mode — no real card will be charged.</p>
      </div>
    );
  }

  return <CryptoPanel content={content} reference={reference} amountAud={amountAud} className={className} />;
}

function CryptoPanel({
  content,
  reference,
  amountAud,
  className,
}: {
  content: Record<string, string> | undefined;
  reference?: string | undefined;
  amountAud?: number | undefined;
  className?: string | undefined;
}) {
  const options = parseCryptoOptions(content);
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "");
  const selected = options.find((o) => o.id === selectedId) ?? options[0];

  const ids = options.map((o) => o.coinId).filter((id): id is string => Boolean(id));
  const fetchRates = useServerFn(getCryptoRates);
  const { data: rates } = useQuery({
    queryKey: ["crypto-rates", ids.join(",")],
    queryFn: () => fetchRates({ data: { ids } }),
    enabled: ids.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (!selected) {
    return (
      <div className={cn("border border-border bg-muted/20 p-4", className)}>
        <p className="text-sm text-muted-foreground">
          Wallet details will be sent to you with your order confirmation.
        </p>
      </div>
    );
  }

  const liveRate = selected.coinId ? rates?.[selected.coinId] : undefined;
  const rate = liveRate ?? selected.audPerUnit;
  const coinAmount = amountAud ? cryptoAmountFor(amountAud, rate) : null;

  return (
    <div className={cn("border border-border bg-muted/20 p-4", className)}>
      {options.length > 1 ? (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedId(option.id)}
              className={cn(
                "border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
                option.id === selected.id
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/40",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {selected.note ? (
        <div className="mb-4 flex items-start gap-2 border border-destructive/40 bg-destructive/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs text-muted-foreground">{selected.note}</p>
        </div>
      ) : null}

      {coinAmount ? (
        <div className="mb-3 border border-accent/40 bg-accent/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Amount to send
          </p>
          <p className="mt-0.5 font-mono text-lg font-extrabold text-foreground">
            {coinAmount} {selected.label}
          </p>
          <p className="text-xs text-muted-foreground">
            Converted from ${amountAud?.toFixed(2)} AUD
            {liveRate ? " · live market rate" : ""}
          </p>
        </div>
      ) : null}

      {selected.wallet ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>

            <CopyLine label="Coin" value={selected.label} />
            <CopyLine label="Network" value={selected.network} />
            <CopyLine label="Wallet address" value={selected.wallet} />
            {coinAmount ? <CopyLine label="Amount" value={coinAmount} /> : null}
            {reference ? <CopyLine label="Payment reference" value={reference} /> : null}
          </div>
          <CryptoQr value={selected.wallet} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Wallet details will be sent to you with your order confirmation.
        </p>
      )}
      <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">
        {homeValue(content, "payment_crypto_instructions")}
      </p>
    </div>
  );
}

/** Radio-style payment method picker. */
export function PaymentMethodPicker({
  value,
  onChange,
  content,
}: {
  value: PaymentMethodKey;
  onChange: (next: PaymentMethodKey) => void;
  content: Record<string, string> | undefined;
}) {
  const bankEnabled = homeValue(content, "payment_bank_enabled") === "true";
  const wiseEnabled = homeValue(content, "payment_wise_enabled") === "true";
  const options: { key: PaymentMethodKey; label: string; hint: string; badge?: string }[] = [
    {
      key: "card",
      label: homeValue(content, "payment_card_label"),
      hint: "Pay securely online by credit or debit card via Stripe.",
    },
    ...(bankEnabled ? [{
      key: "payid" as const,
      label: homeValue(content, "payment_payid_label"),
      hint: "Transfer from your banking app using the payment details provided.",
    }] : []),
    ...(wiseEnabled ? [{
      key: "wise" as const,
      label: homeValue(content, "payment_wise_label"),
      hint: "Pay the order total through Wise using the link provided.",
    }] : []),
    {
      key: "crypto",
      label: homeValue(content, "payment_crypto_label"),
      hint: "Send BTC, ETH or USDT from your own wallet and save instantly.",
      badge: `${CRYPTO_DISCOUNT_PERCENT}% OFF`,
    },
  ];

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.key}
          className={cn(
            "flex cursor-pointer items-start gap-3 border px-4 py-3 transition-colors",
            value === option.key ? "border-accent bg-accent/5" : "border-border hover:border-foreground/40",
          )}
        >
          <input
            type="radio"
            name="payment-method"
            className="mt-1"
            checked={value === option.key}
            onChange={() => onChange(option.key)}
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 font-bold uppercase tracking-wide text-foreground">
              {option.label}
              {option.badge ? (
                <span className="border border-accent bg-accent/10 px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.14em] text-accent">
                  {option.badge}
                </span>
              ) : null}
            </span>
            <span className="block text-xs text-muted-foreground">{option.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}


