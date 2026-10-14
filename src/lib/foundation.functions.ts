import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FoundationStatus = {
  enrolmentEnabled: boolean;
  launched: boolean;
  capacity: number;
  benefitPercent: number;
  awarded: number;
};

function toStatus(raw: any): FoundationStatus {
  return {
    enrolmentEnabled: Boolean(raw?.enrolment_enabled),
    launched: Boolean(raw?.launched),
    capacity: Number(raw?.capacity ?? 50),
    benefitPercent: Number(raw?.benefit_percent ?? 5),
    awarded: Number(raw?.awarded ?? 0),
  };
}

/** Signed-in member: own award (RLS: own row only) plus the public aggregate. */
export const getMyFoundation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const [award, status] = await Promise.all([
      sb.from("foundation_members").select("member_number, awarded_at").eq("user_id", context.userId).maybeSingle(),
      sb.rpc("foundation_programme_status"),
    ]);
    if (award.error || status.error) throw new Error("Couldn't load your member benefits. Please refresh.");
    return {
      award: award.data ? { memberNumber: Number(award.data.member_number), awardedAt: String(award.data.awarded_at) } : null,
      status: toStatus(status.data),
    };
  });

async function requireAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Forbidden");
}

/** Admin: programme state and read-only award list. */
export const adminGetFoundation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const sb = context.supabase as any;
    const [settings, awards] = await Promise.all([
      sb.from("foundation_member_settings").select("enrolment_enabled, launched_at, capacity, benefit_percent, updated_at").eq("id", 1).maybeSingle(),
      sb.from("foundation_members").select("member_number, user_id, order_id, awarded_at").order("member_number"),
    ]);
    if (settings.error || awards.error) throw new Error("Couldn't load the Foundation programme.");
    const rows = (awards.data ?? []) as any[];
    const ids = rows.map((r) => r.user_id);
    const orderIds = rows.map((r) => r.order_id);
    const [profiles, orders] = ids.length
      ? await Promise.all([
          sb.from("profiles").select("id, first_name, last_name, email").in("id", ids),
          sb.from("orders").select("id, order_number").in("id", orderIds),
        ])
      : [{ data: [] }, { data: [] }];
    const pm = new Map(((profiles.data ?? []) as any[]).map((p) => [p.id, p]));
    const om = new Map(((orders.data ?? []) as any[]).map((o) => [o.id, o.order_number]));
    const s = settings.data ?? {};
    return {
      enrolmentEnabled: Boolean(s.enrolment_enabled),
      launchedAt: s.launched_at ? String(s.launched_at) : null,
      capacity: Number(s.capacity ?? 50),
      benefitPercent: Number(s.benefit_percent ?? 5),
      awards: rows.map((r) => {
        const p: any = pm.get(r.user_id);
        return {
          memberNumber: Number(r.member_number),
          name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "Member",
          order: om.get(r.order_id) != null ? `TL-${om.get(r.order_id)}` : String(r.order_id),
          awardedAt: String(r.awarded_at),
        };
      }),
    };
  });

/** Admin: open or pause enrolment. The launch cutoff is fixed by the database on the first open. */
export const adminSetFoundationEnrolment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => ({ enabled: input?.enabled === true }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await (context.supabase as any)
      .from("foundation_member_settings")
      .update({ enrolment_enabled: data.enabled })
      .eq("id", 1);
    if (error) throw new Error("Couldn't update the Foundation programme.");
    return { ok: true };
  });
