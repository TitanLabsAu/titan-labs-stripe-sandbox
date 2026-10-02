# Cart Equipment Upsell

## Scope
- Update the shared cart panel used by both the header and mobile floating cart.
- Show the upsell only when the cart contains items.
- Keep checkout, pricing, payment, shipping, email, order, product, and review data unchanged.

## Cart experience
- Add a Titan-styled “Need any Equipment?” panel above the existing stack and trust sections.
- Add “Yes, browse Equipment” and “No, continue to checkout” actions; each closes the cart and navigates to the intended page.
- Show BAC Water 3ml and 10ml rows from the live catalogue record, including its live image, variant labels, and prices.
- Add the exact single-pack variant to the existing cart without closing it, immediately reflecting quantities and totals.
- Show added quantity/state and prevent additions for coming-soon, sold-out, or stock-limit variants. With current zero inventory, both rows display “Out of stock.”
- Hide BAC Water rows if that product is unavailable, hidden, inactive, or missing while leaving both navigation choices usable.

## Catalogue navigation
- Add validated `section` URL search state to `/range`.
- Selecting a section updates browser history; back/forward restores the section.
- `/range?section=equipment` selects Equipment when populated, while preserving current nonempty-tab ordering, fallbacks, category validity, and search behavior.

## Verification
- Add focused tests covering the two BAC Water variants, forced single-pack additions, current cart quantity, stock limits, and Equipment URL/fallback selection.
- Run the focused tests and TypeScript checks, then inspect desktop and mobile cart/catalogue flows using disposable local cart state only.
- Confirm no order, payment, email, product, or review records were created or changed.

## Technical details
- Reuse `CartSheet`, `useProducts`, `useCart`, and the centralized Equipment single-item rule.
- Extract small pure stock/section-selection helpers where needed so behavior is testable without changing commerce rules.
- Use typed TanStack Router navigation and validated search parameters rather than raw links or manual URL parsing.
