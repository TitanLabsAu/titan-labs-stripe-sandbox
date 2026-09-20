# Titan Labs catalogue image and product batch

## Outcome
Create 31 unique catalogue products from the supplied list, each with a matching Titan Labs vial image derived from the supplied Retatrutide reference. Thymalin 10mg will be created once.

## Product image set
- Create one polished master image from the supplied reference while preserving the dark Titan laboratory scene, clear glass vial, Titan branding, and premium blue/gold lighting.
- Replace the pink cap with one consistent Titan Blue cap used across the full set.
- Prepare a clean label area, then typeset every product name exactly so spelling and dosage remain reliable.
- Show the stated dosage after the product name, for example `DSIP 10mg`.
- For every “No amount” entry, omit the dosage entirely; those words will never appear on an image.
- Label the combined product as `CJC-1295 Without DAC + IPA 5mg`.
- Keep all final images square and catalogue-ready, with consistent crop, vial position, branding, lighting, and label hierarchy.
- Inspect every image for cap colour, clear glass, text accuracy, clipping, and visual consistency.

## Catalogue products
- Create one product for each unique item with a URL-friendly identifier, matching product name, matching image, and a temporary price of `$0`.
- Leave sale, category, description, protocol, reconstitution, and other optional product details blank for later editing in Admin.
- Keep products visible in the catalogue, as requested, and attach each completed image to its matching product.
- Use the existing private product-image storage and signed image delivery already used by Admin product uploads.

## Download package
- Package all 31 final product images into one ZIP, using clear filenames based on each product name.
- Inspect the ZIP contents before delivery and provide it as a downloadable file.

## Verification
- Confirm all 31 unique products exist once, each with the correct image and `$0` placeholder price.
- Open the catalogue and representative product pages to confirm images load and labels are legible.
- Verify dosage examples and several blank-dosage products, including DSIP, Mots-c, CJC-1295 Without DAC + IPA, and Thymalin.

## Technical details
- Use image editing for the shared visual master because a source image was supplied, then deterministic label rendering for exact product text.
- Upload final images to the existing `product-images` storage area and save their signed-image paths on catalogue records.
- Insert/update catalogue rows by their URL identifiers so rerunning the batch does not create duplicates.
