/**
 * Before a new card checkout, roll a member's held first-purchase claim forward safely.
 * A claim tied to a superseded intent is only released after that intent is terminally
 * cancelled (or confirmed canceled) — never while it could still be paid.
 */
const CANCELLABLE = new Set(["requires_payment_method", "requires_confirmation", "requires_action"]);

export type RolloverDeps = {
  listHeld: (userId: string) => Promise<{ attemptId: string; intentId: string | null }[]>;
  retrieve: (intentId: string) => Promise<{ status: string }>;
  cancel: (intentId: string) => Promise<{ status: string }>;
  release: (attemptId: string) => Promise<void>;
};

export async function rolloverFirstOfferClaims(userId: string, deps: RolloverDeps) {
  const out: { attemptId: string; action: "released" | "kept" }[] = [];
  for (const h of await deps.listHeld(userId)) {
    // No saved intent ID is UNKNOWN (creation may be in flight or orphaned): keep held.
    if (!h.intentId) {
      out.push({ attemptId: h.attemptId, action: "kept" });
      continue;
    }
    let status = "unknown";
    {
      try {
        status = (await deps.retrieve(h.intentId)).status;
        if (CANCELLABLE.has(status)) status = (await deps.cancel(h.intentId)).status;
      } catch {
        out.push({ attemptId: h.attemptId, action: "kept" }); // unknown state: keep held
        continue;
      }
    }
    if (status === "canceled") {
      await deps.release(h.attemptId);
      out.push({ attemptId: h.attemptId, action: "released" });
    } else out.push({ attemptId: h.attemptId, action: "kept" }); // processing/succeeded: finalisation owns it
  }
  return out;
}

export function stripeRolloverDeps(db: any, stripe: any): RolloverDeps {
  return {
    async listHeld(userId) {
      const { data: claims, error: claimsError } = await db
        .from("first_purchase_claims")
        .select("payment_attempt_id")
        .eq("user_id", userId)
        .eq("status", "reserved")
        .is("order_id", null)
        .not("payment_attempt_id", "is", null);
      if (claimsError) throw new Error("Could not check held first-purchase offers");
      const ids = ((claims ?? []) as any[]).map((c) => c.payment_attempt_id);
      if (!ids.length) return [];
      const { data: attempts, error: attemptsError } = await db
        .from("payment_attempts")
        .select("id, transaction_id, provider")
        .in("id", ids)
        .eq("provider", "stripe");
      if (attemptsError) throw new Error("Could not check held first-purchase offers");
      return ((attempts ?? []) as any[]).map((a) => ({ attemptId: a.id, intentId: a.transaction_id ?? null }));
    },
    async retrieve(id) {
      if (!id.startsWith("cs_test_")) return stripe.paymentIntents.retrieve(id);
      const session = await stripe.checkout.sessions.retrieve(id);
      return { status: session.status === "expired" ? "canceled" : session.status === "open" ? "requires_payment_method" : "processing" };
    },
    async cancel(id) {
      if (!id.startsWith("cs_test_")) return stripe.paymentIntents.cancel(id);
      const { expireHostedSandboxSession } = await import("@/lib/hosted-stripe-sandbox");
      return { status: await expireHostedSandboxSession(stripe, id) ? "canceled" : "processing" };
    },
    async release(attemptId) {
      const { error } = await db.rpc("release_first_offer_for_attempt", { _payment_attempt_id: attemptId });
      if (error) throw new Error("Could not release a cancelled first-purchase offer");
    },
  };
}
