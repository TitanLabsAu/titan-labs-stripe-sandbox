import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

/* ---------- Public program settings (safe columns only) ---------- */
export const getReferralSettings = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client.from("referral_settings").select("*").eq("id", 1).maybeSingle();
  return (data ?? null) as Record<string, any> | null;
});

/* Checkout quotes live in checkout.functions.ts (member or guest). */

/* ---------- Member: own rewards ---------- */
/** Totals come from a database aggregate over ALL entries; the ledger lists above are display-only. */
function toSummary(res: { data: any; error: any }) {
  if (res.error) throw res.error;
  const d = res.data ?? {};
  const n = (k: string) => Number(d[k] ?? 0);
  return {
    earnedUnits: n("earnedUnits"),
    redeemedUnits: n("redeemedUnits"),
    reservedUnits: n("reservedUnits"),
    balanceUnits: n("balanceUnits"),
    availableUnits: n("availableUnits"),
    paidReferralOrders: n("paidReferralOrders"),
    rewardEvery: Math.max(1, n("rewardEvery") || 5),
    lots: (Array.isArray(d.lots) ? d.lots : []).map((l: any) => ({ expiresAt: l?.expiresAt ?? null, units: Number(l?.units) || 0 })) as { expiresAt: string | null; units: number }[],
  };
}

export const getMyRewards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const [codes, ledger, summary, settings] = await Promise.all([
      sb.from("discount_codes").select("id, code, code_kind, discount_type, value, active, expires_at, max_uses, times_used").eq("user_id", context.userId),
      sb.from("store_credit_ledger").select("id, kind, units, unit_cents, order_id, reason, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(200),
      sb.rpc("store_credit_summary", { _user_id: context.userId }),
      sb.from("referral_settings").select("credit_unit_cents, max_credit_units, reward_percent, reward_every_referrals, reward_expiry_days, combined_cap_percent").eq("id", 1).maybeSingle(),
    ]);
    const l = (ledger.data ?? []) as any[];
    return {
      codes: (codes.data ?? []) as any[],
      // Never expose referred customers' order ids to the referrer.
      ledger: l.map((e) => ({ id: e.id, kind: e.kind, units: e.units, unit_cents: e.unit_cents, reason: e.reason, created_at: e.created_at })),
      summary: toSummary(summary),
      unitCents: Number(settings.data?.credit_unit_cents ?? 1000),
      maxCreditUnits: Number(settings.data?.max_credit_units ?? 2),
      rewardPercent: Number(settings.data?.reward_percent ?? 10),
      rewardEvery: Number(settings.data?.reward_every_referrals ?? 5),
      rewardExpiryDays: Number(settings.data?.reward_expiry_days ?? 90),
      capPercent: Number(settings.data?.combined_cap_percent ?? 20),
    };
  });

/* ---------- Admin ---------- */
export const adminSaveReferralSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: any) => input as any)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const pct = (v: any) => Math.min(100, Math.max(0, Number(v) || 0));
    const tiers = (Array.isArray(data.multibuy_tiers) ? data.multibuy_tiers : [])
      .map((t: any) => ({ units: Math.max(1, Math.floor(Number(t.units) || 0)), percent: pct(t.percent) }))
      .filter((t: any) => t.units >= 1)
      .slice(0, 10);
    const row = {
      multibuy_tiers: tiers,
      crypto_percent: pct(data.crypto_percent),
      combined_cap_percent: pct(data.combined_cap_percent),
      allow_multibuy_crypto: Boolean(data.allow_multibuy_crypto),
      allow_code_multibuy: Boolean(data.allow_code_multibuy),
      allow_code_crypto: Boolean(data.allow_code_crypto),
      allow_credit_code: Boolean(data.allow_credit_code),
      allow_credit_discounts: Boolean(data.allow_credit_discounts),
      max_credit_units: Math.max(0, Math.min(20, Math.floor(Number(data.max_credit_units) || 0))),
      reward_percent: Math.min(50, pct(data.reward_percent)),
      reward_every_referrals: Math.max(1, Math.min(100, Math.floor(Number(data.reward_every_referrals) || 5))),
      reward_expiry_days: Math.max(1, Math.min(3650, Math.floor(Number(data.reward_expiry_days) || 90))),
      program_enabled: Boolean(data.program_enabled),
      first_offer_enabled: Boolean(data.first_offer_enabled),
      first_offer_percent: Math.min(50, pct(data.first_offer_percent)),
      first_offer_combine_multibuy: Boolean(data.first_offer_combine_multibuy),
      first_offer_combine_crypto: Boolean(data.first_offer_combine_crypto),
      first_offer_combine_code: Boolean(data.first_offer_combine_code),
      first_offer_combine_credit: Boolean(data.first_offer_combine_credit),
      updated_by: context.userId,
    };
    const { error } = await (context.supabase as any).from("referral_settings").update(row).eq("id", 1);
    if (error) throw error;
    return { ok: true };
  });

export const adminGetMemberRewards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const [codes, ledger, reservations, summary] = await Promise.all([
      sb.from("discount_codes").select("*").eq("user_id", data.userId).order("created_at"),
      sb.from("store_credit_ledger").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(500),
      sb.from("store_credit_reservations").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(100),
      sb.rpc("store_credit_summary", { _user_id: data.userId }),
    ]);
    const codeIds = (codes.data ?? []).map((c: any) => c.id);
    const events = codeIds.length
      ? await sb.from("discount_code_events").select("*").in("code_id", codeIds).order("created_at", { ascending: false }).limit(100)
      : { data: [] };
    return {
      codes: codes.data ?? [],
      ledger: ledger.data ?? [],
      reservations: reservations.data ?? [],
      codeEvents: events.data ?? [],
      summary: toSummary(summary),
    };
  });

export const adminAdjustCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; units: number; reason: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const units = Math.trunc(Number(data.units));
    const reason = String(data.reason ?? "").trim().slice(0, 300);
    if (!units || Math.abs(units) > 100) throw new Error("Enter a whole number of rewards (not zero).");
    if (reason.length < 3) throw new Error("Please give a reason for this adjustment.");
    const { data: settings } = await (context.supabase as any).from("referral_settings").select("reward_expiry_days").eq("id", 1).maybeSingle();
    const days = Math.max(1, Number(settings?.reward_expiry_days ?? 90));
    const { error } = await (context.supabase as any).from("store_credit_ledger").insert({
      user_id: data.userId,
      kind: "adjustment",
      units,
      unit_cents: 0,
      reason,
      expires_at: units > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
      created_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const adminSetOrderRefunded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any)
      .from("orders")
      .update({ refunded_at: new Date().toISOString() })
      .eq("id", data.orderId)
      .is("refunded_at", null);
    if (error) throw error;
    return { ok: true };
  });

export type AdminCodeInput = {
  id?: string;
  code: string;
  code_kind: "referral" | "member";
  discount_type: "percent" | "fixed";
  value: number;
  maxUses: number | null;
  expiresAt: string | null;
  userId: string | null;
  note?: string | null;
  min_spend: number;
  combine_multibuy: boolean;
  combine_crypto: boolean;
  combine_credit: boolean;
  active?: boolean;
};

export const adminSaveCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AdminCodeInput) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const code = String(data.code ?? "").trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error("Codes are 3–32 letters, numbers, - or _.");
    const kind = data.code_kind === "member" ? "member" : "referral";
    const type = data.discount_type === "fixed" ? "fixed" : "percent";
    const value = Math.max(0, Number(data.value) || 0);
    if (type === "percent" && value > 100) throw new Error("Percentage can't exceed 100.");
    if (kind === "member" && !data.userId) throw new Error("Member-only codes need a linked member.");
    const row: Record<string, any> = {
      code,
      code_kind: kind,
      discount_type: type,
      value,
      max_uses: data.maxUses && data.maxUses > 0 ? Math.floor(data.maxUses) : 1000000,
      expires_at: data.expiresAt ? new Date(`${data.expiresAt}T23:59:59+10:00`).toISOString() : null,
      user_id: data.userId || null,
      note: data.note ? String(data.note).slice(0, 200) : null,
      min_spend_cents: Math.max(0, Math.round((Number(data.min_spend) || 0) * 100)),
      combine_multibuy: Boolean(data.combine_multibuy),
      combine_crypto: Boolean(data.combine_crypto),
      combine_credit: Boolean(data.combine_credit),
    };
    if (typeof data.active === "boolean") row["active"] = data.active;
    const sb = context.supabase as any;
    const res = data.id
      ? await sb.from("discount_codes").update(row).eq("id", data.id).select("id, code").single()
      : await sb.from("discount_codes").insert(row).select("id, code").single();
    if (res.error) {
      if (String(res.error.code) === "23505") throw new Error(`Code ${code} already exists.`);
      throw res.error;
    }
    return res.data as { id: string; code: string };
  });

export const adminCodeUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await (context.supabase as any)
      .from("orders")
      .select("discount_code_id, payment_confirmed, status, refunded_at")
      .not("discount_code_id", "is", null);
    const map: Record<string, { paid: number; pending: number }> = {};
    for (const o of (data ?? []) as any[]) {
      const m = (map[o.discount_code_id] ??= { paid: 0, pending: 0 });
      if (o.payment_confirmed && o.status !== "cancelled" && !o.refunded_at) m.paid++;
      else if (o.status !== "cancelled") m.pending++;
    }
    return map;
  });
