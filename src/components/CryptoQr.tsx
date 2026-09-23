import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders a scannable QR code for a wallet address. */
export function CryptoQr({ value, size = 168 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value.trim()) {
      setSrc(null);
      return;
    }
    void QRCode.toDataURL(value, { width: size * 2, margin: 1 })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={src}
        alt="Wallet address QR code"
        width={size}
        height={size}
        className="border border-border bg-white p-2"
      />
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Scan with your wallet app
      </p>
    </div>
  );
}
