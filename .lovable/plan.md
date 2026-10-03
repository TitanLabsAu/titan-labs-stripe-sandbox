# Featured customer reviews

- Extend the existing Admin Reviews section with review date, optional product, Featured toggle, archive/restore, and featured display order; retain editing, publishing and deletion.
- Reuse the existing review cards and styling. Show up to three published, non-archived featured reviews on the homepage, with stars, name, text, optional product and date. Use “What Our Customers Say” and “View All Reviews” as defaults, preserving saved heading overrides and carousel settings.
- Add Reviews to Home page configuration so it can move up/down like other homepage blocks. Preserve all existing saved block relationships and default its location to the current bottom position.
- Keep the Reviews page for all published, non-archived reviews. Refresh customer-facing review data after Admin changes without code edits.
- Verify validation, featured filtering/order/limit, ordering compatibility, and desktop/mobile rendering; do not publish or create example reviews.

## Technical details
- Add nullable product slug, review date, featured and archived fields to `customer_reviews` through an additive migration; preserve existing rows and admin-only writes.
- Keep public published-only reads and additionally exclude archived reviews. Reuse existing server functions, CMS registry, Admin section and homepage ordering helper; no duplicate system.