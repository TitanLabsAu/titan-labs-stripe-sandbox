# Roadmap

- [x] Finish Pen Guide paired banner, scoped light contrast and equal-height FAQ rows; verify both themes/zoom. Eight cards measured 250–250px desktop, 274–274px mobile, 298–298px tablet; long-content and 200% zoom checks had no clipping/overflow. Light headings/body/checklist minimum sampled contrast 9.18:1.
- [ ] Prepare account paired artwork and light text; retrieve and verify assets from exact review/light-theme SHA bd5af33db0450595405bb072b343167be33df92e without overwriting working edits, then validate both sizes.
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
