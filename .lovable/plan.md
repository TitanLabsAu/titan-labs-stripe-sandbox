# Guest checkout + new-member first-purchase offer

Branch: rollout-updates-1-6 only. No publish, merge, main edits or history rewrites. No real orders, payments, emails or terms acceptance.

## What customers will see
- Checkout: "Continue as guest" next to Log in / Join. Signed-in members stay members and keep rewards and credit.
- Homepage and checkout banner: "New members receive {X}% off their first purchase", with Join / Log in links that return to checkout and keep the cart. Hidden when the offer is off.
- If a login expires during checkout: a clear "Sign in again" or "Continue as guest" choice. Never silently switch to guest.
- Account pages and Admin orders/CRM label guest orders "Guest". Confirmation emails go to the contact email the customer entered.

## Admin
Discounts / Referral settings get:
- Offer on/off
- Percentage (default 10)
- Stacking switches: combine with multi-buy, crypto, code, store credit

Default is better-of, not stacking. The existing 20% combined cap and $20 store-credit limit still apply.

## Rules (checked on the server)
- Eligible: a verified, signed-in member with no earlier non-cancelled order under their account or their normalised email. This includes guest orders, so customers can't reuse the offer by switching accounts or going from guest to member.
- The discount applies automatically to the item subtotal (shipping excluded) and is saved on the order and payment attempt.
- A database claim per member and email stops two checkouts at the same time from both getting the first-purchase discount.
  - Unpaid attempts expire.
  - Failure or cancel releases the claim.
  - Paid settlement consumes it once and is safe to repeat.

## Technical details

**Migration 0026 (additive only)**
- `orders.user_id` and `payment_attempts.user_id` become nullable. Add `guest_capability_hash`, `guest_email_normalized`, and `first_purchase_offer` (snapshot jsonb, default null) to both. Add `contact_email_normalized` to orders.
- `order_acknowledgements`: `user_id` becomes nullable. Add `guest_capability_hash`. Inserts happen through a server function only. The existing authenticated insert policy stays, so nothing breaks.
- `referral_settings`: add `first_offer_enabled`, `first_offer_percent` (default 10), and `first_offer_combine_multibuy`, `_crypto`, `_code`, `_credit`.
- `first_purchase_claims` table: unique keys on email and on member, status reserved/consumed/released, `expires_at`. Grants go to service_role only. RLS is on with no anon or authenticated policies.
- Security-definer RPCs `claim_first_offer`, `release_first_offer`, `consume_first_offer`, and `first_offer_eligible(email, user)`, all limited to service_role.
- `finalize_stripe_order` gets a guest-aware variant (new function name). The old one stays unchanged.
- Update the referral and settlement triggers and `orders_customer_guard` to tolerate a null `user_id`.
- Grants: no new anon grants anywhere.
- If the migration tool needs a companion, it becomes 0027 (SELECT 1). The journal stays strictly increasing, and no snapshots are overwritten.

**Guest capability**
- 32 random bytes (base64url). The server stores only its SHA-256 hash, with a 2-hour expiry.
- The server returns it in a signed httpOnly, SameSite=Lax cookie scoped to the checkout and server-function calls. That covers the Zip/Klarna redirect back to /checkout.
- Every guest server call (acknowledge, create attempt, verify Stripe PaymentIntent, PayID/crypto reference update, confirmation view) re-hashes the cookie and matches it to the row. Posted userId, orderId or email is never trusted for ownership.

**Server endpoints**
- New optional-auth middleware: a valid bearer gives a member. With no bearer, a guest capability is required. An invalid or expired bearer returns a typed `AUTH_EXPIRED` error so the UI offers sign-in or guest, never an automatic downgrade.
- `recordAcknowledgement` moves to a `createServerFn`. It is required before Stripe intent creation and before PayID/crypto order submission, on both paths. The direct client insert is removed.
- `priceCheckout` gains offer evaluation in `order-pricing.ts`. It uses better-of against multi-buy/crypto/code unless the admin combine switches are on, applies the cap and credit limits, and works in integer cents.
- Stripe intent and verify, the webhook, Eway, and PayID/crypto paths carry the offer snapshot and the claim id. The webhook still does its own signature check and server verification.
- Guests cannot use store credit or referral rewards; credit requires a member.

**UI**
- `checkout.tsx`: guest choice, guest contact email required, and a subscription to auth changes.
- New `FirstOfferBanner` on the homepage and checkout, driven by `useReferralSettings`.
- `AdminDiscounts` / referral settings panel gets the new controls.
- `OrderList`, Admin orders and members show the "Guest" label.

**Tests (mocks and rolled-back DB fixtures only)**
- Guest denied another guest's or a member's order, attempt or acknowledgement
- Invalid or expired capability rejected
- Eligibility: repeat member, earlier guest order under the same email, concurrent claims (only one wins), release on failure, idempotent consume
- Pricing: better-of, combine switches, 20% cap, $20 credit, rounding
- Session expiry gives `AUTH_EXPIRED`
- Acknowledgement required on both the guest and member paths
- Then build, typecheck, and desktop/mobile preview of the banner and guest choice, without submitting.

**Report:** changed files, tests, the exact migration applied, and limitations (live Stripe/Zip redirects for guests are untested).
