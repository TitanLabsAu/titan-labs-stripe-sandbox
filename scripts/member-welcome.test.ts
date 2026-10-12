import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as React from "react";
import { render } from "@react-email/render";
import { processWelcomeJobs, type WelcomeDeps } from "../src/lib/welcome-email.server";
import { settingsFromDb, welcomeCopy, welcomeHotProducts, WELCOME_MAX_ATTEMPTS } from "../src/lib/welcome-email";
import { MemberWelcome } from "../src/lib/email-templates/member-welcome";

const dbSettings = { program_enabled: true, reward_every_referrals: 5, reward_percent: 10, reward_expiry_days: 90, combined_cap_percent: 20, crypto_percent: 10, multibuy_tiers: [{ units: 3, percent: 15 }, { units: 2, percent: 10 }], first_offer_enabled: true, first_offer_percent: 10, first_offer_combine_multibuy: true, first_offer_combine_crypto: true, first_offer_combine_code: true, first_offer_combine_credit: true };
const prod = (slug: string, ids: string[], hot: string[] = []) => ({ slug, name: slug.toUpperCase(), price: 1, image: `/images/${slug}.webp`, alt: slug, blurb: "", details: [], variants: ids.map((id) => ({ id, label: id, price: 10, hotProduct: hot.includes(id) ? true : undefined, stock: 5 })) }) as any;

function deps(over: Partial<WelcomeDeps> = {}) {
  const log = { sends: [] as any[], finished: [] as string[], retried: 0 };
  const d: WelcomeDeps = {
    enabled: async () => true,
    claim: async () => [{ user_id: "u1", template_version: "v1", attempts: 1 }],
    confirmedUser: async () => ({ email: "member@example.test", confirmed: true }),
    firstName: async () => "Ana",
    referralCode: async (id) => (id === "u1" ? "ANA-REF" : "OTHER"),
    catalogue: async () => ({ products: [prod("a", ["5mg"], ["5mg"])], content: {}, settings: dbSettings }),
    finish: async (_j, o) => { log.finished.push(o); },
    retryLater: async () => { log.retried++; },
    send: async (t, to, o) => { log.sends.push({ t, to, o }); return { sent: true }; },
    ...over,
  };
  return { d, log };
}

describe("member welcome worker", () => {
  test("flag OFF never claims or sends", async () => {
    let claimed = false;
    const { d, log } = deps({ enabled: async () => false, claim: async () => { claimed = true; return []; } });
    await processWelcomeJobs(d);
    expect(claimed).toBe(false); expect(log.sends.length).toBe(0);
  });
  test("binds exactly this member's code, confirmed email and stable idempotency key", async () => {
    const { d, log } = deps();
    await processWelcomeJobs(d);
    expect(log.sends[0].to).toBe("member@example.test");
    expect(log.sends[0].o.templateData.referralCode).toBe("ANA-REF");
    expect(log.sends[0].o.idempotencyKey).toBe("member-welcome-v1-u1");
    expect(log.sends[0].o.fromName).toBe("Titan Labs Aus");
    expect(log.finished).toEqual(["sent"]);
  });
  test("missing code retries, then stops without a generic code", async () => {
    const a = deps({ referralCode: async () => null }); await processWelcomeJobs(a.d);
    expect(a.log.retried).toBe(1); expect(a.log.sends.length).toBe(0);
    const b = deps({ referralCode: async () => null, claim: async () => [{ user_id: "u1", template_version: "v1", attempts: WELCOME_MAX_ATTEMPTS }] });
    await processWelcomeJobs(b.d);
    expect(b.log.finished).toEqual(["no_referral_code"]); expect(b.log.sends.length).toBe(0);
  });
  test("unconfirmed users are never emailed", async () => {
    const { d, log } = deps({ confirmedUser: async () => ({ email: "x@example.test", confirmed: false }) });
    await processWelcomeJobs(d);
    expect(log.sends.length).toBe(0); expect(log.finished).toEqual(["unconfirmed"]);
  });
  test("suppressed recipient is a final outcome", async () => {
    const { d, log } = deps({ send: async () => ({ sent: false }) });
    await processWelcomeJobs(d);
    expect(log.finished).toEqual(["recipient_suppressed"]);
  });
  test("send failure retries instead of finishing", async () => {
    const { d, log } = deps({ send: async () => { throw new Error("boom"); } });
    await processWelcomeJobs(d);
    expect(log.retried).toBe(1); expect(log.finished.length).toBe(0);
  });
});

describe("welcome content", () => {
  test("uses homepage Hot Product selection, max 4, exact variant links, no padding", () => {
    const products = [prod("a", ["5mg", "10mg"], ["10mg"]), prod("b", ["1"]), prod("c", ["2"], ["2"])];
    const cards = welcomeHotProducts(products, { home_featured: "b::1" });
    expect(cards.map((c) => c.url)).toEqual([
      "https://titanlabsaus.com/product/b?variant=1",
      "https://titanlabsaus.com/product/a?variant=10mg",
      "https://titanlabsaus.com/product/c?variant=2",
    ]);
    expect(cards.every((c) => c.imageUrl.startsWith("https://titanlabsaus.com/"))).toBe(true);
  });
  test("terms come from settings; disabled offer is omitted", () => {
    const s = settingsFromDb(dbSettings);
    const c = welcomeCopy(s);
    expect(c.offer).toContain("applied automatically to your first paid order");
    expect(c.discounts[0]).toBe("Multi-buy: 2+ items: 10% off · 3+ items: 15% off.");
    expect(c.referral).toContain("every 5 paid orders");
    expect(welcomeCopy({ ...s, first_offer_enabled: false }).offer).toBeNull();
  });
  test("renders HTML and plain text with code, links and offer", async () => {
    const el = React.createElement(MemberWelcome, { firstName: "Ana", referralCode: "ANA-REF", products: welcomeHotProducts([prod("a", ["5mg"], ["5mg"])], {}), settings: settingsFromDb(dbSettings) });
    const html = await render(el); const text = await render(el, { plainText: true });
    for (const out of [html, text]) {
      expect(out).toContain("ANA-REF");
      expect(out).toContain("https://titanlabsaus.com/referrals");
      expect(out).toContain("https://titanlabsaus.com/product/a?variant=5mg");
    }
    expect(html).not.toContain("<script");
  });
  test("schema keeps flag OFF by default with activation cutoff and admin/service-only access", () => {
    const sql = readFileSync("drizzle/migrations/0038_member_welcome_email.sql", "utf8");
    expect(sql).toContain("enabled boolean NOT NULL DEFAULT false");
    expect(sql).toContain("NEW.created_at >= s.activated_at");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
    expect(sql).not.toMatch(/TO anon/);
  });
});
