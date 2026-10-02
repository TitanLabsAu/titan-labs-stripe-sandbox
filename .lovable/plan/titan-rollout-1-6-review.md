# Titan rollout #1–#6

Integrate only into `research-lab-v2`; preserve `main` and pushed history.

The prepared branch was based on `main` at 902f34b and diverged from the current integration branch by 330 commits. The reviewed integration retains the current checkout, rewards, email, reviews, Equipment and published Research Lab architecture.

## Result

1. Research Lab: published `research_entries` only; expandable findings/references and conservative matching product links. `/research-lab` redirects to the existing `/research` route. No copied dosing/therapeutic protocols and no publication-state changes.
2. Member Calendar: owner-only RLS; monthly view, selected-day entries, recurring schedules, create/edit/delete, local date handling, calculator handoff and signed-in navigation. No titration library or supplied schedules.
3. Titan V2 and disposable pen equipment references; use the exact supplied manufacturer instructions for device-specific operation. Footer Pen Guides link.
4. Explicit Product Info links retain existing product pages and styling.
5. Range Starter Kit: AUD30, 1×3ml BAC Water, 10×insulin syringes, 10×alcohol prep pads, **1×sharps container added by the user on October 2**. Price unchanged. Global price/contents/stock/visibility edited as an Equipment product; per-product offer toggle in Admin.
6. Pens: GHK-CU50mg, KPV10mg, Tesamorelin5mg AUD105 each, Tirzepatide10mg AUD125. Pen Starter Kit AUD30 (user selected this over the prepared branch’s AUD20), 20×pen pins, 20×alcohol prep pads, 1×sharps container. Separate cart lines and inventories. All product fields and image upload/generation remain Admin-editable.

## Validation before integration

- Production build and TypeScript check passed locally.
- 39 automated tests passed: existing referral/pricing, Equipment/cart/empty-section regressions, calendar date/recurrence cases, correct starter-kit selection, availability controls, server-authoritative pricing, duplicate-line stock validation, tampered pen kit and invalid variant requests.
- Isolated PGlite/PostgreSQL migration test passed: owner CRUD, foreign owner insert/update rejection, cross-member select/update/delete protection, anonymous denial, date/recurrence constraints, seed prices/sections, preserved existing BAC Water price/stock.
- Frozen Bun lockfile installation passed in a fresh directory.
- Added a PR/push workflow running tests, build and TypeScript on rollout updates.

## Deployment checks

- Apply Drizzle migration `0022_titan_rollout_calendar_and_starter_kits` through the existing Lovable migration workflow; do not add a parallel untracked Supabase migration or reapply historical migrations.
- New pens/kits start at **zero stock** because quantities have not been supplied. Set actual quantities in Admin before selling. Existing BAC Water stocks are untouched.
- Product photos are illustrations; Admin can replace them with actual hardware photos. White slim pen and blue end reference, black Titan branding on laser-silver label, tall yellow/white-cap sharps container reference.
- Run desktop/mobile preview and authenticated Calendar/Admin smoke checks before publishing. No live payments, orders, credits or emails are part of this review.
- Stock validation checks requested quantities against current stock; this does not add transactional stock reservations or prove concurrent inventory settlement.
