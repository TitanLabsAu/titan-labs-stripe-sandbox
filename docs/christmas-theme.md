# Titan Gold Christmas (unpublished draft)

The seasonal layer is independent of the existing device-only Light/Dark choice. Nothing is enabled on deployment: missing or invalid `site_content.christmas_theme` settings resolve to OFF. No migration or initial settings write is needed.

## Admin

Website editor → Appearance → Titan Gold Christmas, immediately below the existing Light/Dark buttons.

- Master decoration switch and Subtle/Full density.
- Separate switches for warm lights, evergreen branches/baubles, the catalogue wreath, and Santa hats.
- A Santa sleigh switch reveals first-flight minimum/maximum delay, between-flight minimum/maximum interval, and flight duration. All times are whole seconds; fixed min=max intervals are allowed.
- Snow trail switch and Light/Medium/Heavy amount.
- Preview flight without saving runs locally in the panel. It respects reduced motion.
- Save Christmas settings applies the draft site-wide. Until saving, the storefront is unchanged.

First flight defaults to 30–60 seconds; subsequent waits default to 120–240 seconds after the previous flight and its trail finish. Flight defaults to eight seconds. Turning the master or Santa switch off cancels timers and animation frames. Hidden tabs cancel the current effect and schedule a fresh delay when visible again. Resizing restarts safely at the new dimensions.

## Artwork and scope

Santa, the sleigh and four reindeer now use a transparent 1280×640 WebP sprite with four realistic gallop poses. A discrete CSS animation advances the 2×2 frames, while the existing flight scheduler moves the group. The sprite is preloaded only when the Christmas/sleigh switches are on. Evergreen branches, baubles, wreaths and hats remain lightweight original SVGs. Canvas renders only the short fading snow trail; particles are bounded and the display pixel ratio is capped at two.

All layers ignore pointer input and are hidden from assistive technology. Original product files, prices, sale rules, theme choice and page copy are not rewritten. Product-card and product-detail hats sit at the right to avoid existing left-hand promotion ribbons. The helmet hat follows the built-in welcome image; a custom welcome image disables that hat to avoid decorating the wrong subject. Static decorations work in both themes.

Account, orders, checkout, receipts, authentication, Admin, preview and API paths are excluded. Reduced-motion visitors see only static decorations. This feature does not create a Christmas discount or sale banner.

## Persistence and checks

`adminSaveChristmasSettings` uses the existing authenticated Admin role check, strict timer validation, and compare-and-set against the exact settings body shown when editing. Stale or racing saves cannot overwrite another Admin's change. Only the one seasonal `site_content` row is written.

Run:

```sh
bun install --frozen-lockfile
bun test scripts
bunx tsc --noEmit
bun run build
```

The production sitemap plugin needs public catalogue build configuration. Local validation uses an isolated HTTP fixture for the sitemap reads; it does not read or change a live database. No actual orders, stock, payments, emails or settings writes are part of these tests.

New tests cover malformed/missing defaults, exact random bounds, timer validation, excluded paths, actual save-handler authorisation/conflicts, cleanup on disable, reduced motion, visibility pause/resume, preview replay, and repeat scheduling.

Before publication, visually review the hat placement against any saved welcome artwork on desktop/mobile and both themes, and use the Admin preview flight. Browser and Admin sign-in checks are separate from the automated tests. Keep this draft unpublished until approved.


### Realistic Santa artwork revision

`public/christmas/santa-sleigh-realistic-v1.webp` is a 304,142-byte alpha WebP (1280×640), optimised from the generated four-pose artwork without changing its design. Generated with the built-in image tool; no Lovable build credits were used.

Art direction: realistic cinematic Santa in a red velvet suit, red/gold sleigh, natural brown-furred reindeer with leather harnesses, royal blue/gold gifts, side-on flight toward the right, transparent background, four consecutive gallop poses in a fixed 2×2 grid. No scenery, text or baked-in snow; the existing runtime provides the fading snow trail.

Updated validation: 554 tests / 5,786 assertions, TypeScript and production build pass. The build uses the same isolated sitemap fixture. The realistic artwork replaces only the sleigh/reindeer; all Admin controls and OFF-by-default behaviour are unchanged.

## Realistic artwork and website sale revision

The hat, pine corners, wreath and fairy lights use transparent, versioned WebP artwork in `public/christmas/*-realistic-v2.webp`. They are generated artwork, separate from original site/product photos. Header decorations follow the actual header height; decorative elements do not receive pointer events. Hat positioning uses the shared built-in hero composition; uploaded custom hero art does not receive the helmet hat.

Admin → Website → Appearance → Christmas Theme → Website Promotion offers an independent sale toggle, name, and integer discount of 1–90%. New deployments default OFF. Every product editor has an immediately saved inclusion switch covering all variants and catalogue listings. Exclusions are stored by stable product ID in `site_content.website_promotion`; no database migration is required. Global saves preserve product exclusions. Both handlers enforce Admin access and reject stale/concurrent saves. No production settings are changed by this code revision.

Website prices use the lower of the regular-price percentage discount or an existing individual sale. These two discounts do not compound. Turning the promotion off leaves saved regular/individual prices intact. Existing cart/checkout incentives retain their rules. The public catalogue and trusted checkout use the same cents-rounded rule; checkout refuses to proceed when the promotion configuration cannot be read or validated. Equipment add-ons are priced as their own products and follow their own exclusions.

### Theme photo identity

Bundled light photos apply only to their known original source. A newly uploaded Admin photo cannot fall back to an older bundled light photo. CMS → Homepage → Theme artwork supports source-bound page/photo pairs and variant pairs (product slug, variant ID, exact current source URL, light URL). Product cards, detail, cart, checkout, category tiles, page images, guide pictures and branding use the shared resolvers. Without a matching light alternate, the latest assigned photo stays visible in both modes; images are never inverted or substituted with another product/colour. Explicit original-product light overrides remain supported.
