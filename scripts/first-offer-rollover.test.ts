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
  it("keeps a claim whose intent ID is not saved yet (concurrent create / orphan)", async () => {
    const released: string[] = []; let retrieved = 0;
    await rolloverFirstOfferClaims("u", {
      listHeld: async () => [{ attemptId: "a_null", intentId: null }],
      retrieve: async () => { retrieved++; return { status: "requires_payment_method" }; },
      cancel: async () => ({ status: "canceled" }),
      release: async (a) => { released.push(a); },
    });
    expect(released).toEqual([]);
    expect(retrieved).toBe(0);
  });
  it("surfaces lookup and release errors instead of ignoring them", async () => {
    await expect(rolloverFirstOfferClaims("u", { listHeld: async () => { throw new Error("db"); }, retrieve: async () => ({ status: "x" }), cancel: async () => ({ status: "x" }), release: async () => {} })).rejects.toThrow("db");
    await expect(rolloverFirstOfferClaims("u", { listHeld: async () => [{ attemptId: "a", intentId: "pi" }], retrieve: async () => ({ status: "canceled" }), cancel: async () => ({ status: "canceled" }), release: async () => { throw new Error("rpc"); } })).rejects.toThrow("rpc");
  });
});
