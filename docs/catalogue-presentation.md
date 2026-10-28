# Product presentation controls

Admin > Products > Edit now includes:

- Product information panels: product details, what's included, compatibility & care, shipping & returns. Save separately. Saved empty/whitespace content hides the panel. Until an override is saved, existing product description, details, protocol and selected variant contents remain the source. Explicit panel text takes precedence over the original product fields. Documents & certificates use the existing product document editor; no saved valid links means no documents panel.
- Dark & light product photos: choose the main product or an individual colour; upload a matching light photo. The pairing belongs to the exact current source photo URL, so later Admin photo replacements cannot resurrect old artwork. The preview states when no matching light photo is assigned. Clearing this override restores automatic matching where available, otherwise the current source in both modes.
- Three product highlight photos: full product, label detail and Titan Labs product box (pens: full, dial and logo). Each slot supports its own light-mode counterpart. The selected colour has its own gallery. Blank extra slots on non-pen products are hidden; repeated zoom crops are no longer invented. Pens retain their three automatic detail views.

All section saves use existing Admin role validation and optimistic conflict checks. No database migration or production content write is required by the code release. Existing gallery rows remain valid without new light fields.

## Photo work still required

This merge supplies the controls and correct source matching, not a claim that every product has a newly photographed/generated set. Distinct label and boxed-product photos must be supplied for individual vials. Packaging previews are concepts, not evidence of included physical packaging.

The October 28 public catalogue audit found missing separate light counterparts for 5-Amino-1MQ, Alcohol Prep Pads, Pen Reconstitution Kit, the older V2 listing, all three Titan V2 colours and both Travel Case colours. The updated Range Starter Kit needs a matching light photo of the current no-BAC-water kit. These keep the current photo in both modes until paired, rather than substituting an obsolete or different product image. The exact legacy CJC-1295, KPV and Reta-30 original URLs are now recognized; newer uploads stay protected.

## Validation

580 tests passed across 66 test files when run in isolated processes (the monolithic Bun invocation encounters existing cross-file mocked-module export conflicts). TypeScript and production build passed. Local browser QA verified light/dark visibility, pen colour changes, detail selection, hiding unsupplied extra vial thumbnails, editable panel empty feedback and Admin photo controls. Browser checks used local fixtures and made no production writes. Production saves and a complete live catalogue visual pass remain for post-publication testing.
