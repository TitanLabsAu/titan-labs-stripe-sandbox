# Roadmap

- [x] Replace fixed “The Range” product-listing references with the editable Catalogue name.
- [x] Draft and populate a short full description and three key points for every active product.
- [x] Verify catalogue naming and product copy in the live site.
- [x] Replace all active-product descriptions and key points with concise, product-specific informative copy.
- [x] Checkout payment method selection (PayID / USDC) with details shown on selection.

- [x] Submit order records the order (no on-site payment) and shows an Order Received screen.
- [x] Admin Edits: editable PayID and crypto wallet details.
- [x] Admin order cards show chosen payment method and reference.

- [x] Titan Stack discounts, shipping method choice, crypto QR + AUD conversion, cart redesign, payment badge row (PayID/Crypto/Wise/AusPost)
- [x] Redeploy preview so the Stripe webhook signing secret is bound to the deployed server runtime.
- [x] Legal pages (/terms, /privacy) editable in Admin, footer links
- [x] Checkout research-use acknowledgement, recorded per order, shown in Admin
- [x] Titan's Research Lab: admin editor + public /research pages
- [x] Calculator upgrade (neutral maths, U-100 scale visualiser)
- [x] Add real Research Lab entries (owner content)
- [x] Add separate member-facing Research Lab summaries, evidence-first pages, and protected draft previews.
- [ ] Owner to review legal wording
- [x] Add a mobile floating cart shortcut and show numeric-only catalogue quantities.
- [x] Add the shared cart Equipment/BAC Water upsell and URL-addressable Equipment catalogue navigation.

## Referral / rewards program (in progress)
- [ ] DB: settings, code kinds, ledger, reservations, settlement triggers
- [ ] Admin: codes (kind/member/limits, default discount 0), settings, member credit panel
- [ ] /referrals page + footer link; member account rewards card
- [ ] Checkout: code + credit, server quote, all payment paths reprice, 20% cap
- [ ] Tests + typecheck/build + preview checks (no publish)
- [x] Move Referral Program footer link under Navigate
- [x] Verify kit savings count toward 20% combined cap
- [x] Rolled-back DB tests: concurrency, idempotency, refund, release; RPC privilege review
- [ ] Rename referral migration to 0019 (journal tag only, no reapply)
- [ ] DB-aggregated credit summaries (no LIMIT-based balances)
- [ ] Fix credit unit at AUD10 (no admin edit, DB enforced)
- [ ] Settlement uses order snapshot reward units
- [ ] Zero-value referral keeps attribution when multi-buy wins
- [ ] Reservations: no TTL consumption after release/respend; no negative balance
- [ ] Tests for all above + concurrency
