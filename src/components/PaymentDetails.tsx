import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { homeValue, type PaymentMethodKey } from "@/lib/homeContent";
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
  className,
}: {
  method: PaymentMethodKey;
  content: Record<string, string> | undefined;
  reference?: string;
  className?: string;
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
    const account = value("payment_wise_account");
    return (
      <div className={cn("border border-border bg-muted/20 p-4", className)}>
        {link ? (
          <div>
            <CopyLine label="Account name" value={account} />
            <CopyLine label="Wise link" value={link} />
            {reference ? <CopyLine label="Payment reference" value={reference} /> : null}
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center border border-accent bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-foreground hover:bg-accent/20"
            >
              Open Wise to pay
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Wise payment details will be sent to you with your order confirmation.
          </p>
        )}
        <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">
          {value("payment_wise_instructions")}
        </p>
      </div>
    );
  }

  const wallet = value("payment_crypto_wallet");
  const network = value("payment_crypto_network");
  return (
    <div className={cn("border border-border bg-muted/20 p-4", className)}>
      {wallet ? (
        <div>
          <CopyLine label="Network" value={network} />
          <CopyLine label="Wallet address" value={wallet} />
          {reference ? <CopyLine label="Payment reference" value={reference} /> : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Wallet details will be sent to you with your order confirmation.
        </p>
      )}
      <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">
        {value("payment_crypto_instructions")}
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
  const options: { key: PaymentMethodKey; label: string; hint: string }[] = [
    {
      key: "payid",
      label: homeValue(content, "payment_payid_label"),
      hint: "Instant transfer from your Australian banking app.",
    },
    {
      key: "wise",
      label: homeValue(content, "payment_wise_label"),
      hint: "Pay through the Wise app or website.",
    },
    {
      key: "crypto",
      label: homeValue(content, "payment_crypto_label"),
      hint: "Send USDC from your own wallet.",
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
            <span className="block font-bold uppercase tracking-wide text-foreground">
              {option.label}
            </span>
            <span className="block text-xs text-muted-foreground">{option.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
