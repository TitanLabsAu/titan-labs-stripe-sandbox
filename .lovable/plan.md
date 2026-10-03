# Equipment Packs & Bundles

## What you'll get
1. **Pack options (like your picture)** – on any Equipment product you can add named options such as "10 x 5mm 31g Pen Needles — $5". Customers pick from a dropdown, choose a quantity, and add to cart.
2. **Build-your-own bundles** – on any pack option you can tick "This is a bundle", then pick which of your products go inside it, set a quantity for each, and set one bundle price. The product page and cart show "Includes: 2 x Syringe Top-Up Kit, 1 x BAC Water 10ml…".
3. **Unlimited stock** – packs and bundles are always buyable (no stock-take), but every sale is still recorded with its real price and quantity, so sales/profit reports stay correct.

## Admin
- In the Equipment product editor, each size/option row gets:
  - Name and price (already exists)
  - A "Bundle contents" area: choose product → choose its option → quantity, add/remove rows
- Turning on a bundle automatically uses unlimited stock for that product.

## Storefront
- Equipment products with 4+ options show a dropdown (like your picture) instead of buttons; fewer show buttons as now.
- Quantity stepper next to the price, then "Add to Cart".
- Bundle contents listed under the selected option, and in the cart line.

## What stays the same
- Checkout, payments, discounts, rewards, shipping and emails work unchanged — a pack or bundle is charged as one item at the price you set.
- Range and Pens keep tracked stock; Equipment stays single-item (no 10x kits).
- No existing products are changed until you edit them.

## Technical details
- Store bundle contents inside each variant in `products.product_variants` (`contents: [{slug, variantId, quantity}]`) — no new table, no migration; pricing paths already price by variant ID server-side, so totals cannot be tampered with.
- `toProduct` parses and sanitizes `contents`; Admin save validates referenced products exist and quantities are 1–99.
- Bundled components are display-only and do not decrement component stock (matches "unlimited").
- Order line `variant_label` gets the pack name plus a compact contents summary so order history/emails show what was in it.
- Tests: bundle parsing, server price uses stored variant price, Equipment single-item rule still holds.
