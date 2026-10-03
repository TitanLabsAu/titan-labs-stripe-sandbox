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


- Member Calendar entries live in `member_calendar_entries`, with owner-only RLS, local date recurrence and no supplied dosing protocols.
- Starter kits are normal Equipment products (`range-starter-kit`, `pen-starter-kit`); `products.starter_kit_enabled` controls each Range/Pens offer. Never attach a client-only surcharge or duplicate pen inventory for kit options.
- Only Range supports 10x kits. Pens and Equipment are single items across cart restore, Admin and all server pricing paths.

- Guest checkout ownership comes only from the hashed guest-session cookie or a verified member bearer, resolved server side in `checkout-buyer.server.ts` — posted IDs/emails are never trusted.
- First-purchase offer claims stay held while a Stripe intent is payable and are released only after cancellation is confirmed — prevents a late payment using a released offer.
- Testing Transparency uses a reusable homepage photo section and separate catalogue/footer banners; keep it attached to pillars without altering saved homepage order, and never imply certificate results before files are supplied.
