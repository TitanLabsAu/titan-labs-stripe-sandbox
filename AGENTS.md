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

- Checkout acknowledgements live in `order_acknowledgements`, recorded before payment and linked via `link_order_acknowledgement` RPC — keeps Stripe finalisation untouched.
- Research Lab content lives in `research_entries` (admin CRUD via RLS, public reads published-only through a server fn) — independent from products.
- Research Lab member summaries live in `research_entries.at_a_glance`; protected `/research-preview` routes show drafts to admins without weakening public published-only reads.
- The mobile floating cart reuses `CartSheet` from the root layout so cart behavior remains centralized.
- Storefront sections live in `products.catalogue_section` (range/pens/equipment, DB check, default range) — kept separate from scientific `categories`.
- Customer reviews live in `customer_reviews` (public reads published-only via RLS + server fn; admin-only writes) — never seeded or invented.
- AI product photos go through the admin-checked `/api/admin-generate-image` route and are only stored in `product-images` after the admin chooses "Use image".
- Equipment is single-item only via `allowsKit`/`effectivePack` in `src/lib/products.ts`, applied in UI, cart restore and every server price path — one rule so tampered kit requests cannot be charged.
