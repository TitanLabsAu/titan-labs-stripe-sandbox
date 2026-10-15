import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isTwoDpPercent, sanitizeStacking, DEFAULT_CLUB_STACKING, LEGACY_CLUB_STACKING, type ClubStacking } from "@/lib/order-pricing";

export type ClubBenefitView = {
  type: "percent" | "fixed";
  percent: number;
  fixedCents: number;
  maxCapPercent: number;
};

export type MyTitanClub = (ClubBenefitView & { assignedAt: string }) | null;

export type AdminClubMember = ClubBenefitView & {
  stacking: ClubStacking;
  userId: string;
  name: string;
  email: string | null;
  active: boolean;
  note: string;
  assignedAt: string;
  updatedAt: string;
  revokedAt: string | null;
};

export type AdminClubEvent = {
  id: string;
  userId: string;
  name: string;
  action: string;
  before: any;
  after: any;
  createdAt: string;
};

export type AdminTitanClub = {
  installed: boolean;
  /** False until the staged stacking-policy database update is installed. */
  stackingInstalled: boolean;
  enabled: boolean;
  siteCapPercent: number;
  members: AdminClubMember[];
  events: AdminClubEvent[];
};

const MISSING = new Set(["42P01", "PGRST205", "PGRST202"]);
const missing = (e: any) => e && MISSING.has(String(e.code));

function view(r: any): ClubBenefitView {
  return {
    type: r.benefit_type === "fixed" ? "fixed" : "percent",
    percent: Number(r.percent ?? 0),
    fixedCents: Number(r.fixed_cents ?? 0),
    maxCapPercent: Number(r.max_cap_percent ?? 20),
  };
}

/** Signed-in member: own active benefit only (no note, no audit). */
export const getMyTitanClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyTitanClub> => {
    const { data, error } = await (context.supabase as any).rpc("titan_club_my_benefit");
    if (missing(error)) return null;
    if (error) throw new Error("Couldn't load your member benefits. Please refresh.");
    return data ? { ...view(data), assignedAt: String(data.assigned_at) } : null;
  });

async function requireAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Forbidden");
}

async function hasStackingColumns(sb: any) {
  const { error } = await sb.from("titan_club_members").select("stack_multibuy").limit(1);
  return !error;
}

/** Before the update is installed, only the legacy (everything combines) policy can be stored faithfully. */
export const isDefaultStacking = (st: ClubStacking) =>
  (Object.keys(LEGACY_CLUB_STACKING) as (keyof ClubStacking)[]).every((k) => st[k] === LEGACY_CLUB_STACKING[k]);

const nameOf = (p: any) => [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "Member";

export const adminGetTitanClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminTitanClub> => {
    await requireAdmin(context);
    const sb = context.supabase as any;
    const [settings, members, notes, events, site] = await Promise.all([
      sb.from("titan_club_settings").select("enabled").eq("id", 1).maybeSingle(),
      sb.from("titan_club_members").select("*").order("assigned_at"),
      sb.from("titan_club_notes").select("user_id, note"),
      sb.from("titan_club_events").select("*").order("created_at", { ascending: false }).limit(50),
      sb.from("referral_settings").select("combined_cap_percent").eq("id", 1).maybeSingle(),
    ]);
    const siteCapPercent = Number(site.data?.combined_cap_percent ?? 20);
    if (missing(settings.error) || missing(members.error))
      return { installed: false, stackingInstalled: false, enabled: false, siteCapPercent, members: [], events: [] };
    if (settings.error || members.error || notes.error || events.error) throw new Error("Couldn't load The Titan Club.");
    const rows = (members.data ?? []) as any[];
    const ids = [...new Set([...rows.map((r) => r.user_id), ...((events.data ?? []) as any[]).map((e) => e.user_id)])];
    const { data: profiles } = ids.length
      ? await sb.from("profiles").select("id, first_name, last_name, email").in("id", ids)
      : { data: [] };
    const pm = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p]));
    const nm = new Map(((notes.data ?? []) as any[]).map((n) => [n.user_id, n.note]));
    const stackingInstalled = rows.length ? "stack_multibuy" in rows[0] : await hasStackingColumns(sb);
    return {
      installed: true,
      stackingInstalled,
      enabled: Boolean(settings.data?.enabled),
      siteCapPercent,
      members: rows.map((r) => ({
        ...view(r),
        stacking: sanitizeStacking({ multibuy: r.stack_multibuy, crypto: r.stack_crypto, firstOffer: r.stack_first_offer, code: r.stack_code, credit: r.stack_credit, foundation: r.stack_foundation }),
        userId: r.user_id,
        name: nameOf(pm.get(r.user_id)),
        email: pm.get(r.user_id)?.email ?? null,
        active: Boolean(r.active),
        note: String(nm.get(r.user_id) ?? ""),
        assignedAt: String(r.assigned_at),
        updatedAt: String(r.updated_at),
        revokedAt: r.revoked_at ? String(r.revoked_at) : null,
      })),
      events: ((events.data ?? []) as any[]).map((e) => ({
        id: e.id,
        userId: e.user_id,
        name: nameOf(pm.get(e.user_id)),
        action: e.action,
        before: e.before,
        after: e.after,
        createdAt: String(e.created_at),
      })),
    };
  });

/** Admin: find existing members by name or email (identity shown with email + id). */
export const adminSearchClubCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({ query: String(input?.query ?? "").trim().slice(0, 80) }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const term = data.query.replace(/[%_,()*\\]/g, " ").trim();
    if (term.length < 2) return [];
    const like = `%${term}%`;
    const { data: rows, error } = await (context.supabase as any)
      .from("profiles")
      .select("id, first_name, last_name, email")
      .or(`email.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`)
      .limit(10);
    if (error) throw new Error("Search failed.");
    return ((rows ?? []) as any[]).map((p) => ({ userId: String(p.id), name: nameOf(p), email: p.email ?? null }));
  });

export type ClubAssignInput = {
  userId: string;
  type: "percent" | "fixed";
  percent?: number;
  fixedDollars?: number;
  maxCapPercent: number;
  active: boolean;
  note: string;
  stacking: ClubStacking;
};

/** Strict validation shared with the UI. Returns an error message or null. */
export function validateClubInput(i: ClubAssignInput): string | null {
  if (!/^[0-9a-f-]{36}$/i.test(String(i.userId ?? ""))) return "Choose a member first.";
  if (i.type !== "percent" && i.type !== "fixed") return "Choose percent or fixed amount.";
  if (i.type === "percent" && !isTwoDpPercent(i.percent)) return "Percent must be between 0.01 and 100 (up to 2 decimals).";
  if (i.type === "fixed" && !isTwoDpPercent(i.fixedDollars, 1000)) return "Fixed amount must be between $0.01 and $1,000 (cents only).";
  if (!isTwoDpPercent(i.maxCapPercent)) return "Maximum discount must be between 0.01% and 100% (up to 2 decimals).";
  if (typeof i.active !== "boolean") return "Invalid status.";
  if (String(i.note ?? "").length > 500) return "Note must be 500 characters or fewer.";
  const st = i.stacking as any;
  if (!st || (Object.keys(DEFAULT_CLUB_STACKING) as string[]).some((k) => typeof st[k] !== "boolean")) return "Invalid stacking settings.";
  return null;
}

/**
 * A new or changed personal maximum must be at least the current website cap (kit prices
 * embed savings a lower cap cannot enforce). An unchanged existing maximum is preserved.
 */
export function clubCapFloorError(newCap: number, siteCap: number, existingCap: number | null): string | null {
  if (existingCap !== null && Math.round(existingCap * 100) === Math.round(newCap * 100)) return null;
  if (Math.round(newCap * 100) < Math.round(siteCap * 100))
    return `Maximum discount must be at least the website cap of ${siteCap}% (up to 100%).`;
  return null;
}

export const adminSetTitanClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ClubAssignInput) => {
    const err = validateClubInput(input);
    if (err) throw new Error(err);
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const sbc = context.supabase as any;
    const [{ data: rs }, { data: cur }] = await Promise.all([
      sbc.from("referral_settings").select("combined_cap_percent").eq("id", 1).maybeSingle(),
      sbc.from("titan_club_members").select("max_cap_percent").eq("user_id", data.userId).maybeSingle(),
    ]);
    const floorErr = clubCapFloorError(Number(data.maxCapPercent), Number(rs?.combined_cap_percent ?? 20), cur ? Number(cur.max_cap_percent) : null);
    if (floorErr) throw new Error(floorErr);
    const stacking = sanitizeStacking(data.stacking);
    const stackArgs = {
      _stack_multibuy: stacking.multibuy, _stack_crypto: stacking.crypto, _stack_first_offer: stacking.firstOffer,
      _stack_code: stacking.code, _stack_credit: stacking.credit, _stack_foundation: stacking.foundation,
    };
    const v2 = await hasStackingColumns(sbc);
    // Never silently drop a policy: before the update is installed only the legacy all-allowed policy can be saved.
    if (!v2 && !isDefaultStacking(stacking))
      throw new Error("Stacking controls need a pending database update before they can be saved. Leave every switch on (including Foundation), or ask for the update to be installed.");
    const { data: res, error } = await sbc.rpc(v2 ? "admin_set_titan_club_v2" : "admin_set_titan_club", {
      ...(v2 ? stackArgs : {}),
      _user_id: data.userId,
      _benefit_type: data.type,
      _percent: data.type === "percent" ? Math.round(Number(data.percent) * 100) / 100 : null,
      _fixed_cents: data.type === "fixed" ? Math.round(Number(data.fixedDollars) * 100) : null,
      _max_cap: Math.round(Number(data.maxCapPercent) * 100) / 100,
      _active: data.active,
      _note: String(data.note ?? "").trim(),
    });
    if (missing(error)) throw new Error("The Titan Club isn't switched on in the database yet (awaiting approval).");
    if (error) throw new Error(/unknown member/.test(error.message) ? "That member couldn't be found." : /below website cap/.test(error.message) ? "Maximum discount must be at least the website cap." : "Couldn't save Titan Club membership.");
    return { changed: Boolean(res?.changed), action: (res?.action ?? null) as string | null };
  });

export const adminSetTitanClubEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => ({ enabled: input?.enabled === true }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await (context.supabase as any).rpc("admin_set_titan_club_enabled", { _enabled: data.enabled });
    if (error) throw new Error("Couldn't update The Titan Club.");
    return { ok: true };
  });
