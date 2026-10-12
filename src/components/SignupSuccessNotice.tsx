import { useEffect, useRef } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SignupNotice } from "@/lib/signup-result";

/** Persistent text-only feedback; this component never queues or sends email. */
export function SignupSuccessNotice({ notice }: { notice: SignupNotice | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (notice) ref.current?.focus(); }, [notice]);
  if (!notice) return null;
  return (
    <Alert ref={ref} role="status" aria-live="polite" aria-atomic="true" tabIndex={-1}
      className="border-border text-left focus-visible:ring-2 focus-visible:ring-ring">
      {notice.kind === "unverified" ? <Mail aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <AlertDescription className="min-w-0 break-words leading-relaxed [overflow-wrap:anywhere]">
        {notice.kind === "confirmation" ? (
          <p>Welcome to Titan Labs Aus! Confirm your email address to complete signup. Your welcome email will then be sent to <span>{notice.email}</span> on our next hourly send, with your referral code and member discounts. Check your inbox and junk folder.</p>
        ) : notice.kind === "confirmed" ? (
          <p>Welcome to Titan Labs Aus! Your email address is confirmed and signup is complete. Your welcome email will be sent to <span>{notice.email}</span> on our next hourly send, with your referral code and member discounts. Check your inbox and junk folder.</p>
        ) : (
          <p>Please check your inbox and junk folder at <span>{notice.email}</span> for any verification instructions. If you already have an account, log in or reset your password. This response does not confirm that a new account was created or that a welcome email will be sent.</p>
        )}
      </AlertDescription>
    </Alert>
  );
}