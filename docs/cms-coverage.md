# Storefront CMS coverage matrix

Editor: Admin > Website editor > Storefront content (grouped tabs). Older tabs (Home, Catalogue, Header, Footer, Payments, Legal) still edit their existing fields.

| Area | Editable now | Where | Stays in its own admin / fixed |
|---|---|---|---|
| Site name, tagline | Yes (existing) | Home / Header tabs | — |
| Logo image | Yes | Storefront > Homepage > Branding | — |
| Homepage heading small/big text, faded background logo + visibility | Yes | Branding | — |
| Homepage section order incl. new offer banner + Testing section | Yes | Home > section order (new blocks slot in without changing saved order) | — |
| Testing Transparency homepage section (photo, alt, caption, eyebrow, headline, body, bullets, 2 buttons + links, helper, visibility) | Yes | Homepage | — |
| New-member offer banner text/links/visibility | Yes | Homepage | Discount % comes from Discounts settings ({percent}) |
| Testing Transparency badge (headline, membership, link, emblem, alt, catalogue/footer/certificates visibility) | Yes | Badges | — |
| Contact page incl. WhatsApp number/link | Yes | Pages | — |
| Certificates intro/empty state/verify button | Yes | Pages | Certificate files: Products |
| Reviews page heading/empty state | Yes | Pages | Reviews: Reviews tab (shortcut) |
| Referral page title/intro/steps | Yes | Pages | Reward amounts/limits: Discounts ({reward} etc.) |
| Calculator, Account, Calendar, Research Lab, Log in, Sign up headings + intros | Yes | Pages > Page headings | Calculator maths, auth checks fixed |
| Pen Guides page + reusable steps + product info heading | Yes | Guides | — |
| Disposable pen guide (product pages + guides page) | Yes | Guides | — |
| Cart equipment suggestion heading/text/visibility | Yes | Cart & checkout | Prices/stock: Products |
| Starter kit button labels | Yes | Cart & checkout | Kit contents/price: Products |
| Footer extra links (add/remove/reorder/hide) | Yes | Navigation | — |
| Footer background image | Yes | Branding | — |
| Footer text, notices, main nav order | Yes (existing) | Footer / Header tabs | — |
| Legal pages | Yes (existing) | Legal tab | Acknowledgement versioning fixed |
| Payment copy | Yes (existing) | Payments tab | Payment logic fixed |

| Homepage reviews carousel (visibility, eyebrow, heading, All-reviews link, autoplay, speed, Play/Pause labels) | Yes | Homepage | Never animates under reduced motion; Pause always shown when moving; reviews in Reviews tab |
| Homepage page heading as an ordered block | Yes | Home > section order | Default: offer banner, then heading (original position) |
| Checkout guest/member wording (intro, buttons, notes, guest mode, guest confirmation) | Yes | Cart & checkout | Eligibility, discounts, acknowledgement, payments fixed |
| Header extra links (label/link/order/visibility, max 6) | Yes | Navigation | Log in/Join/Account/Admin/Cart stay automatic |
| Product info heading, More-products heading, link fallback, catalogue Range/Pens/Equipment tab names | Yes | Pages | Section assignment: Products |
| Research Lab entry labels (map, quick read, headings, accordions) | Yes | Pages | Scientific text, research-use notice: Research Lab / fixed |

## Intentionally fixed
- Footer background image alt: decorative, intentionally empty.
- Research-use and legal notices: compliance wording, managed in Research Lab / Legal.

Every registry section is read by its storefront renderer (audited: each `cms:<id>` is used by at least one page component).
