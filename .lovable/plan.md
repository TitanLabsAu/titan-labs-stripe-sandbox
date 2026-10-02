# Mobile cart access and compact quantity

## What will change
- Add a mobile-only floating cart button at the bottom of the screen whenever the cart contains items.
- Make the floating button open the existing cart panel, preserving all current cart and checkout behavior.
- Replace catalogue counter text such as “1 in order” with the numeric quantity only, while keeping the minus and plus controls.

## Technical details
- Reuse the existing cart panel rather than introducing a second cart flow.
- Mount the mobile trigger globally so it remains accessible while browsing, and hide it at tablet/desktop widths.
- Respect phone safe-area spacing and verify the catalogue add/remove flow at mobile width.
