import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const FALLBACK_ADMIN_EMAIL = "digistream2@proton.me";

/** Website-wide admin notification address, editable in Admin → Notifications. */
export async function getAdminNotificationEmail(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_private_settings")
      .select("body")
      .eq("key", "order_admin_email")
      .maybeSingle();
    return ((data as any)?.body ?? "").trim() || FALLBACK_ADMIN_EMAIL;
  } catch {
    return FALLBACK_ADMIN_EMAIL;
  }
}

/**
 * Sends the store owner a copy of a customer order email.
 * Failures are logged and never block the customer email or checkout.
 */
export async function sendAdminOrderCopy(
  template: string,
  templateData: Record<string, any>,
  idempotencyKey: string,
) {
  try {
    const email = await getAdminNotificationEmail();
    await sendTemplateEmail(template, email, {
      templateData,
      idempotencyKey: `${idempotencyKey}-admin`,
    });
  } catch (error) {
    console.error("[order-admin-copy] send failed", template, error);
  }
}
