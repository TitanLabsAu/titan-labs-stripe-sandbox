import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { getAdminNotificationEmail } from "@/lib/order-admin-copy.server";

/** Emails the store owner about any major customer milestones not yet sent. */
export async function sendPendingMilestoneEmails() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ADMIN_EMAIL = await getAdminNotificationEmail();

  const { data, error } = await supabaseAdmin
    .from("admin_notifications")
    .select("id, payload")
    .eq("kind", "milestone-major")
    .eq("email_sent", false)
    .limit(20);
  if (error) throw error;

  let sent = 0;
  for (const row of (data ?? []) as any[]) {
    const p = (row.payload ?? {}) as Record<string, any>;
    try {
      await sendTemplateEmail("admin-milestone", ADMIN_EMAIL, {
        templateData: {
          milestone: p["milestone"] ?? 0,
          customerName: p["name"] || p["email"] || "A customer",
          email: p["email"] ?? "",
          phone: p["phone"] ?? "",
          address: p["address"] ?? "",
        },
        idempotencyKey: `admin-milestone-${row.id}`,
      });
      sent += 1;
    } catch (e) {
      console.error("[milestone-email]", e);
      continue;
    }
    await supabaseAdmin
      .from("admin_notifications")
      .update({ email_sent: true })
      .eq("id", row.id);
  }

  return { sent };
}
