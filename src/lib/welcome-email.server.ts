import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "./products";
import {
  WELCOME_MAX_ATTEMPTS, WELCOME_TEMPLATE, settingsFromDb, welcomeHotProducts, type WelcomeEmailData,
} from "./welcome-email";

type Job = { user_id: string; template_version: string; attempts: number };
type Send = (template: string, to: string, opts: any) => Promise<{ sent: boolean }>;

/** Everything the worker touches, injectable so tests never reach the database or provider. */
export type WelcomeDeps = {
  enabled: () => Promise<boolean>;
  claim: () => Promise<Job[]>;
  /** Recipient comes only from the confirmed auth user — never from request input. */
  confirmedUser: (userId: string) => Promise<{ email: string; confirmed: boolean } | null>;
  firstName: (userId: string) => Promise<string | null>;
  referralCode: (userId: string) => Promise<string | null>;
  catalogue: () => Promise<{ products: Product[]; content: Record<string, string>; settings: any }>;
  finish: (job: Job, outcome: string) => Promise<void>;
  retryLater: (job: Job, error: string) => Promise<void>;
  send: Send;
};

export async function processWelcomeJobs(deps: WelcomeDeps) {
  if (!(await deps.enabled())) return { sent: 0, processed: 0 };
  const jobs = await deps.claim();
  let sent = 0;
  let catalogue: Awaited<ReturnType<WelcomeDeps["catalogue"]>> | null = null;
  for (const job of jobs) {
    try {
      const user = await deps.confirmedUser(job.user_id);
      if (!user) { await deps.finish(job, "user_missing"); continue; }
      if (!user.confirmed || !user.email) { await deps.finish(job, "unconfirmed"); continue; }
      const code = await deps.referralCode(job.user_id);
      if (!code) {
        // Codes are issued separately; wait rather than sending a generic one.
        if (job.attempts >= WELCOME_MAX_ATTEMPTS) await deps.finish(job, "no_referral_code");
        else await deps.retryLater(job, "referral code not issued yet");
        continue;
      }
      catalogue ??= await deps.catalogue();
      const data: WelcomeEmailData = {
        firstName: (await deps.firstName(job.user_id)) ?? "",
        referralCode: code,
        products: welcomeHotProducts(catalogue.products, catalogue.content),
        settings: settingsFromDb(catalogue.settings),
      };
      // Re-check right before the provider call so switching OFF stops remaining jobs.
      if (!(await deps.enabled())) { await deps.retryLater(job, "paused: feature disabled"); continue; }
      const result = await deps.send(WELCOME_TEMPLATE, user.email, {
        templateData: data,
        idempotencyKey: `member-welcome-${job.template_version}-${job.user_id}`,
        fromName: "Titan Labs Aus",
      });
      if (result.sent) sent++;
      await deps.finish(job, result.sent ? "sent" : "recipient_suppressed");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (job.attempts >= WELCOME_MAX_ATTEMPTS) await deps.finish(job, "failed").catch(() => {});
      else await deps.retryLater(job, msg.slice(0, 300)).catch(() => {});
      console.error("[member-welcome] attempt failed", job.user_id);
    }
  }
  return { sent, processed: jobs.length };
}

export async function sendPendingWelcomeEmails() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const { toProduct, PRODUCT_COLUMNS } = await import("@/lib/catalog.functions");
  const db = supabaseAdmin as unknown as SupabaseClient;
  const key = (j: Job) => ({ user_id: j.user_id, template_version: j.template_version });
  return processWelcomeJobs({
    enabled: async () => {
      const { data } = await db.from("welcome_email_settings").select("enabled").eq("id", 1).maybeSingle();
      return data?.enabled === true;
    },
    claim: async () => {
      const { data, error } = await db.rpc("claim_member_welcome_emails", { _limit: 20 });
      if (error) throw error;
      return (data ?? []) as Job[];
    },
    confirmedUser: async (id) => {
      const { data, error } = await db.auth.admin.getUserById(id);
      // Only a definitive not-found is final; outages/other errors throw so the job retries.
      if (error) {
        if ((error as any).status === 404 || /not.?found/i.test(error.message ?? "")) return null;
        throw new Error("user lookup unavailable");
      }
      if (!data?.user) return null;
      return { email: data.user.email ?? "", confirmed: Boolean(data.user.email_confirmed_at) };
    },
    firstName: async (id) => {
      const { data } = await db.from("profiles").select("first_name").eq("id", id).maybeSingle();
      return data?.first_name?.trim() || null;
    },
    // Reuses the member's existing code or atomically issues one (DB-gated to queued, confirmed members).
    referralCode: async (id) => {
      const { data, error } = await db.rpc("allocate_welcome_referral_code", { _user_id: id });
      if (error) { console.error("[member-welcome] code allocation pending", id); return null; }
      return typeof data === "string" && data ? data : null;
    },
    catalogue: async () => {
      const [p, c, s] = await Promise.all([
        db.from("products").select(PRODUCT_COLUMNS).eq("active", true).order("name"),
        db.from("site_content").select("key, body"),
        db.from("referral_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (p.error || c.error || s.error) throw p.error || c.error || s.error;
      const content: Record<string, string> = {};
      for (const r of c.data ?? []) content[(r as any).key] = (r as any).body ?? "";
      return { products: (p.data ?? []).map(toProduct), content, settings: s.data };
    },
    finish: async (job, outcome) => {
      const { error } = await db.from("member_welcome_email_queue")
        .update({ completed_at: new Date().toISOString(), outcome, claimed_until: null }).match(key(job));
      if (error) throw error;
    },
    retryLater: async (job, message) => {
      await db.from("member_welcome_email_queue")
        .update({ last_error: message, claimed_until: null, next_attempt_at: new Date(Date.now() + 55 * 60_000).toISOString() })
        .match(key(job));
    },
    send: sendTemplateEmail,
  });
}
