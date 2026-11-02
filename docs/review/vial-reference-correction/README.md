# Vial scale and gallery reference correction

Preview for user approval; do not merge or publish until the visual composition is accepted.

The Range main vial is reduced from a 720px cutout canvas to 585px in the 1000px scene. Its visible height is approximately 54% of the scene, centred near 67% horizontally, with its base near 82% vertically, matching the proportions measured from the supplied original SS-31 screenshot. The current navy/gold label and the existing light/dark backgrounds are retained. The redundant oval shadow is removed because the cutout already includes its contact shadow.

The three thumbnails remain: full vial, label close-up, then vial on the left beside the taller box on the right. The label crop now includes all three disclaimer lines. The boxed composition uses explicit transparent-image crop bounds and aligns the vial and box bases. A selected label/boxed view retains the same composition as its thumbnail, scaled within the main image.

This changes only RangeProductArt rendering. Product names, strengths, CMS data, pricing, stock, checkout, Pens and Equipment imagery remain unchanged.

Validation: TypeScript and 14 Range/gallery tests passed. Browser component preview inspected in light and dark, all three view buttons, a long blend name with 5mg / 5mg, and HGH 36IU. A 390px iframe (375px content area after its scrollbar) had no horizontal overflow. Screenshots show actual source-component output in a review fixture beside the user-supplied original reference; they are not live production screenshots.
