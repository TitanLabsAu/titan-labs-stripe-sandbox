import { describe, expect, it } from "bun:test";
import { rolloverFirstOfferClaims, type RolloverDeps } from "../src/lib/first-offer-rollover.server";

function mock(statuses: Record<string, string>, opts: { failRetrieve?: boolean } = {}) {
  const released: string[] = []; const cancelled: string[] = [];
  const deps: RolloverDeps = {
    listHeld: async () => Object.keys(statuses).map((k) => ({ attemptId: "a_" + k, intentId: k })),
    retrieve: async (id) => { if (opts.failRetrieve) throw new Error("net"); return { status: statuses[id] }; },
    cancel: async (id) => { cancelled.push(id); return { status: "canceled" }; },
    release: async (a) => { released.push(a); },
  };
  return { deps, released, cancelled };
}

describe("first-offer rollover (mocked Stripe)", () => {
  it("cancels a retryable failed intent before releasing its claim", async () => {
    const m = mock({ pi_failed: "requires_payment_method" });
    await rolloverFirstOfferClaims("u", m.deps);
    expect(m.cancelled).toEqual(["pi_failed"]);
    expect(m.released).toEqual(["a_pi_failed"]);
  });
  it("never releases processing or succeeded intents", async () => {
    const m = mock({ pi_p: "processing", pi_s: "succeeded" });
    await rolloverFirstOfferClaims("u", m.deps);
    expect(m.cancelled).toEqual([]);
    expect(m.released).toEqual([]);
  });
  it("keeps the claim when Stripe state is unknown", async () => {
    const m = mock({ pi_x: "requires_payment_method" }, { failRetrieve: true });
    await rolloverFirstOfferClaims("u", m.deps);
    expect(m.released).toEqual([]);
  });
  it("keeps the claim if cancellation does not end in canceled", async () => {
    const m = mock({ pi_y: "requires_action" });
    m.deps.cancel = async () => ({ status: "processing" });
    await rolloverFirstOfferClaims("u", m.deps);
    expect(m.released).toEqual([]);
  });
});
