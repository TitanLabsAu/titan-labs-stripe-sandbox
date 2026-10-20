# Titan Club final validation

## Draft receipt / email / first-offer review (20 October)
- [ ] Audit correction: default-OFF server attachment flag preserves legacy emails; actual handler/mock-auth access tests and updated owner report.
- [ ] Visual correction: realistic quote-backed paid fixture, one-page normal receipt, regenerate PDFs/email/Admin desktop/mobile PNGs individually and ZIP.
- [ ] Both paid/pending fictional fixtures use quoteOrder with explicit settings and $200 free-shipping rule; all receipt/email totals match snapshots.
- [x] Shared saved-order purchase breakdown for Admin/customer/PDF/email; member/Admin and existing guest-capability PDF downloads.
- [x] Branded confirmation/payment email drafts, unchanged noreply sender; attachment limitation disclosed, required sends fail closed and remain retryable.
- [ ] Real automatic PDF email attachment: blocked by managed email API/installed email-js attachment support; not a link substitution. Do not publish this email draft until resolved.
- [x] Mock-only first-offer investigation: held payable claim explains lost eligibility; stale quote placeholder and ignored cancellation fixed in frontend, guards unchanged.
- [x] Fictional Alex PDFs and rendered desktop/mobile email/Admin screenshots; 67 focused tests plus confirmation/checkpoint worker suites pass; preview build/typecheck OK.
- [ ] Owner review and supported attachment decision required; no live migrations/settings/data/claims/orders/emails or native publication performed.

- [x] Stage rejoining welcome trigger and activation-specific retry protection; preserve email design and current-perk reads.
- [x] Test revoke/re-add, updated perks, no duplicate edit sends, rollback and access controls locally (23 email tests and 46 disposable database checks).
- [x] Publish event-aware sender, then apply rejoining email update (approved by owner).
- [x] Club welcome to all five members: queue "sent" 15 Oct 23:17 UTC and accepted by the email service (no bounces seen); inbox delivery not reported by provider.
- [x] Foundation capacity 50 -> 25 live (migration 0057), wording/defaults updated, 16 disposable-DB limit tests pass; 8 existing awards untouched.
- [x] Previous stock0056 and Foundation25 published by owner (owner confirmation); preserve.

- [x] CartSheet auth-scoped member quote (userId + items key, no stale placeholder, cleared on auth change, estimate/checking labels)
- [x] FreeShippingMeter uses quote.remainingForFreeShippingCents (matches checkout eligibility)
- [x] Regression tests (scripts/cart-member-quote.test.ts, 8 tests)
- [x] TitanClubView wording: extra checkout savings capped, kit prices retained
- [x] Dummy previews: cart, TitanClubView 25%/30% profile badge, Admin assignment (desktop/mobile, light/dark)
- [x] Fixture removed; 237 tests + typecheck + production build pass
- [x] SQL unapplied, no real grants, no publish

- [x] Titan Club stacking: Foundation is an editable per-member switch (default OFF for new), staged SQL/RPC/audit, tests, screenshots
- [x] Audit fixes: policy CHECK, Foundation notice needs !st.foundation, snapshot keeps assigned max

- [x] Titan Club congrats: best-effort prompt send after a successful first Admin assignment (hourly retry stays as backup)

- [x] Titan Club congrats email: branded design reviewed, queue installed as migration 0052 (0 rows, no backfill), 298 tests + throwaway DB checks + typecheck + build pass, published to titanlabsaus.com
- [x] Paid-order stock settlement (migration 0054/0055, live) + #1080 MT-1 reconciliation (9→7, sale ledger marker)
- [x] Stock-settlement v2 audit blockers fixed and applied live as migration 0056 (canonical product+variant grouping, marker-first replay, deferred triggers, INSERT guard, PUBLIC revoked, structured retry); 49 disposable-DB tests + 37 repo tests + typecheck + build all green; #1080 verified not re-deducted. Published by owner; preserve.
