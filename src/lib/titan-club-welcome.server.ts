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
  stillActive: (userId: string) => Promise<boolean>;
  finish: (job: Job, outcome: string) => Promise<void>;
  retryLater: (job: Job, error: string) => Promise<void>;
  send: Send;
};

export async function processClubWelcomeJobs(deps: ClubWelcomeDeps) {
  const jobs = await deps.claim();
  let sent = 0;
  for (const job of jobs) {
    try {
      const club = parseClubSnapshot(job.snapshot);
      if (!club) { await deps.finish(job, "invalid_snapshot"); continue; }
      if (!(await deps.stillActive(job.user_id))) { await deps.finish(job, "not_active"); continue; }
      const email = await deps.memberEmail(job.user_id);
      if (email === undefined) { await deps.finish(job, "user_missing"); continue; }
      if (!email) { await deps.finish(job, "no_email"); continue; }
      const result = await deps.send(CLUB_WELCOME_TEMPLATE, email, {
        templateData: { firstName: (await deps.firstName(job.user_id)) ?? "", club },
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
      if (error) throw error;
      return (data ?? []) as Job[];
    },
    stillActive: async (id) => {
      const { data, error } = await db.from("titan_club_members").select("active").eq("user_id", id).maybeSingle();
      if (error) throw error;
      return data?.active === true;
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
