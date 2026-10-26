# Roadmap

## Done — one-time referral redemption (unpublished, awaiting owner review)
- [x] Migrations 0058/0059: `referral_redemption_claims`, eligibility/claim/attach/release/ensure RPCs, settlement trigger, `finalize_checkout_order` claim copy + restored acknowledgement link
- [x] Server gate in `checkout-pricing.server.ts` (signed-in required, ID+email history, self-referral by email)
- [x] Claim/release wiring: submitOrder (PayID/Wise/crypto), Stripe, Eway, Stripe webhook
- [x] Copy: referrals page, CMS defaults, welcome email, Admin discounts
- [x] Tests: 29 TS (scripts/referral-redemption.test.ts + regressions), 23 DB lifecycle (scripts/referral-redemption-db.test.sh) — all pass
- [x] tsgo --noEmit exit 0; bun run build exit 0
- [ ] Owner review, then publish (owner action only)
