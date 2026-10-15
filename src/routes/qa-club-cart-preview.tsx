import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CartSheet } from "@/components/CartSheet";
import { FoundationMemberView } from "@/components/FoundationMemberBadge";
import { TitanClubView } from "@/components/TitanClubBadge";
import { AdminTitanClubView } from "@/components/AdminTitanClub";
import { useCart } from "@/lib/cart";
import { useProducts } from "@/lib/useCatalog";
import { useReferralSettings, cartPriceLines } from "@/lib/useReferralSettings";
import { getProductOption } from "@/lib/products";
import { quoteOrder } from "@/lib/order-pricing";

/**
 * TEMPORARY owner-preview fixture (dummy data only). Seeds a fake session +
 * cart in localStorage and primes the member-quote cache with a quote DERIVED
 * FROM THE SAME ITEM LINES the cart displays, so item and subtotal always
 * match. No server calls, no real members, no database writes.
 */
export const Route = createFileRoute("/qa-club-cart-preview")({
  component: QaFixture,
});

const FAKE_UID = "00000000-0000-4000-8000-000000000001";
const STORAGE_KEY = "sb-yfvwxnoerobaqokobefz-auth-token";

function fakeSession() {
  return JSON.stringify({
    access_token: "qa-fixture-no-real-token",
    refresh_token: "qa-fixture",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: FAKE_UID, aud: "authenticated", email: "qa-member@example.invalid" },
  });
}

const CLUB = { type: "percent" as const, percent: 25, fixedCents: 0, maxCapPercent: 30 };

function QaFixture() {
  // Session must exist before CartSheet's auth effect reads it: seed in a
  // render-phase initializer (runs before any child effects).
  useState(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, fakeSession());
    return true;
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-6 rounded-lg border border-dashed border-muted-foreground/50 p-3 text-xs text-muted-foreground">
        QA FIXTURE — dummy member, dummy cart, dummy benefits. Nothing here is real or saved.
      </p>
      <ProfileBadges />
      <CartFixture />
      <AdminFixture />
    </div>
  );
}

function ProfileBadges() {
  const foundation = {
    award: { memberNumber: 7, awardedAt: "2026-10-14T00:00:00Z", orderId: "qa" },
    status: { capacity: 50, benefitPercent: 5, launched: true, enrolmentEnabled: true, awarded: 7 },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return (
    <>
      {/* Club member: personal maximum replaces the website cap in the Foundation text. */}
      <FoundationMemberView data={foundation} capPercent={30} personalCap />
      <TitanClubView club={{ ...CLUB, assignedAt: "2026-10-14T00:00:00Z" }} />
    </>
  );
}

function CartFixture() {
  const queryClient = useQueryClient();
  const { items, addItem, getLinePrice } = useCart();
  const { getProduct } = useProducts();
  const { settings } = useReferralSettings();
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (seeded || items.length > 0) return;
    const pen = getProduct("ghk-cu-100mg-disposable-pen");
    const bac = getProduct("bac-water");
    if (!pen || !bac) return; // catalogue not loaded yet — retry on next render
    const penVariant = pen.variants?.[0]?.id ?? null;
    addItem("ghk-cu-100mg-disposable-pen", 2, { variantId: penVariant, pack: "single" });
    addItem("bac-water", 1, { variantId: "10ml", pack: "single" });
    setSeeded(true);
  }, [seeded, items.length, getProduct, addItem]);

  // Prime the member quote for EXACTLY the items now in the cart, derived from
  // the same price lines the cart itself uses — item rows and subtotal can
  // never disagree. Runs before the sheet is opened, so the query mounts fresh.
  useEffect(() => {
    if (items.length === 0) return;
    const quoteItems = items.map((i) => ({ slug: i.slug, variantId: i.variantId ?? null, pack: i.pack ?? "single", quantity: i.quantity }));
    const lines = cartPriceLines(items, getProduct, getLinePrice);
    const quote = quoteOrder(
      { lines, shippingMethod: "express", paymentMethod: "payid", foundationPercent: 5, club: CLUB },
      settings,
    );
    queryClient.setQueryData(["cart-member-quote", FAKE_UID, JSON.stringify(quoteItems)], quote);
  }, [items, getProduct, getLinePrice, settings, queryClient]);

  return (
    <div className="mb-10">
      <h2 className="mb-3 text-sm font-bold uppercase text-muted-foreground">Cart (signed-in member quote)</h2>
      <CartSheet />
    </div>
  );
}

const DUMMY_MEMBER = {
  userId: FAKE_UID,
  name: "Jordan QA (dummy)",
  email: "qa-member@example.invalid",
  type: "percent" as const,
  percent: 25,
  fixedCents: 0,
  maxCapPercent: 30,
  active: true,
  note: "Dummy fixture assignment — not a real member.",
  assignedAt: "2026-10-14T00:00:00Z",
  updatedAt: "2026-10-14T00:00:00Z",
  revokedAt: null,
};

function AdminFixture() {
  return (
    <AdminTitanClubView
      data={{ installed: true, enabled: true, siteCapPercent: 20, members: [DUMMY_MEMBER], events: [] }}
      search={async () => [{ userId: "00000000-0000-4000-8000-0000000000ff", name: "Casey QA (dummy)", email: "qa-candidate@example.invalid" }]}
      onSave={async () => {
        throw new Error("QA fixture: save intentionally fails so the draft is kept.");
      }}
      onToggle={() => undefined}
      initialDraft={{
        userId: "00000000-0000-4000-8000-0000000000ff",
        name: "Casey QA (dummy)",
        email: "qa-candidate@example.invalid",
        type: "percent",
        amount: "25",
        maxCap: "30",
        note: "Dummy note — fixture only.",
        active: true,
        isNew: true,
      }}
    />
  );
}
