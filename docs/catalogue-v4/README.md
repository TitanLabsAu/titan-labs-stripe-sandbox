# Matching Titan Labs Range labels and boxes

Follow-up correction to PR #26, based on `review/light-theme` at `9d947694a95441ab10dd74f668267e16e3513a39`. Owner requested GitHub merge and will review/publish through Lovable. No deployment is authorized.

## Changes

- All products with primary catalogue section Range use one shared label design. New Range products inherit it automatically.
- Product name and quantity come from the live product and selected variant, including mg, IU, ml and blend labels. Missing strengths stay blank; they are never guessed. Long product names wrap into two lines.
- The label uses the navy/gold helmet and brand lettering directly from the owner's approved reference. The box photograph uses the gold-only helmet, white curved molecular band, navy field and gold detailing.
- The front-facing artwork fills the vial's full physical paper label, with curved gold edges and cylindrical shading. Product name and strength are centred; the disclaimer is readable below.
- Product pages show three selectable photographic thumbnails: Full product, Label detail (close-up on the vial), Titan Labs box. All three share the laboratory background and lighting, with theme-aware shading and captions below the thumbnails. Switching size resets the gallery to the full product and refreshes its strength.
- Catalogue cards, homepage Hot Products, related products, cart and checkout thumbnails use the same Range artwork. Pens, Equipment and exact-colour CMS photo rules retain their existing rendering.
- Existing saved Range gallery photos are retained in CMS but ignored by the new coordinated set. No product records, prices, stock, orders, catalogue sections or saved photos were written.

## Visual review

These screenshots render the production artwork component in an isolated review harness, not a screenshot of the signed-in live storefront. The real ProductGallery component was separately exercised in Chromium to verify selection and variant reset.

![Light presentation](light.webp)
![Dark presentation, 30mg](dark.webp)

[Mobile and long-name review](mobile.webp) · [Desktop long-name review](long-name.webp)

## Validation

- `npx tsc --noEmit`: passed.
- Bun focused tests: 33 passed, 0 failed, covering Range data, gallery ownership, theme photo identity and variant photos.
- Chromium: three views render, 20mg → 30mg changes artwork, long-name and light/dark checks, 390px viewport without horizontal overflow, no JavaScript errors.
- Actual ProductGallery component: label and box selections activate the corresponding button; selecting 30mg resets to the full product with 30mg in its accessible label.
- `npm run build`: passed with the repository's existing `bun.lock` dependencies. Existing framework deprecation/chunk-size warnings remain.
- `git diff --check`: passed.

## Asset and rollout notes

The three shared WebP assets total approximately 516 KB, plus the shared laboratory background. Vial and box photographs were generated with the built-in image tool; SVG overlays supply accurate product text rather than regenerating every SKU. Prompt intent: isolated clear research vial with blank label and navy cap; isolated approved navy/white/gold carton on transparent background; empty softly blurred navy/gold laboratory and polished stone bench background plate. Reference source: `Gold-Only Helmet Emblems on Navy Boxes(1).png` provided by the owner. The approved master supplies the actual label helmet and wordmark via SVG crops. The box remains a generated photographic interpretation for visual approval, not manufacturing artwork or an exact vector logo master.

Merge into `review/light-theme` as authorized by the owner. The owner controls Lovable review and publishing. No website deployment is included.
