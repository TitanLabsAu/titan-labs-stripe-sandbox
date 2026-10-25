import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { PromotionBannerEditor } from "../src/components/PromotionBannerEditor";
import { PromotionRibbon } from "../src/components/PromotionRibbon";
import { DEFAULT_BANNERS, parseBannerSettings, serialiseBannerSettings } from "../src/lib/promotion-banners";

/** Isolated real editor; session storage contains only dummy fixtures, never live settings. */
export function mountPromotionFixture() {
  const host = document.createElement("div"); document.body.replaceChildren(host);
  function Fixture() {
    const [settings, setSettings] = useState(() => parseBannerSettings(sessionStorage.getItem("dummy-promotion-banners") ?? ""));
    return <main className="min-h-screen bg-background p-4 text-foreground sm:p-8"><div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold">Promotion banners · isolated review</h1>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">{DEFAULT_BANNERS.map(b => <figure key={b.id} className="titan-product-photo relative h-48 overflow-hidden border border-border bg-card"><img src="/images/product-optimized/ghk-cu-960.webp" alt="Existing vial artwork" className="h-full w-full object-contain" /><PromotionRibbon banner={b} /></figure>)}</div>
      <PromotionBannerEditor settings={settings} selections={[{ key: "demo::blue", name: "Demo pen — Blue", hot: true }, { key: "demo::purple", name: "Demo pen — Purple", label: "New product" }, { key: "demo-sale", name: "Demo sale item", sale: true }]}
        onSave={async next => { const raw = serialiseBannerSettings(next); sessionStorage.setItem("dummy-promotion-banners", raw); setSettings(parseBannerSettings(raw)); }} />
    </div></main>;
  }
  createRoot(host).render(<Fixture />);
}