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
- Stock writes use audited stock RPCs with row locks/CAS; purchases use an expenses header and expense_items with request-id/hash idempotency.
- Member welcomes originate only from the auth confirmation trigger, behind welcome_email_settings and its activation cutoff; hourly retries dedupe user/version, never backfill or accept browser recipients. allocate_welcome_referral_code reuses or atomically issues codes. Email art uses scripts/build-email-images.py JPEGs.
- Signup feedback uses a shared text-only notice and auth-result classifier; errors never show success, obfuscated existing-user responses make no new-welcome promise, and a newly returned session uses confirmed wording rather than verification instructions.
- Admin multiline text uses `MarkupTextEditor`; formatting buttons are enabled only for fields whose storefront consumer renders `RichText` (mode map in AdminEdits) — so the toolbar never offers formatting the website cannot show.
- Foundation Member awards are made only by the `orders_foundation_award` DB trigger on the paid transition (settings-row lock, fixed launch cutoff); pricing reads the award server-side and applies it before referral rewards — so no payment path or client can mint or skip it.
- Titan Club: admin-assigned via `admin_set_titan_club` (atomic audit, admin-only notes); pricing reads it server-side after Foundation, before referral rewards; personal max replaces the site cap. Stacking policy lives on `titan_club_members` stack_* columns; `quoteOrder` compares Club vs normal branch and takes the cheaper, so Club never bypasses global rules.
- Titan Club welcome uses the existing queue/template for first assignment and reactivation; activation identity scopes deduplication so stale retries cannot consume a new welcome.
- Paid-order stock settlement lives in the database: `settle_order_stock` (orders paid transitions + order_items insert triggers) deducts once per order+SKU via the `inventory_movements` sale identity index; stock problems become durable `stock_settlement_exceptions` + admin notifications, never payment failures. Refunds/cancels never auto-restock — returned goods go through `adjust_inventory` explicitly.
- Receipt displays share order-receipt's saved-only model; PDF generation is in-memory server-only, with verified member/Admin or hashed guest-cookie access. Required attachment preparation fails closed while the provider lacks attachment support, preserving retry events and payment success.
