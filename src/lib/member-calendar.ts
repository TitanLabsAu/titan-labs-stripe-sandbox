/** Date-only calendar arithmetic: member-local dates, never UTC conversion. */
export const FREQUENCIES = ["once", "daily", "weekly", "fortnightly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export type CalendarEntry = {
  id: string;
  product_name: string;
  dose_label: string;
  start_date: string;
  end_date: string | null;
  frequency: Frequency;
  time_of_day: string | null;
  notes: string;
  reminder_enabled?: boolean;
};
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime()) && localDate(d) === value;
}
const dayNumber = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86400000;
};
export function occursOn(entry: CalendarEntry, date: string): boolean {
  if (
    !isDate(date) ||
    !isDate(entry.start_date) ||
    date < entry.start_date ||
    (entry.end_date && date > entry.end_date)
  )
    return false;
  const delta = dayNumber(date) - dayNumber(entry.start_date);
  if (entry.frequency === "daily") return true;
  if (entry.frequency === "weekly") return delta % 7 === 0;
  if (entry.frequency === "fortnightly") return delta % 14 === 0;
  if (entry.frequency === "monthly") {
    const [year, month, day] = date.split("-").map(Number);
    const lastDay = new Date(year!, month!, 0).getDate();
    return day === Math.min(Number(entry.start_date.slice(8)), lastDay);
  }
  return delta === 0;
}
export function monthDays(month: Date): Array<string | null> {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days: Array<string | null> = Array.from({ length: (first.getDay() + 6) % 7 }, () => null);
  for (let day = 1; day <= count; day++)
    days.push(localDate(new Date(first.getFullYear(), first.getMonth(), day, 12)));
  while (days.length % 7) days.push(null);
  return days;
}
export const CALENDAR_PREFILL_KEY = "titan_calendar_prefill";
export function calendarPrefill(
  value: unknown,
): { product_name: string; dose_label: string } | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v["product_name"] !== "string" || typeof v["dose_label"] !== "string") return null;
  return {
    product_name: v["product_name"].slice(0, 120),
    dose_label: v["dose_label"].slice(0, 240),
  };
}
