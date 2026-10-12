import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(sb: any, userId: string) {
  const { data } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const adminWelcomeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb, context.userId);
    const [s, q] = await Promise.all([
      sb.from("welcome_email_settings").select("enabled, activated_at, template_version").eq("id", 1).maybeSingle(),
      sb.from("member_welcome_email_queue").select("outcome, completed_at").limit(1000),
    ]);
    const counts: Record<string, number> = {};
    for (const r of q.data ?? []) { const k = r.completed_at ? r.outcome ?? "done" : "pending"; counts[k] = (counts[k] ?? 0) + 1; }
    return { enabled: Boolean(s.data?.enabled), activatedAt: s.data?.activated_at ?? null, version: s.data?.template_version ?? "v1", counts };
  });

export const adminSetWelcomeEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled: boolean }) => ({ enabled: d?.enabled === true }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb, context.userId);
    const { error } = await sb.from("welcome_email_settings").update({ enabled: data.enabled, updated_by: context.userId }).eq("id", 1);
    if (error) throw error;
    return { ok: true };
  });

/** Render-only preview with clearly labelled DEMO name/code and the live Hot Products/settings. */
export const adminWelcomePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb, context.userId);
    const { listProducts, getSiteContent } = await import("@/lib/catalog.functions");
    const { welcomeHotProducts, settingsFromDb } = await import("@/lib/welcome-email");
    const React = await import("react");
    const { render } = await import("@react-email/render");
    const { MemberWelcome } = await import("@/lib/email-templates/member-welcome");
    const [products, content, s] = await Promise.all([listProducts(), getSiteContent(), sb.from("referral_settings").select("*").eq("id", 1).maybeSingle()]);
    const cards = welcomeHotProducts(products, content);
    const html = await render(React.createElement(MemberWelcome, { firstName: "DEMO", referralCode: "DEMO-CODE", products: cards, settings: settingsFromDb(s.data), demo: true }));
    return { html, productCount: cards.length };
  });
