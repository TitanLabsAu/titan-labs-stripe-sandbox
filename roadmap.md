# Roadmap

- [x] Finish Pen Guide paired banner, scoped light contrast and equal-height FAQ rows; verify both themes/zoom. Eight cards measured 250–250px desktop, 274–274px mobile, 298–298px tablet; long-content and 200% zoom checks had no clipping/overflow. Light headings/body/checklist minimum sampled contrast 9.18:1.
- [x] Install the two exact attached account photos at the requested public paths and verify serving/decoding; SHA-256 matches both uploads, both return HTTP 200 image/webp and decode. All restored theme files preserved; no GitHub pulls.
- [x] Guard carousel playback using the current attached plugin and live snap count. 100 existing Bun tests pass; automatic build OK. Both themes verified at desktop/mobile/tablet, zero browser runtime errors. FAQs measure 250–250px desktop, 274–274px mobile, 298–298px tablet; long CMS and 200% zoom have no clipping/overflow. Light contrast minimum 4.98:1 including CTA, icons 13.52:1. Actual TitanMemberCard rendered in a temporary browser-only fixture, both themes desktop/mobile; no app test route/auth bypass, DB writes or publishing. Screenshots supplied.
- [ ] Separate type-check result remains unavailable: the sandbox exposes automatic build OK but no separate type-check report, and manual project type-checks are prohibited by the harness instructions.
- [x] Run Bun regressions and browser checks; inspect automatic build/typecheck signals; do not publish. 98 tests passed; latest automatic build OK; zero browser runtime errors. Sticky header, first-visit light and 44px icon toggle verified. Fresh separate typecheck/production-build signal unavailable; hosted diagnostics refer to older 5f60217, not current edits.

- [x] Enable promotions drag/swipe with hover pause and arrow navigation.
- [x] Keep New Product blue with gold lettering.
- [x] Verify changes and request publishing (deployment scheduled).

- [x] Remove referral-program milestones site-wide (keep every-5-referrals = 10% reward; keep member purchase milestones untouched)
  - referrals page fine print
  - Admin discounts settings field
  - Admin member rewards display
  - order-pricing settings + referrals.functions
  - DB: clear milestone_thresholds, drop milestone block from orders_referral_settlement

- [x] Promotions: remove arrows, edge-hover scroll
- [x] Restore welcome headline "Your next discovery starts here."

- [x] Verify external light artwork, CMS precedence, all 35 products, theme persistence, cart, reviews and viewport resizing; preserve dark dimensions, with no publish/merge or database writes.
  - All 90 Bun tests and seven isolated image-precedence checks passed; 35/35 catalogue photos loaded, 44px toggle, no browser runtime errors/overflow at checked widths. Fresh standalone production build/type-check and remote branch-tip confirmation were not available; automatic build signal was OK. Existing Range cards measured 598–600.5px, photos 240px; geometry unchanged.
