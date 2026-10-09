// Business dates are Melbourne calendar days, independent of the browser/server timezone.
export const BUSINESS_TZ = "Australia/Melbourne";

/** YYYY-MM-DD for the given instant in Melbourne. */
export function melbourneDay(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Add whole days to a YYYY-MM-DD string (pure calendar maths, no timezone). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function melbourneRange(preset: string, at: Date = new Date()) {
  const to = melbourneDay(at);
  if (preset === "month") return { from: `${to.slice(0, 7)}-01`, to };
  if (preset === "quarter") return { from: addDays(to, -89), to };
  if (preset === "year") return { from: `${to.slice(0, 4)}-01-01`, to };
  return { from: "2020-01-01", to };
}
