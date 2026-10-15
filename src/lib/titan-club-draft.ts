// Pure Titan Club editor draft helpers shared by Discounts → Titan Club and the
// per-member Admin profile, so both editors validate and save identically.
import { DEFAULT_CLUB_STACKING, type ClubStacking } from "@/lib/order-pricing";
import { clubCapFloorError, validateClubInput, type AdminClubMember, type ClubAssignInput } from "@/lib/titan-club.functions";

export type ClubDraft = {
  userId: string;
  name: string;
  email: string | null;
  type: "percent" | "fixed";
  amount: string;
  maxCap: string;
  note: string;
  active: boolean;
  isNew: boolean;
  stacking: ClubStacking;
};

const shortId = (id: string) => id.slice(0, 8);

export function draftFromMember(m: AdminClubMember): ClubDraft {
  return {
    userId: m.userId, name: m.name, email: m.email, type: m.type,
    amount: m.type === "percent" ? String(m.percent) : (m.fixedCents / 100).toFixed(2),
    maxCap: String(m.maxCapPercent), note: m.note, active: m.active, isNew: false, stacking: { ...(m.stacking ?? DEFAULT_CLUB_STACKING) },
  };
}

export function newClubDraft(c: { userId: string; name: string; email: string | null }, siteCap: number): ClubDraft {
  return { ...c, type: "percent", amount: "", maxCap: String(siteCap), note: "", active: true, isNew: true, stacking: { ...DEFAULT_CLUB_STACKING } };
}

export function draftToInput(d: ClubDraft): ClubAssignInput {
  return {
    userId: d.userId, type: d.type, maxCapPercent: Number(d.maxCap), active: d.active, note: d.note, stacking: { ...d.stacking },
    ...(d.type === "percent" ? { percent: Number(d.amount) } : { fixedDollars: Number(d.amount) }),
  };
}

/** Error message or null, using the same rules as the server (incl. website-cap floor). */
export function validateClubDraft(d: ClubDraft, siteCap: number, existing: AdminClubMember | null): string | null {
  if (d.amount.trim() === "" || d.maxCap.trim() === "") return "Enter the benefit and maximum discount.";
  const input = draftToInput(d);
  return validateClubInput(input) ?? clubCapFloorError(input.maxCapPercent, siteCap, existing ? existing.maxCapPercent : null);
}

/** True when the draft differs from the saved row (or is a new assignment). */
export function isClubDraftDirty(d: ClubDraft, existing: AdminClubMember | null): boolean {
  if (!existing) return d.active;
  const base = draftFromMember(existing);
  if ((Object.keys(DEFAULT_CLUB_STACKING) as (keyof ClubStacking)[]).some((k) => d.stacking[k] !== base.stacking[k])) return true;
  return (["type", "amount", "maxCap", "note", "active"] as const).some((k) =>
    k === "amount" || k === "maxCap" ? Number(d[k]) !== Number(base[k]) || d[k].trim() === "" : d[k] !== base[k]);
}

export function clubConfirmText(d: ClubDraft, siteCap: number, existing: AdminClubMember | null = null): string {
  if (!d.active && existing?.active)
    return `Revoke ${d.name}'s Titan Club benefit? Future checkouts use the standard ${siteCap}% cap; existing orders are unchanged.`;
  const benefit = d.type === "percent" ? `${d.amount}% off` : `$${Number(d.amount).toFixed(2)} off`;
  const lines = [
    `${d.isNew ? "Add" : existing && !existing.active && d.active ? "Reactivate" : "Update"} ${d.name} (${d.email ?? "no email"}, id ${shortId(d.userId)}) in The Titan Club?`,
    `Benefit: ${benefit} every purchase. Personal maximum combined discount: ${d.maxCap}%.`,
  ];
  const off = STACK_LABELS.filter(([k]) => !d.stacking[k]).map(([, l]) => l);
  lines.push(`Combines with: ${STACK_LABELS.filter(([k]) => d.stacking[k]).map(([, l]) => l).join(", ") || "nothing extra"}.${off.length ? ` Not combined: ${off.join(", ")}.` : ""} Foundation Member 5% never combines with Titan Club.`);
  if (Number(d.maxCap) > siteCap)
    lines.push(`WARNING: ${d.maxCap}% is ABOVE the website cap of ${siteCap}%. This member's total product discounts can reach ${d.maxCap}%.`);
  return lines.join("\n\n");
}

export const STACK_LABELS: [keyof ClubStacking, string][] = [
  ["multibuy", "Multi-buy"],
  ["crypto", "Crypto"],
  ["firstOffer", "New-member first purchase"],
  ["code", "Discount codes"],
  ["credit", "Referral rewards"],
];
