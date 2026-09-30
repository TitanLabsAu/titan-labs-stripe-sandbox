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
