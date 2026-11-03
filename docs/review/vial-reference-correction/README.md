# Original photographic vial and full-width gallery — revised review

This revision replaces the rejected replacement-vial preview. Approval is required before merge; no publication is included.

## Original vial appearance

Range artwork now reuses the actual original website photographs (`/images/product-optimized/retatrutide.webp` and its existing light counterpart). The cap, metal, glass silhouette, reflections, lighting and original scene placement are the original photo pixels. No new bottle is generated. Only the paper label is overlaid with the current navy/gold label and selected product/strength. The square catalogue composition preserves the original photo geometry; the product-page main frame crops it to 4:3 without stretching.

For the three gallery views, an SVG silhouette clips that same original photographed vial. The image itself is not retouched or regenerated. The new label and matching navy/gold box remain. Photo switching follows the existing first-paint theme CSS.

## Reference layout

The Range product page has a 3:2 photo/details column ratio. Three 3:2 thumbnails span the entire combined width in one row below BOTH columns, followed by product information. Their order is full vial, label close-up, then a smaller vial on the left beside the taller box on the right. There are no visible captions; accessible view labels and announcements remain.

`ProductGallery` accepts the buying controls as children so its view selection and full-width row share the same state. The existing controls, selected variant, pricing and add-to-cart handlers remain in the product route. Non-Range galleries retain their original column arrangement and aspect ratios.

## Validation

- TypeScript, 14 Range/gallery tests and production build passed.
- Browser measured that the thumbnail row spans the combined photo/details width and lies below both.
- Light/dark screenshots use the actual ProductGallery and RangeProductArt components. Buying controls are a disabled review fixture, not a production checkout.
- All three views were inspected. Switching 20mg to 30mg updates the main view plus all three thumbnails with no stale 20mg label.
- Mobile iframe: 390px outer width, 375px content width after the scrollbar, no horizontal overflow, thumbnails remain below the buying controls.
- No application console errors observed. No database, CMS, pricing, stock or payment changes.

The screenshots in this directory supersede the earlier rejected screenshots on this PR.

## Third-thumbnail framing refinement

The latest supplied vial-and-box reference is shown beside the updated composition in `boxed-light.jpg` and `boxed-dark.jpg`. The approved current carton artwork is retained. Its framing is wider and moved closer behind the original reflective vial, with slight overlap and the vial in front-left. The laboratory background is reframed to lower the bench horizon. The main image, first two thumbnails and gallery-row placement are unchanged by this refinement.
