# Pens and Equipment theme imagery

The 20 active Pens/Equipment products now share the approved navy/gold laboratory scene in dark mode and the matching bright laboratory/marble scene in light mode. Product colour remains visible in both themes. Transparent cutouts derive from the existing source photographs; product designs were not intentionally changed.

## Coverage

- V2 reusable pen and case: Blue, Purple, Grey, with full/dial/logo gallery views.
- Standalone V2 reusable pen: Blue, Purple, Grey, with full/dial/logo gallery views.
- Travel case with ice pack: Blue and Purple.
- Pen cartridges, pen pins, Luer Lock syringe, BAC Water, alcohol prep pads, both sharps containers and syringe top-up kit.
- Reconstitution kit, Pen Reconstitution Kit, Pen Starter Kit, Range Starter Kit (separate small/large arrangements).
- Five pre-filled pen listings: Retatrutide 20mg/30mg, Klow 80mg, GHK-Cu 100mg and Tirzepatide 30mg. These retain the shared generic pen photograph rather than adding unverified package markings.

24 source bindings use 22 optimized transparent WebP assets and two existing shared background photographs. The Blue pen-and-case source which returned a one-pixel response uses that product's full parent Blue photo. The two identical generic pre-filled pen sources share one cutout.

## Integration

`ThemedProductImage` selects scenes by exact product slug and original photo identity, including the existing optimized BAC Water URL. This covers existing catalogue cards, product galleries, colour tiles, related products, cart/checkout and equipment offer thumbnails that consume the shared component. New or unrelated Admin uploads fall back to the existing image system; no slug-only substitution.

The three exact saved older kit light-image bindings are superseded by this explicitly requested refresh. They are recorded as `previousLight` in the manifest. A different future CMS light upload, explicit product override, or matching variant override remains authoritative. No database content is changed. Custom gallery uploads retain their existing handling.

The first server render includes both theme backgrounds, and the existing `html.light` / dark CSS chooses the visible theme. Products retain their selected colour and the kit arrangement in either mode. V2 detail views use per-photo anchors on the same cutout, not a separate colour photo. Visible pen gallery captions are removed, matching the existing Range presentation; accessible button labels and the screen-reader gallery announcement remain.

No publishing/deployment action is included. Merge target: `review/light-theme`; review and publish through Lovable.

## Validation

- TypeScript: `npx tsc --noEmit` passed.
- 43 targeted tests passed (633 assertions): source/variant ownership, CMS override precedence, existing image pairs, gallery selection, new-upload fallbacks and Range artwork regression.
- Production build passed; existing dependency deprecation and bundle-size warnings remain.
- Chromium review: all 24 source bindings in light/dark, seven source-specific pen galleries with dial/logo crops, 390px mobile catalogue, no horizontal overflow, no missing resources or browser errors.
- Interactive real ProductGallery / PhotoColourSelector review: Purple selection and dial/logo navigation retain the Purple cutout; theme switching and return to Blue work.

Preview screenshots are component review fixtures, not live production screenshots. Prices, stock, product descriptions and saved CMS content were not changed.
