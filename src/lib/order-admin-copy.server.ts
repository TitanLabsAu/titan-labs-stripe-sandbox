import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const FALLBACK_ADMIN_EMAIL = "sjrendall@live.com.au";

/**
 * Sends the store owner a copy of a customer order email. The address is
 * editable in Admin → Website editor → Payments ("order_admin_email").
 * Failures are logged and never block the customer email or checkout.
 */
export async function sendAdminOrderCopy(
  template: string,
  templateData: Record<string, any>,
  idempotencyKey: string,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_content")
      .select("body")
      .eq("key", "order_admin_email")
      .maybeSingle();
    const email = ((data as any)?.body ?? "").trim() || FALLBACK_ADMIN_EMAIL;
    if (!email) return;
    await sendTemplateEmail(template, email, {
      templateData,
      idempotencyKey: `${idempotencyKey}-admin`,
    });
  } catch (error) {
    console.error("[order-admin-copy] send failed", template, error);
  }
}
