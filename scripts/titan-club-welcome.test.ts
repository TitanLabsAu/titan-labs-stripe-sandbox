import { describe, expect, test } from "bun:test";
import * as React from "react";
import { render } from "@react-email/render";
import { TitanClubWelcome, demoClub, template } from "../src/lib/email-templates/titan-club-welcome";
import { TEMPLATES } from "../src/lib/email-templates/registry";
import { parseClubSnapshot } from "../src/lib/titan-club-welcome";
import { processClubWelcomeJobs, type ClubWelcomeDeps } from "../src/lib/titan-club-welcome.server";

const html = (props: any) => render(React.createElement(TitanClubWelcome, props));
const text = (props: any) => render(React.createElement(TitanClubWelcome, props), { plainText: true });

describe("Titan Club congratulations template", () => {
  test("registered with Alex preview", () => {
    expect(TEMPLATES["titan-club-welcome"]).toBe(template);
    expect(template.previewData.firstName).toBe("Alex");
  });
  test("percent demo: benefit, cap, combos, shipping, no Foundation promise", async () => {
    const t = await text({ firstName: "Alex", club: demoClub });
    expect(t).toContain("10% off every purchase");
    expect(t).toContain("personal maximum is 30%");
    expect(t).toContain("multi-buy savings, the crypto payment discount, discount codes, your referral rewards");
    expect(t).toContain("only if you are still eligible");
    expect(t).toContain("no minimum spend");
    expect(t).toContain("kit prices already include their savings");
    expect(t).toContain("while your Club membership and The Titan Club programme are active");
    expect(t).not.toMatch(/Foundation/);
  });
  test("fixed AUD and shipping off", async () => {
    const t = await text({ club: { ...demoClub, benefit_type: "fixed", percent: null, fixed_cents: 2550, free_shipping: false } });
    expect(t).toContain("$25.50 AUD off every purchase");
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
    stillActive: async () => true,
    finish: async (_j, o) => { log.finished.push(o); },
    retryLater: async (_j, e) => { log.retried.push(e); },
    send: async (t, to, o) => { log.sends.push({ t, to, o }); return { sent: true }; },
    ...over,
  };
  return { d, log };
}

describe("Titan Club congratulations worker", () => {
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
    for (const [over, outcome] of [[{ memberEmail: async () => null }, "no_email"], [{ memberEmail: async () => undefined }, "user_missing"], [{ stillActive: async () => false }, "not_active"]] as const) {
      const { d, log } = deps(over as any);
      await processClubWelcomeJobs(d);
      expect(log.sends.length).toBe(0);
      expect(log.finished).toEqual([outcome]);
    }
  });
});
