# Missing catalogue photo pairs — October 28, 2026

Twelve exact-source pairs now cover the previously missing artwork:

| Product | Coverage | Original retained for |
| --- | --- | --- |
| 5-Amino-1MQ | One vial photo | Dark mode |
| Titan V2 Reusable Pen | Blue, Grey, Purple | Light mode |
| Travel Case with Ice Pack | Blue, Purple | Light mode |
| Older V2 Reusable Pen and hard-case listing | Blue, Grey, Purple | Light mode |
| Alcohol Prep Pads | Current five-sachet artwork | Light mode |
| Range Starter Kit | Current no-BAC-water photo with helmet wipe design | Light mode |
| Pen Reconstitution Kit | Existing photo, including its original contents | Light mode |

The reconstitution kit was not present among the active catalogue cards during the latest check. Its known source is paired without changing product visibility or availability.

`src/lib/product-theme-pairs.json` records the exact slug, current original URL, dark URL and light URL. Pairs never fall back by product name or colour alone. New Admin uploads opt out of the old pairing. Saved Admin light-photo overrides retain precedence. The existing source files and database image URLs are unchanged; the original photos remain available in their existing mode.

ThemedProductImage applies the same pair to catalogue cards, product pages, colour selectors and automatic V2 thumbnails. ThemedContentImage also recognizes exact source URLs used elsewhere. Responsive 480px and 1024px WebPs are in `public/images/product-theme/`. Idle colour preloading now warms both modes of known variant photos. V2-only thumbnail eligibility and the removal of Range gallery artwork remain unchanged.

## Artwork preparation

Built-in image generation was used to edit the supplied product photographs and read-only captures of the current public original photos. Prompt set: lighting-weather edits only; preserve the exact product, colour, placement, labels and contents; create deep charcoal/navy scenes with Titan-blue edge lighting and restrained gold reflections, or white marble/ice-blue daylight for the 5-Amino light version. No boxes or extra products were requested. A follow-up corrected the three older blue pen pin labels to `32G` and `0.23×4mm`. Full generated PNGs were reviewed before technical WebP resizing/compression. The Range Starter Kit retains the no-BAC-water composition and current helmet wipe design. The older pen listing retains its existing hard case and accessories.

## Verification

- Every generated asset and 480px rendition checked as nonempty WebP.
- All twelve pairs loaded successfully in both modes in a local browser preview using the real image components and current public source URLs.
- All eighteen combinations of the three Titan V2 colours and full/dial/logo views passed loaded-image and visible-mode checks.
- 586 tests across 67 isolated files passed, including source identity, wrong-product/colour protection, replacement-upload safety, saved CMS precedence and server-rendered dark/light markup.
- TypeScript and production build passed. Browser QA used local fixture data; no production CMS, catalogue, stock, price or order writes, and no publication.

This verifies the twelve formerly missing pairs. It does not assert that every historical or future custom upload elsewhere on the site has been visually audited. Later custom uploads require their own matching pair in Admin > Products.
