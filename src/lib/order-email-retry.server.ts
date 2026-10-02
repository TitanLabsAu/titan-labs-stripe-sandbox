import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Authenticate the existing email job without changing its stored credential. */
export async function authenticateOrderEmailJob(request: Request): Promise<Response | null> {
  const unauthorized = await authenticateCronRequest(request);
  if (!unauthorized) return null;

  // This job predates the email-only endpoint. Its existing private secret has
  // a legacy name; it authorizes email retries here, never carrier tracking.
  const jobSecret = process.env["AUSPOST_CRON_SECRET"];
  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!jobSecret || !token) return unauthorized;
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(token), digest(jobSecret)) ? null : unauthorized;
}

/** Retry customer emails independently of any shipping carrier. */
export async function retryOrderEmails(request: Request): Promise<Response> {
  const unauthorized = await authenticateOrderEmailJob(request);
  if (unauthorized) return unauthorized;

  try {
    const { sendPendingOrderConfirmations } = await import("@/lib/order-confirmation.server");
    const confirmations = await sendPendingOrderConfirmations();
    const { tryOrderCheckpointEmails } = await import("@/lib/order-checkpoint-email.server");
    await tryOrderCheckpointEmails();
    const { sendPendingMilestoneEmails } = await import("@/lib/milestone-email.server");
    const milestones = await sendPendingMilestoneEmails();
    return Response.json({ ok: true, confirmations, milestoneEmails: milestones.sent });
  } catch (error) {
    console.error("[order-email-retry]", error);
    return Response.json({ ok: false, error: "Email retry failed" }, { status: 500 });
  }
}
