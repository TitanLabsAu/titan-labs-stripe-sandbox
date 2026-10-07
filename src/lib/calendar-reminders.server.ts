import { occursOn, type CalendarEntry } from "@/lib/member-calendar";

/** Melbourne date/hour; members are Australian and entries store local dates. */
function melbourneNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

/** Send at most one reminder per opted-in entry per occurrence day, from 6am Melbourne. */
export async function sendCalendarReminders(): Promise<number> {
  const { date, hour } = melbourneNow();
  if (hour < 6) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const { data: entries, error } = await supabaseAdmin
    .from("member_calendar_entries")
    .select("*")
    .eq("reminder_enabled", true)
    .lte("start_date", date);
  if (error) throw error;
  let sent = 0;
  for (const e of entries ?? []) {
    if (!occursOn(e as CalendarEntry, date)) continue;
    const { error: claimErr } = await supabaseAdmin
      .from("member_calendar_reminder_sends")
      .insert({ entry_id: e.id, occurs_on: date });
    if (claimErr) continue; // already sent (or claimed) today
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(e.user_id);
      const email = u.user?.email;
      if (!email) continue;
      const { data: profile } = await supabaseAdmin.from("profiles").select("first_name").eq("id", e.user_id).maybeSingle();
      const r = await sendTemplateEmail("calendar-reminder", email, {
        templateData: {
          name: profile?.first_name || "there",
          productName: e.product_name,
          doseLabel: e.dose_label,
          notes: e.notes,
          date,
          time: e.time_of_day ? String(e.time_of_day).slice(0, 5) : "",
        },
        idempotencyKey: `calendar-reminder-${e.id}-${date}`,
      });
      if (r.sent) sent++;
    } catch (err) {
      console.error("[calendar-reminder]", err);
      await supabaseAdmin.from("member_calendar_reminder_sends").delete().eq("entry_id", e.id).eq("occurs_on", date);
    }
  }
  return sent;
}
