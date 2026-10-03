# Testing Transparency Preview

## What will be built
- Create a reusable **Testing Transparency** banner based on the approved right-hand design examples, using the supplied standalone emblem rather than embedding the full concept board.
- Use real accessible text:
  - **Testing Transparency**
  - **Titan Labs // Aus - Member of The Peptide Society**
  - **View product certificates →**
- Keep the membership statement factual and avoid approved, accredited, or all-batches-tested claims.

## Placement
- **Homepage:** regular banner after the three quality feature cards and before the Join Titan call-to-action, regardless of editable section ordering.
- **Catalogue:** regular banner immediately above the product tabs, filters, and product grid.
- **Footer:** compact banner directly beneath the brand/about content.
- Add **Certificates** under the footer Navigate links.

## Certificates page
- Add a public `/certificates` page because no public certificate destination currently exists.
- Show an accurate empty state: “Certificates will appear here as they are added.”
- Do not add PDFs, test results, a certificate database, or Admin upload controls in this pass.

## Presentation and accessibility
- Match Titan’s navy, electric-blue, and gold visual language while using existing semantic theme tokens.
- Make the banner responsive, with stable emblem sizing, wrapped text, no horizontal overflow, keyboard-visible focus, and reduced-motion-safe effects.
- Keep all banner links useful and pointed to `/certificates`.

## Files
- Add `src/components/TestingTransparencyBanner.tsx`.
- Add `src/routes/certificates.tsx` with route-specific title, description, Open Graph metadata, and Twitter card metadata.
- Add the supplied emblem as `src/assets/testing-transparency-emblem.png.asset.json`.
- Update `src/routes/index.tsx`, `src/routes/range.tsx`, and `src/components/SiteFooter.tsx` for placement and navigation.
- Update `src/styles.css` only for reusable banner effects that cannot be expressed cleanly with existing utilities.
- Update `AGENTS.md` with the reusable placement/content rule and `roadmap.md` with this scoped work.

## Verification
- Run the existing tests, TypeScript check, and preview build checks.
- Verify desktop and mobile homepage, catalogue, footer, `/certificates`, keyboard focus, banner navigation, wrapping, and overflow.
- Report the exact changed files and current commit SHA.
- Leave the work unpublished, unmerged, and isolated from existing Equipment bundle work.
