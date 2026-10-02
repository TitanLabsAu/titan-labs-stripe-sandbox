import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProfileMenu } from "@/components/ProfileMenu";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  CALENDAR_PREFILL_KEY,
  calendarPrefill,
  FREQUENCIES,
  localDate,
  monthDays,
  occursOn,
  type CalendarEntry,
  type Frequency,
} from "@/lib/member-calendar";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [{ title: "My Calendar | Titan Labs Aus" }, { name: "robots", content: "noindex" }],
  }),
  component: CalendarPage,
});
const initialForm = {
  product_name: "",
  dose_label: "",
  start_date: "",
  end_date: "",
  frequency: "once" as Frequency,
  time_of_day: "",
  notes: "",
};
const frequencyLabel: Record<Frequency, string> = {
  once: "Once",
  daily: "Daily",
  weekly: "Weekly",
  fortnightly: "Every two weeks",
  monthly: "Monthly",
};
function CalendarPage() {
  const { user } = Route.useRouteContext();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => localDate());
  const today = localDate();
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase
      .from("member_calendar_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date");
    if (err) setError("Your calendar could not be loaded. Please retry.");
    else setEntries((data ?? []) as CalendarEntry[]);
    setLoading(false);
  }, [user.id]);
  useEffect(() => {
    setForm((f) => ({ ...f, start_date: localDate() }));
    try {
      const raw = sessionStorage.getItem(CALENDAR_PREFILL_KEY);
      if (raw) {
        const p = calendarPrefill(JSON.parse(raw));
        if (p) setForm((f) => ({ ...f, ...p, start_date: localDate() }));
        sessionStorage.removeItem(CALENDAR_PREFILL_KEY);
      }
    } catch {
      /* unavailable or malformed handoff */
    }
    void load();
  }, [load]);
  const reset = () => {
    setEditId(null);
    setForm({ ...initialForm, start_date: today });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (form.end_date && form.end_date < form.start_date) {
      toast.error("End date must be on or after the start date.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        product_name: form.product_name.trim(),
        user_id: user.id,
        end_date: form.end_date || null,
        time_of_day: form.time_of_day || null,
      };
      const result = editId
        ? await supabase
            .from("member_calendar_entries")
            .update(payload)
            .eq("id", editId)
            .eq("user_id", user.id)
            .select("id")
            .single()
        : await supabase.from("member_calendar_entries").insert(payload).select("id").single();
      if (result.error) throw result.error;
      toast.success(editId ? "Schedule updated" : "Schedule added");
      reset();
      await load();
    } catch {
      toast.error("Could not save this schedule. Please retry.");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this schedule?")) return;
    const { error: err } = await supabase
      .from("member_calendar_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (err) toast.error("Could not delete this schedule.");
    else {
      if (editId === id) reset();
      await load();
    }
  };
  const dayEntries = (date: string) => entries.filter((e) => occursOn(e, date));
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <ProfileMenu email={user.email} />
        <TitanPageHeading
          as="h1"
          icon={CalendarDays}
          eyebrow="Member research tool"
          title="My Calendar"
        />
        <p className="mt-4 text-sm text-muted-foreground">
          Record your own research measurements and reminders. Titan does not prescribe schedules or
          doses.
        </p>
        <div className="mt-7 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <form onSubmit={save} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-xl font-bold uppercase">
              {editId ? "Edit schedule" : "Add schedule"}
            </h2>
            <div>
              <Label htmlFor="calendar-product">Product / entry</Label>
              <Input
                id="calendar-product"
                required
                maxLength={120}
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="calendar-amount">Amount / measurement note</Label>
              <Input
                id="calendar-amount"
                maxLength={240}
                value={form.dose_label}
                onChange={(e) => setForm({ ...form, dose_label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="calendar-start">Start date</Label>
                <Input
                  id="calendar-start"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="calendar-end">End date (optional)</Label>
                <Input
                  id="calendar-end"
                  type="date"
                  min={form.start_date}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="calendar-frequency">Repeat</Label>
              <select
                id="calendar-frequency"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {frequencyLabel[f]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="calendar-time">Local time (optional)</Label>
              <Input
                id="calendar-time"
                type="time"
                value={form.time_of_day}
                onChange={(e) => setForm({ ...form, time_of_day: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="calendar-notes">Notes</Label>
              <textarea
                id="calendar-notes"
                maxLength={2000}
                className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <Button disabled={saving || !form.product_name.trim()} className="w-full">
              {saving ? "Saving…" : editId ? "Save changes" : "Add to calendar"}
            </Button>
            {editId ? (
              <Button type="button" variant="outline" className="w-full" onClick={reset}>
                Cancel edit
              </Button>
            ) : null}
          </form>
          <div className="min-w-0 space-y-5">
            {error ? (
              <div role="alert" className="rounded-xl border border-destructive p-4 text-sm">
                {error}
                <Button variant="outline" onClick={() => void load()} className="ml-3">
                  Retry
                </Button>
              </div>
            ) : null}
            <section
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
              aria-label="Monthly calendar"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                >
                  <ChevronLeft />
                </Button>
                <h2 className="text-center font-display text-lg font-bold">
                  {month.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
                </h2>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[10px] font-bold text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
                {monthDays(month).map((date, i) =>
                  date ? (
                    <button
                      key={date}
                      type="button"
                      aria-pressed={selected === date}
                      aria-label={`${date}, ${dayEntries(date).length} entries`}
                      onClick={() => setSelected(date)}
                      className={`min-h-14 rounded-md border p-1 text-center text-sm sm:min-h-20 ${selected === date ? "border-primary bg-primary/15" : "border-border"} ${date === today ? "font-bold text-accent" : ""}`}
                    >
                      <span>{Number(date.slice(8))}</span>
                      {dayEntries(date).length ? (
                        <span className="mt-1 block text-[9px] text-primary">
                          {dayEntries(date).length}
                          <span className="hidden sm:inline"> entries</span>
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <div key={`blank-${i}`} />
                  ),
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setMonth(new Date());
                  setSelected(today);
                }}
              >
                Today
              </Button>
            </section>
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold uppercase">
                {selected === today ? "Today’s entries" : `Entries for ${selected}`}
              </h2>
              {loading ? (
                <p className="mt-3 text-sm">Loading…</p>
              ) : dayEntries(selected).length ? (
                dayEntries(selected).map((e) => (
                  <div key={e.id} className="mt-3 border-b border-border pb-3 last:border-0">
                    <p className="font-semibold">
                      {e.product_name}
                      {e.time_of_day ? ` · ${e.time_of_day.slice(0, 5)}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">{e.dose_label}</p>
                    {e.notes ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {e.notes}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No entries for this day.</p>
              )}
            </section>
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold uppercase">My schedules</h2>
              {!loading && !entries.length ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Add your first schedule using the form.
                </p>
              ) : null}
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start justify-between gap-2 border-b border-border py-4 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{e.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {frequencyLabel[e.frequency]} · {e.start_date}
                      {e.end_date ? ` to ${e.end_date}` : ""}
                    </p>
                    <p className="break-words text-sm text-muted-foreground">{e.dose_label}</p>
                  </div>
                  <div className="flex shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${e.product_name}`}
                      onClick={() => {
                        setEditId(e.id);
                        setForm({
                          product_name: e.product_name,
                          dose_label: e.dose_label,
                          start_date: e.start_date,
                          end_date: e.end_date ?? "",
                          frequency: e.frequency,
                          time_of_day: e.time_of_day?.slice(0, 5) ?? "",
                          notes: e.notes,
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${e.product_name}`}
                      onClick={() => void remove(e.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
