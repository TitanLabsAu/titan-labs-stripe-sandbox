import { describe, expect, test } from "bun:test";
import { clubConfirmText, draftFromMember, draftToInput, isClubDraftDirty, newClubDraft, validateClubDraft } from "../src/lib/titan-club-draft";
import type { AdminClubMember } from "../src/lib/titan-club.functions";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const row = (o: Partial<AdminClubMember> = {}): AdminClubMember => ({
  userId: A, name: "Demo A", email: "a@example.test", type: "percent", percent: 25, fixedCents: 0, maxCapPercent: 30,
  active: true, note: "vip", assignedAt: "2026-01-01", updatedAt: "2026-01-01", revokedAt: null, ...o,
});

describe("shared Titan Club draft", () => {
  test("loads existing rows accurately, including inactive with note", () => {
    const d = draftFromMember(row({ active: false, note: "paused", type: "fixed", fixedCents: 1250 }));
    expect(d).toMatchObject({ active: false, note: "paused", type: "fixed", amount: "12.50", maxCap: "30", isNew: false });
    expect(isClubDraftDirty(d, row({ active: false, note: "paused", type: "fixed", fixedCents: 1250 }))).toBe(false);
  });
  test("per-member drafts are bound to their own user id (no cross-member values)", () => {
    const a = draftFromMember(row());
    const b = newClubDraft({ userId: B, name: "Demo B", email: null }, 20);
    expect(draftToInput(a).userId).toBe(A);
    expect(draftToInput(b)).toMatchObject({ userId: B, percent: 0 });
    expect(b.amount).toBe("");
  });
  test("dirty tracking: toggle/benefit/note changes", () => {
    const e = row();
    expect(isClubDraftDirty({ ...draftFromMember(e), active: false }, e)).toBe(true);
    expect(isClubDraftDirty({ ...draftFromMember(e), note: "x" }, e)).toBe(true);
    expect(isClubDraftDirty({ ...draftFromMember(e), amount: "25.0" }, e)).toBe(false);
    expect(isClubDraftDirty(newClubDraft({ userId: B, name: "B", email: null }, 20), null)).toBe(true);
  });
  test("validation: blank, range, website-cap floor, fixed", () => {
    const n = newClubDraft({ userId: B, name: "B", email: null }, 20);
    expect(validateClubDraft(n, 20, null)).toMatch(/Enter the benefit/);
    expect(validateClubDraft({ ...n, amount: "25", maxCap: "15" }, 20, null)).toMatch(/website cap of 20%/);
    expect(validateClubDraft({ ...n, amount: "25", maxCap: "101" }, 20, null)).not.toBeNull();
    expect(validateClubDraft({ ...n, amount: "25", maxCap: "30" }, 20, null)).toBeNull();
    expect(validateClubDraft({ ...n, type: "fixed", amount: "15.00", maxCap: "30" }, 20, null)).toBeNull();
    expect(draftToInput({ ...n, type: "fixed", amount: "15.00", maxCap: "30" })).toMatchObject({ fixedDollars: 15 });
    // unchanged existing max below a raised website cap is preserved
    expect(validateClubDraft(draftFromMember(row({ maxCapPercent: 18 })), 20, row({ maxCapPercent: 18 }))).toBeNull();
  });
  test("confirmation warns above cap and describes revoke", () => {
    const d = { ...newClubDraft({ userId: B, name: "B", email: null }, 20), amount: "25", maxCap: "30" };
    expect(clubConfirmText(d, 20)).toMatch(/ABOVE the website cap of 20%/);
    expect(clubConfirmText({ ...draftFromMember(row()), active: false }, 20, row())).toMatch(/^Revoke/);
  });
});
