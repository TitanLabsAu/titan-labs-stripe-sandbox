# Titan Club final validation

- [x] CartSheet auth-scoped member quote (userId + items key, no stale placeholder, cleared on auth change, estimate/checking labels)
- [x] FreeShippingMeter uses quote.remainingForFreeShippingCents (matches checkout eligibility)
- [x] Regression tests (scripts/cart-member-quote.test.ts, 8 tests)
- [x] TitanClubView wording: extra checkout savings capped, kit prices retained
- [x] Dummy previews: cart, TitanClubView 25%/30% profile badge, Admin assignment (desktop/mobile, light/dark)
- [x] Fixture removed; 237 tests + typecheck + production build pass
- [x] SQL unapplied, no real grants, no publish

- [x] Titan Club stacking: Foundation is an editable per-member switch (default OFF for new), staged SQL/RPC/audit, tests, screenshots
