# Titan Club final validation

## Research Lab Protocol Stacks — separate draft only
- [x] Replace expanded summary grid with compact 4/2/1-column reference layout and blank Timeline/Level/Dose/Timing; saved full summaries are collapsed accessible expanders. 20 tests/29 assertions pass; six keyboard goal switches, Back/footer, verbatim detail match and desktop/mobile light/dark verified without overflow. Existing shared header hydration warning recurred on final reload; navigation still passes. Automatic build OK 21 Oct 02:59:19 UTC; revised standalone previews/report supplied. No live writes or publication.
- [x] Enriched six category introductions and published cards with complete saved overviews/fallbacks. 16 focused tests/25 assertions pass; all six keyboard switches, deep links/Back, saved BPC-157 text match and desktop/mobile light/dark checked with no overflow or browser errors. Draft preview returns HTTP 200; automatic build OK 23:36:37 UTC. New Weight Loss/Recovery desktop-dark/mobile-light PNGs delivered.
- [x] Remove compound card/header evidence badges and evidence-map tile; unframe the detail evidence banner while preserving its exact explanatory text. Evidence/Admin fields and references unchanged.
- [x] Add six exact names-only goal groupings at /research/protocol-stacks?goal=..., shell/footer navigation and published-only exact slug/alias links.
- [x] 13 focused grouping/privacy tests pass; browser verified six keyboard goal switches, deep link, back/footer navigation, 44 public cards and fully rendered BPC-157 detail with zero status badges, seven Weight Loss published destinations, signed-out preview redirect to /auth, desktop/mobile light/dark without horizontal overflow; four PNG previews supplied. Automatic checks/build OK at 23:26:34 UTC.
- [x] Owner continuation: root now awaits public header/footer CMS queries and transfers the same cache snapshot before hydration. 53 focused tests pass; four clean desktop/mobile theme runs verified saved header/footer text, reloads, six keyboard goals, saved overview/detail match, Back/footer/header navigation and no overflow/errors. Automatic build OK 21 Oct 04:22:04 UTC. Standalone screenshots/report supplied; no content/commerce/live writes or publication.
- No receipt/checkout/commerce edits, database/settings/data writes, emails, real orders, publication or draft acceptance authorized.

## Receipt / branded email / first-offer (owner approved 21 Oct) — READY FOR NATIVE PUBLISH by owner
- [x] PDF heading uses TITAN LABS // AUS website treatment on every page/status; normal paid stays one page.
- [x] Branded saved receipts wired into automatic confirmation, payment-confirmed worker, Admin resend and Admin copies; attachment flag stays absent/OFF, so delivery cannot be blocked by it.
- [ ] Real PDF attachments: still unsupported by the email provider; download link only, never described as attached.
- [x] Audit correction: server attachment flag defaults OFF preserving legacy confirmation/payment/Admin emails; ON unsupported retries without sending. Actual handler tests cover owner/Admin/cross-member and hashed wrong/expired guest cookies; response allowlisted.
- [x] Visual correction: quote-backed three-item paid PDF fits one A4 page; true long-order repeated headers retained. Corrected PDF/email/Admin previews inspected.
- [x] Both fictional fixtures use quoteOrder with explicit settings: paid $600 less $80 Stack = $520/free shipping; known $50 kit savings count toward 20% cap on $650 base. Pending $150 less $15 first offer + $10 shipping = $145 below $200.
- [x] Shared saved-order purchase breakdown for Admin/customer/PDF/email; member/Admin and existing guest-capability PDF downloads.
- [x] Branded confirmation/payment content remains preview-only; unchanged noreply sender and legacy sending when flag OFF. Provider choice/enablement pending.
- [ ] Real automatic PDF email attachment: blocked by managed email API/installed email-js attachment support; not a link substitution. Do not publish this email draft until resolved.
- [x] Mock-only first-offer investigation: held payable claim explains lost eligibility; stale quote placeholder and ignored cancellation fixed in frontend, guards unchanged.
- [x] Fictional Alex PDFs and rendered desktop/mobile email/Admin screenshots; 68 focused tests plus actual receipt handler and confirmation/checkpoint worker suites pass; automatic preview build/typecheck OK.
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
