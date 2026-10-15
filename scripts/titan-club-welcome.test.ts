import { describe, expect, test } from "bun:test";
import * as React from "react";
import { render } from "@react-email/render";
import { TitanClubWelcome, demoClub, template } from "../src/lib/email-templates/titan-club-welcome";
import { TEMPLATES } from "../src/lib/email-templates/registry";
import { clubSaveMessage, clubWelcomeSubject, parseClubSnapshot } from "../src/lib/titan-club-welcome";
import { processClubWelcomeJobs, type ClubWelcomeDeps } from "../src/lib/titan-club-welcome.server";

const html = (props: any) => render(React.createElement(TitanClubWelcome, props));
const text = (props: any) => render(React.createElement(TitanClubWelcome, props), { plainText: true });

describe("Titan Club congratulations template", () => {
  test("registered with Alex preview", () => {
    expect(TEMPLATES["titan-club-welcome"]).toBe(template);
    expect(template.previewData.firstName).toBe("Alex");
    expect(clubWelcomeSubject({ firstName: "Alex" })).toBe("You're in: Welcome to The Titan Club, Alex");
    expect(clubWelcomeSubject({})).toBe("You're in: Welcome to The Titan Club");
  });
  test("percent demo: benefit, cap, combos, shipping, no Foundation promise", async () => {
    const t = await text({ firstName: "Alex", club: demoClub });
    expect(t).toContain("10% off every purchase");
    expect(t).toContain("As one of our valued members");
    expect(t).toContain("Enjoy 10% off products on every eligible order");
    expect(t).toContain("Stackable Perks:");
    expect(t).toContain("Guaranteed Best Price:");
    expect(t).not.toContain("Express Shipping");
    expect(t).toContain("exclusive 30% order cap");
    expect(t).toContain("website's usual cap applies");
    expect(t).toContain("Shipping is not part of either cap");
    expect(t).not.toMatch(/all (your )?orders/i);
    expect(t).toContain("multi-buy savings, the crypto payment discount, discount codes, your referral rewards");
    expect(t).toContain("only if you are still eligible");
    expect(t).toContain("no minimum spend");
    expect(t).toContain("already include built-in savings and retain their special pricing");
    expect(t).toContain("while your Club membership and The Titan Club programme are active");
    expect(t).not.toMatch(/Foundation/);
  });
  test("fixed AUD and shipping off", async () => {
    const t = await text({ club: { ...demoClub, benefit_type: "fixed", percent: null, fixed_cents: 2550, free_shipping: false } });
    expect(t).toContain("$25.50 AUD off every purchase");
    expect(t).toContain("Your saving applies to products only, up to their value");
    expect(t).not.toContain("10%");
    expect(t).not.toMatch(/free shipping/i);
  });
  test("no stacking: applies on its own; first offer not mentioned", async () => {
    const off = { stack_multibuy: false, stack_crypto: false, stack_first_offer: false, stack_code: false, stack_credit: false };
    const t = await text({ club: { ...demoClub, ...off } });
    expect(t).toContain("applies on its own");
    expect(t).not.toContain("first-purchase offer");
  });
  test("Foundation on is conditional", async () => {
    expect(await text({ club: { ...demoClub, stack_foundation: true } })).toContain("If you hold Foundation Member status");
  });
  test("escapes names, fixed links, no private fields", async () => {
    const h = await html({ firstName: '<script>x</script>"', club: { ...demoClub, note: "SECRET-NOTE" } as any });
    expect(h).not.toContain("<script>x");
    expect(h).toContain("&lt;script&gt;");
    expect(h).not.toContain("SECRET-NOTE");
    const hrefs = [...h.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.sort()).toEqual(["https://titanlabsaus.com/account", "https://titanlabsaus.com/range"]);
  });
  test("snapshot parser drops unknown fields and rejects invalid", () => {
    expect(Object.keys(parseClubSnapshot({ ...demoClub, note: "x" })!)).not.toContain("note");
    expect(parseClubSnapshot({ benefit_type: "percent", percent: 0, max_cap_percent: 30 })).toBeNull();
    expect(parseClubSnapshot(null)).toBeNull();
  });
});

function deps(over: Partial<ClubWelcomeDeps> = {}) {
  const log = { finished: [] as string[], retried: [] as string[], sends: [] as any[] };
  const d: ClubWelcomeDeps = {
    claim: async () => [{ user_id: "u1", snapshot: demoClub, attempts: 1 }],
    memberEmail: async () => "alex@example.test",
    firstName: async () => "Alex",
    current: async () => ({ programmeOn: true, active: true, club: demoClub }),
    finish: async (_j, o) => { log.finished.push(o); },
    retryLater: async (_j, e) => { log.retried.push(e); },
    send: async (t, to, o) => { log.sends.push({ t, to, o }); return { sent: true }; },
    ...over,
  };
  return { d, log };
}

describe("Titan Club congratulations worker", () => {
  test("rejoining uses same template with updated perks and a distinct stable event key", async () => {
    const updated = { ...demoClub, percent: 25, max_cap_percent: 35, free_shipping: false, stack_foundation: true };
    const { d, log } = deps({
      claim: async () => [{ user_id: "u1", snapshot: demoClub, attempts: 1, welcome_event_id: "rejoin-2" }],
      current: async () => ({ programmeOn: true, active: true, club: updated, welcome_event_id: "rejoin-2" }),
    });
    await processClubWelcomeJobs(d);
    await processClubWelcomeJobs(d);
    expect(log.sends.map((s) => s.o.idempotencyKey)).toEqual(["titan-club-welcome-u1-rejoin-2", "titan-club-welcome-u1-rejoin-2"]);
    expect(log.sends[0].t).toBe("titan-club-welcome");
    const rendered = await text(log.sends[0].o.templateData);
    expect(rendered).toContain("As one of our valued members");
    expect(rendered).toContain("25% off every purchase");
    expect(rendered).toContain("exclusive 35% order cap");
    expect(rendered).toContain("If you hold Foundation Member status");
    expect(rendered).not.toMatch(/free shipping/i);
  });
  test("superseded job never sends a new activation's perks under its old key", async () => {
    for (const supersedeAt of [0, 1]) {
      let reads = 0;
      const { d, log } = deps({
        claim: async () => [{ user_id: "u1", snapshot: demoClub, attempts: 1, welcome_event_id: "old-event" }],
        current: async () => ({ programmeOn: true, active: true, club: demoClub, welcome_event_id: reads++ >= supersedeAt ? "new-event" : "old-event" }),
      });
      await processClubWelcomeJobs(d);
      expect(log.sends).toEqual([]);
      expect(log.finished).toEqual([]);
      expect(log.retried).toEqual([]);
    }
  });
  test("success uses server recipient and stable idempotency key", async () => {
    const { d, log } = deps();
    expect((await processClubWelcomeJobs(d)).sent).toBe(1);
    expect(log.sends[0].to).toBe("alex@example.test");
    expect(log.sends[0].o.idempotencyKey).toBe("titan-club-welcome-u1");
    expect(log.sends[0].o.fromName).toBe("Titan Labs Aus");
    expect(log.finished).toEqual(["sent"]);
  });
  test("suppressed is terminal", async () => {
    const { d, log } = deps({ send: async () => ({ sent: false }) });
    await processClubWelcomeJobs(d);
    expect(log.finished).toEqual(["recipient_suppressed"]);
  });
  test("transient failure retries, then fails after max attempts", async () => {
    const { d, log } = deps({ send: async () => { throw new Error("503"); } });
    await processClubWelcomeJobs(d);
    expect(log.retried).toEqual(["503"]);
    const { d: d2, log: l2 } = deps({ send: async () => { throw new Error("503"); }, claim: async () => [{ user_id: "u1", snapshot: demoClub, attempts: 24 }] });
    await processClubWelcomeJobs(d2);
    expect(l2.finished).toEqual(["failed"]);
  });
  test("lookup outage retries without sending", async () => {
    const { d, log } = deps({ memberEmail: async () => { throw new Error("user lookup unavailable"); } });
    await processClubWelcomeJobs(d);
    expect(log.sends.length).toBe(0);
    expect(log.retried.length).toBe(1);
  });
  test("missing email / missing user / revoked finish safely without sending", async () => {
    for (const [over, outcome] of [[{ memberEmail: async () => null }, "no_email"], [{ memberEmail: async () => undefined }, "user_missing"], [{ current: async () => ({ programmeOn: true, active: false, club: demoClub }) }, "not_active"]] as const) {
      const { d, log } = deps(over as any);
      await processClubWelcomeJobs(d);
      expect(log.sends.length).toBe(0);
      expect(log.finished).toEqual([outcome]);
    }
  });
});

const noStack = { stack_multibuy: false, stack_crypto: false, stack_first_offer: false, stack_code: false, stack_credit: false, stack_foundation: false };
describe("audit follow-up", () => {
  test("only Foundation allowed does NOT say 'on its own'", async () => {
    const t = await text({ club: { ...demoClub, ...noStack, stack_foundation: true } });
    expect(t).not.toContain("applies on its own");
    expect(t).toContain("If you hold Foundation Member status");
    expect(await text({ club: { ...demoClub, ...noStack } })).toContain("applies on its own");
  });
  test("real HTML + plain text render, CTA routes exist", async () => {
    const h = await html({ firstName: "Alex", club: demoClub });
    const t = await text({ firstName: "Alex", club: demoClub });
    expect(h).toMatch(/^<!DOCTYPE html/i);
    expect(t).not.toMatch(/<[a-z]/i);
    expect(t).toContain("ALEX");
    const fs = await import("node:fs");
    expect(fs.existsSync("src/routes/_authenticated/account.tsx")).toBe(true);
    expect(fs.existsSync("src/routes/range.tsx")).toBe(true);
  });
  test("edited perks before send: email uses current saved perks, not queued copy", async () => {
    const edited = { ...demoClub, benefit_type: "fixed", percent: null, fixed_cents: 1500, free_shipping: false };
    const { d, log } = deps({ claim: async () => [{ user_id: "u1", snapshot: demoClub, attempts: 1 }], current: async () => ({ programmeOn: true, active: true, club: edited }) });
    await processClubWelcomeJobs(d);
    expect(log.sends[0].o.templateData.club.fixed_cents).toBe(1500);
    expect(log.sends[0].o.templateData.club.free_shipping).toBe(false);
  });
  test("perks edited between read and provider: retries, no send", async () => {
    let n = 0;
    const { d, log } = deps({ current: async () => ({ programmeOn: true, active: true, club: n++ ? { ...demoClub, percent: 15 } : demoClub }) });
    await processClubWelcomeJobs(d);
    expect(log.sends.length).toBe(0);
    expect(log.retried.length).toBe(1);
    expect(log.finished).toEqual([]);
  });
  test("programme switched off between claim and send defers, does not consume", async () => {
    let n = 0;
    const { d, log } = deps({ current: async () => ({ programmeOn: n++ === 0, active: true, club: demoClub }) });
    await processClubWelcomeJobs(d);
    expect(log.sends.length).toBe(0);
    expect(log.finished).toEqual([]);
    expect(log.retried[0]).toMatch(/paused/);
  });
  test("send succeeds but finish fails: retry reuses the same idempotency key", async () => {
    let fail = true;
    const { d, log } = deps({ finish: async (_j, o) => { if (fail) { fail = false; throw new Error("db down"); } log.finished.push(o); } });
    await processClubWelcomeJobs(d);
    await processClubWelcomeJobs(d);
    expect(log.retried).toEqual(["db down"]);
    expect(log.sends.map((s) => s.o.idempotencyKey)).toEqual(["titan-club-welcome-u1", "titan-club-welcome-u1"]);
    expect(log.finished).toEqual(["sent"]);
  });
  test("no private data even if the saved row carries extras", async () => {
    const { d, log } = deps({ current: async () => ({ programmeOn: true, active: true, club: { ...demoClub, note: "SECRET", email: "x@y" } }) });
    await processClubWelcomeJobs(d);
    expect(JSON.stringify(log.sends[0].o.templateData)).not.toMatch(/SECRET|x@y/);
  });
  test("honest Admin save message", () => {
    expect(clubSaveMessage({ changed: false })).toBe("No changes to save");
    expect(clubSaveMessage({ changed: true, welcome: "none" })).toBe("Titan Club updated");
    expect(clubSaveMessage({ changed: true, welcome: "queued" })).toMatch(/queued.*next hourly/);
    expect(clubSaveMessage({ changed: true, welcome: "sent" })).not.toMatch(/delivered|inbox/i);
  });
});
describe("branded header", () => {
  test("uses the real site logo at a stable public HTTPS URL with alt and size", async () => {
    const h = await html({ firstName: "Alex", club: demoClub });
    expect(h).toContain('src="https://titanlabsaus.com/images/email/titan-labs-logo-320.png"');
    expect(h).toMatch(/alt="Titan Labs Australia logo"/);
    expect(h).toMatch(/width="140"/);
    expect(h).not.toMatch(/<svg|token=|__l5e/);
    const fs = await import("node:fs");
    expect(fs.existsSync("public/images/email/titan-labs-logo-320.png")).toBe(true);
  });
});
