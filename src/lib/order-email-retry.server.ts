import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Retry customer emails independently of any shipping carrier. */
export async function retryOrderEmails(request: Request): Promise<Response> {
  const unauthorized = await authenticateCronRequest(request);
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
