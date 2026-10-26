# Roadmap

## Referral codes: first-successful-purchase-only (once total per buyer)
- [ ] Read finalize_stripe_order + webhook + prepareStripeOrder + messaging files
- [ ] Migration: referral_redemption_claims table + eligibility/claim/release/attach RPCs + orders.referral_claim_id + payment_attempts.referral_claim_id + settlement guard (ensure_referral_redemption, never throws on paid path)
- [ ] checkout-pricing.server.ts: referral codes require signed-in buyer, self-block by ID+email, eligibility RPC check
- [ ] Claim wiring: submitOrder (PayID/Wise/crypto), Stripe intent + webhook release paths, Eway create/verify
- [ ] finalize_stripe_order copies referral_claim_id attempt→order
- [ ] Messaging: referrals page, checkout notices, member welcome email, AdminDiscounts explanation
- [ ] Tests: TS unit (pricing gate) + DB fixture script (eligible/returning/same code/different code/guest email/self/retry/concurrency/settlement)
- [ ] Run tests + tsgo + build; report. NO publish, no real orders/emails/payments.
