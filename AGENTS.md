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
- Hot Products alone opts into ProductCard layout hooks with natural content and flex footer alignment (mobile heading price); no track-wide row equalization, so absent or collapsed offers cannot retain oversized space. Other catalogue cards keep their original layout.
- Promotion banners use one validated site-content document for reusable custom options and exact slug/variant assignments; soft retirement falls back to original status without product/price writes, and shared ribbons consume only validated colour tokens.
- Companion pens and offer-added kits are owned by product slug plus stable selected variant ID; switching views retains explicit variant-owned cart choices, while ambiguous legacy product-only sources detach to ordinary lines without losing quantities.
- Theme: light default, per-device choice in `src/lib/site-theme.ts`; themed art uses CSS-switched pairs (`ThemedArt`/`ThemedProductImage`, `src/lib/theme-art.ts`) so first paint never depends on hydration; CMS exact-slug art beats bundled defaults.
- Checkout acknowledgements live in `order_acknowledgements`, linked via `link_order_acknowledgement` — Stripe finalisation untouched.
- Guest checkout ownership comes only from the hashed guest cookie or verified bearer (`checkout-buyer.server.ts`); posted IDs/emails are never trusted.
- Referral redemption uses code-scoped account/email locks and a durable buyer+code redemption identity; all providers share the gate and nonfatal paid-order settlement to prevent duplicate rewards without losing captured payments.
- First-purchase offer claims stay held while a Stripe intent is payable; released only after confirmed cancellation.
- Research Lab: `research_entries` (admin RLS CRUD, public published-only via server fn, `at_a_glance` summaries); `/research-preview` shows drafts to admins only.
- Research UI: preserve science/held quotes, immutable editorial data, exact unique published mapping and whole-card exclusions; never infer modes. Dosing/Timing/Cycle use only exact saved entry headings. Scoped opinion classes isolate stacked scorecard dl rows from shared grids.
- Mobile cart reuses `CartSheet`: homepage has an in-flow trigger below Hot Products instead of the root floating trigger, so order controls are never covered; other pages retain their existing placement.
- Catalogue sections use `products.catalogue_section`, separate from scientific `categories`.
- Reviews: `customer_reviews`, admin-only writes; anonymous submissions only via throttled `submitCustomerReview` (unpublished, unrated); homepage featured block capped at three.
- Member photo submissions use authenticated server validation and atomic owned-upload linkage; private review-photo storage is served publicly only through a non-cached endpoint that rechecks review moderation, so unpublishing revokes public access.
- Referral default rollouts use a durable one-time ledger and separate data operation; the welcome allocator reuses existing codes, while shared Admin editing keeps the same code ID and exact unchanged expiry to preserve custom settings and redemption identity.
- AI product photos via admin-checked `/api/admin-generate-image`, stored only after "Use image".
- Pack rules via `allowsKit`/`effectivePack` (`src/lib/products.ts`) in UI, cart restore and every server price path: only Range has 10x kits. Starter kits are normal Equipment products toggled by `products.starter_kit_enabled`; no client-only surcharges.
- Member Calendar: `member_calendar_entries`, owner-only RLS, no supplied dosing protocols.
- Testing Transparency stays attached to pillars without altering saved homepage order; never imply certificate results before files exist.
- CMS: `cms:<section>` uses storefrontContent overrides and adminSaveStorefrontSection conflict/CAS saves; homepage order uses pageSectionOrder/insertAfter. Root awaits public chrome queries and transfers only site-content/site-links plus the public active catalogue (`catalog-products`, primed by /, /range, /pens loaders) per request for first-render parity; member/commerce caches remain untouched.
- Stock writes use audited stock RPCs with row locks/CAS; purchases use an expenses header and expense_items with request-id/hash idempotency.
- Member welcomes originate only from the auth confirmation trigger, behind welcome_email_settings and its activation cutoff; hourly retries dedupe user/version, never backfill or accept browser recipients. allocate_welcome_referral_code reuses or atomically issues codes. Email art uses scripts/build-email-images.py JPEGs.
- Signup feedback uses a shared text-only notice and auth-result classifier; errors never show success, obfuscated existing-user responses make no new-welcome promise, and a newly returned session uses confirmed wording rather than verification instructions.
- Admin multiline text uses `MarkupTextEditor`; formatting buttons are enabled only for fields whose storefront consumer renders `RichText` (mode map in AdminEdits) — so the toolbar never offers formatting the website cannot show.
- Foundation Member awards are made only by the `orders_foundation_award` DB trigger on the paid transition (settings-row lock, fixed launch cutoff); pricing reads the award server-side and applies it before referral rewards — so no payment path or client can mint or skip it.
- Titan Club: admin-assigned via `admin_set_titan_club` (atomic audit, admin-only notes); pricing reads it server-side after Foundation, before referral rewards; personal max replaces the site cap. Stacking policy lives on `titan_club_members` stack_* columns; `quoteOrder` compares Club vs normal branch and takes the cheaper, so Club never bypasses global rules.
- Titan Club welcome reuses queue/template; activation-scoped deduplication protects first/rejoin welcomes from stale retries.
- Paid-order stock settlement is DB-only: `settle_order_stock` (paid transitions + order_items triggers) deducts once per order+SKU via the `inventory_movements` sale identity; problems become `stock_settlement_exceptions`, never payment failures. No auto-restock; returns use `adjust_inventory`.
- Receipts share a saved-only model and in-memory server PDFs with owner/Admin or hashed guest-cookie access. Server-only TITAN_RECEIPT_ATTACHMENTS_ENABLED defaults OFF, preserving legacy emails; ON fails closed without supported attachments. Branded email drafts render only with explicit receipt preview data.
- Bank instruction values use shared PaymentDetails CopyLine controls across checkout and confirmation; clipboard copies remain strings and AUD amounts use fixed decimals so bank formatting and leading zeros survive.
- Pen Guide text lives in CMS defaults; saved overrides always win, so review changes never need live content writes.
- Guide photo replacements use immutable asset pointers in CMS defaults; saved overrides stay authoritative, so historical snapshots are untouched.
- Product subtitle is `products.sub_description` (display-only, empty renders nothing); cart/order line labels keep using `singleLabelFor` so editing copy never changes saved order lines.
- Optional equipment add-ons: `products.optional_equipment` (NULL = starter-kit default incl. pen-case kit switch, `whenPen` = pen-only) via `src/lib/optional-equipment.ts`; V2 pen cases: validated `pen_case_options` site content (`src/lib/pen-cases.ts`) mapped to real products. Server-validated saves; unpriced/unmapped never purchasable, priced only as ordinary lines.
