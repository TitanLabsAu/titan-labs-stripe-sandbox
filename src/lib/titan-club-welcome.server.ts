import type { SupabaseClient } from "@supabase/supabase-js";
import { CLUB_WELCOME_MAX_ATTEMPTS, CLUB_WELCOME_TEMPLATE, parseClubSnapshot } from "./titan-club-welcome";

type Job = { user_id: string; snapshot: unknown; attempts: number };
type Send = (template: string, to: string, opts: any) => Promise<{ sent: boolean }>;

/** Everything the worker touches, injectable so tests never reach the database or provider. */
export type ClubWelcomeDeps = {
  claim: () => Promise<Job[]>;
  /** Recipient comes only from the member's own auth record — never from request input. */
  memberEmail: (userId: string) => Promise<string | null | undefined>; // undefined = definitively missing user
  firstName: (userId: string) => Promise<string | null>;
  /** Current trusted saved membership + programme state, read fresh (never the queued copy). */
  current: (userId: string) => Promise<{ programmeOn: boolean; active: boolean; club: unknown } | null>;
  finish: (job: Job, outcome: string) => Promise<void>;
  retryLater: (job: Job, error: string) => Promise<void>;
  send: Send;
};

export async function processClubWelcomeJobs(deps: ClubWelcomeDeps) {
  const jobs = await deps.claim();
  let sent = 0;
  for (const job of jobs) {
    try {
      const cur = await deps.current(job.user_id);
      if (!cur || !cur.active) { await deps.finish(job, "not_active"); continue; }
      if (!cur.programmeOn) { await deps.retryLater(job, "paused: programme off"); continue; }
      // Always describe the CURRENT saved perks, so admin edits made after queueing are reflected.
      const club = parseClubSnapshot(cur.club);
      if (!club) { await deps.finish(job, "invalid_snapshot"); continue; }
      const email = await deps.memberEmail(job.user_id);
      if (email === undefined) { await deps.finish(job, "user_missing"); continue; }
      if (!email) { await deps.finish(job, "no_email"); continue; }
      const templateData = { firstName: (await deps.firstName(job.user_id)) ?? "", club };
      // Re-check right before the provider: a pause defers, a revoke ends, an edit re-reads.
      const last = await deps.current(job.user_id);
      if (!last || !last.active) { await deps.finish(job, "not_active"); continue; }
      if (!last.programmeOn) { await deps.retryLater(job, "paused: programme off"); continue; }
      if (JSON.stringify(parseClubSnapshot(last.club)) !== JSON.stringify(club)) { await deps.retryLater(job, "perks changed during send; retrying"); continue; }
      const result = await deps.send(CLUB_WELCOME_TEMPLATE, email, {
        templateData,
        idempotencyKey: `titan-club-welcome-${job.user_id}`,
        fromName: "Titan Labs Aus",
      });
      if (result.sent) sent++;
      await deps.finish(job, result.sent ? "sent" : "recipient_suppressed");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (job.attempts >= CLUB_WELCOME_MAX_ATTEMPTS) await deps.finish(job, "failed").catch(() => {});
      else await deps.retryLater(job, msg.slice(0, 300)).catch(() => {});
      console.error("[titan-club-welcome] attempt failed", job.user_id);
    }
  }
  return { sent, processed: jobs.length };
}

export async function sendPendingClubWelcomeEmails() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const db = supabaseAdmin as unknown as SupabaseClient;
  const q = () => db.from("titan_club_welcome_email_queue");
  return processClubWelcomeJobs({
    claim: async () => {
      const { data, error } = await db.rpc("claim_titan_club_welcome_emails", { _limit: 20 });
      // Queue not installed yet (staged migration): nothing to send.
      if (error && /PGRST202|42883|PGRST205|42P01/.test(`${(error as any).code} ${error.message}`)) return [];
      if (error) throw error;
      return (data ?? []) as Job[];
    },
    current: async (id) => {
      const [m, st] = await Promise.all([
        db.from("titan_club_members").select("active, benefit_type, percent, fixed_cents, max_cap_percent, stack_multibuy, stack_crypto, stack_first_offer, stack_code, stack_credit, stack_foundation, free_shipping").eq("user_id", id).maybeSingle(),
        db.from("titan_club_settings").select("enabled").eq("id", 1).maybeSingle(),
      ]);
      if (m.error || st.error) throw m.error || st.error;
      if (!m.data) return null;
      return { programmeOn: st.data?.enabled === true, active: (m.data as any).active === true, club: m.data };
    },
    memberEmail: async (id) => {
      const { data, error } = await db.auth.admin.getUserById(id);
      if (error) {
        if ((error as any).status === 404 || /not.?found/i.test(error.message ?? "")) return undefined;
        throw new Error("user lookup unavailable");
      }
      if (!data?.user) return undefined;
      return data.user.email ?? null;
    },
    firstName: async (id) => {
      const { data } = await db.from("profiles").select("first_name").eq("id", id).maybeSingle();
      return data?.first_name?.trim() || null;
    },
    finish: async (job, outcome) => {
      const { error } = await q().update({ completed_at: new Date().toISOString(), outcome, claimed_until: null }).eq("user_id", job.user_id);
      if (error) throw error;
    },
    retryLater: async (job, message) => {
      await q().update({ last_error: message, claimed_until: null, next_attempt_at: new Date(Date.now() + 55 * 60_000).toISOString() }).eq("user_id", job.user_id);
    },
    send: sendTemplateEmail,
  });
}
