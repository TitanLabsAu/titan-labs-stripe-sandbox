# Titan Club final validation

- [x] Stage rejoining welcome trigger and activation-specific retry protection; preserve email design and current-perk reads.
- [x] Test revoke/re-add, updated perks, no duplicate edit sends, rollback and access controls locally (23 email tests and 46 disposable database checks).
- [x] Publish event-aware sender, then apply rejoining email update (approved by owner).
- [ ] Send the Club welcome to all five current members — queued; goes out on the next hourly email run.

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
- [x] Stock-settlement v2 audit blockers fixed and applied live as migration 0056 (canonical product+variant grouping, marker-first replay, deferred triggers, INSERT guard, PUBLIC revoked, structured retry); 49 disposable-DB tests + 37 repo tests + typecheck + build all green; #1080 verified not re-deducted. Awaiting owner publish.
