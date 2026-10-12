<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Homepage promotions: Embla auto-scroll + drag; playback resolves the live plugin and checks current snaps (safe after Fast Refresh/resize).
- Theme: light first-visit default, per-device choice in one `useSyncExternalStore` store (`src/lib/site-theme.ts`); themed art renders as CSS-switched dark/light pairs (`ThemedArt`/`ThemedProductImage`, sets in `src/lib/theme-art.ts`) so first paint never depends on hydration. CMS exact-slug art beats bundled defaults; Pen Guide passes its own light-banner fallback and uses equal implicit grid rows.
- Checkout acknowledgements live in `order_acknowledgements`, linked via `link_order_acknowledgement` — Stripe finalisation untouched.
- Guest checkout ownership comes only from the hashed guest cookie or verified bearer (`checkout-buyer.server.ts`); posted IDs/emails are never trusted.
- First-purchase offer claims stay held while a Stripe intent is payable; released only after confirmed cancellation.
- Research Lab: `research_entries` (admin RLS CRUD, public published-only via server fn, `at_a_glance` summaries); `/research-preview` shows drafts to admins only.
- Mobile floating cart reuses root-layout `CartSheet`.
- Catalogue sections use `products.catalogue_section`, separate from scientific `categories`.
- Reviews: `customer_reviews`, admin-only writes; anonymous submissions only via throttled `submitCustomerReview` (unpublished, unrated); homepage featured block capped at three.
- AI product photos via admin-checked `/api/admin-generate-image`, stored only after "Use image".
- Pack rules via `allowsKit`/`effectivePack` (`src/lib/products.ts`) in UI, cart restore and every server price path: only Range has 10x kits. Starter kits are normal Equipment products toggled by `products.starter_kit_enabled`; no client-only surcharges.
- Member Calendar: `member_calendar_entries`, owner-only RLS, no supplied dosing protocols.
- Testing Transparency stays attached to pillars without altering saved homepage order; never imply certificate results before files exist.
- CMS: `site_content` `cms:<section>` overrides defined in `src/lib/storefrontContent.ts`, saved via `adminSaveStorefrontSection` (per-field conflict check + compare-and-set). Homepage blocks ordered by `pageSectionOrder`; new blocks declare `insertAfter`.
- Stock changes only via `adjust_inventory`/`record_restock_expense`/`record_stock_purchase` (row locks, compare-and-set, immutable `inventory_movements`; purchases = one `expenses` header + `expense_items`, request-id+hash idempotent).
- Member welcome emails queue only from the `auth.users` confirmation trigger into `member_welcome_email_queue`, gated by admin-only `welcome_email_settings` (OFF by default; enabling moves the cutoff) and sent by the existing hourly order-email job — no backlog, no client-supplied recipient, one send per user+version.
