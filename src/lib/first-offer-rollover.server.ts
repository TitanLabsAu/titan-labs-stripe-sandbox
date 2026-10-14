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
    let status = "canceled";
    if (h.intentId) {
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
      const { data } = await db
        .from("first_purchase_claims")
        .select("payment_attempt_id, payment_attempts!inner(transaction_id, provider)")
        .eq("user_id", userId)
        .eq("status", "reserved")
        .is("order_id", null)
        .not("payment_attempt_id", "is", null);
      return ((data ?? []) as any[])
        .filter((r) => r.payment_attempts?.provider === "stripe")
        .map((r) => ({ attemptId: r.payment_attempt_id, intentId: r.payment_attempts?.transaction_id ?? null }));
    },
    retrieve: (id) => stripe.paymentIntents.retrieve(id),
    cancel: (id) => stripe.paymentIntents.cancel(id),
    async release(attemptId) {
      await db.rpc("release_first_offer_for_attempt", { _payment_attempt_id: attemptId });
    },
  };
}
