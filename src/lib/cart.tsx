import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  cartLineKey,
  effectivePack,
  getProductOption,
  bundleSummary,
  type ProductPack,
  type Product,
} from "./products";
import { useProducts, useSiteContent } from "./useCatalog";
import { linkedLineKeys, repairPairedLines } from "./pen-companion";

import { supabase } from "@/integrations/supabase/client";
import { EQUIPMENT_GIFTS_KEY, DEFAULT_STORAGE_RULE, eligibleGiftRules, isFreeGift, parseEquipmentGiftOffers } from "./equipment-gifts";

export type CartItem = {
  freeGift?: boolean;
  giftOfferId?: string | null;
  key: string;
  slug: string;
  quantity: number;
  variantId?: string | null;
  variantLabel?: string | null;
  pack?: ProductPack;
  /** Marks lines owned by an in-page flow (e.g. the V2 pen companion), so they never merge with manual lines. */
  source?: string | null;
};

export type CartItemOption = {
  variantId?: string | null;
  variantLabel?: string | null;
  pack?: ProductPack;
  source?: string | null;
};

/** Flow-owned lines get a distinct key suffix so they never merge with manually added lines of the same product. */
export function flowLineKey(slug: string, variantId: string | null | undefined, source: string) {
  return `${cartLineKey(slug, variantId ?? null, "single")}::flow:${source}`;
}

const SOURCE_RE = /^[a-zA-Z0-9_:-]{1,200}$/;
function sanitizeSource(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  return SOURCE_RE.test(s) ? s : null;
}

type CartContextValue = {
  items: CartItem[];
  giftChoices: { id: string; label: string; quantity: number; selected: boolean }[];
  setGiftSelected: (id: string, selected: boolean) => void;
  count: number;
  subtotal: number;
  addItem: (slug: string, quantity?: number, option?: CartItemOption) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  getLinePrice: (item: CartItem) => number;
  getLineLabel: (item: CartItem, product?: Product | null) => string;
};

// Keep one context instance even if this module is re-evaluated (hot reload),
// otherwise the provider and the consumers can end up on different contexts.
const globalStore = globalThis as unknown as {
  __titanCartContext?: ReturnType<typeof createContext<CartContextValue | null>>;
};
const CartContext =
  globalStore.__titanCartContext ??
  (globalStore.__titanCartContext = createContext<CartContextValue | null>(null));
const STORAGE_KEY = "titan-cart-v1";

function clampQuantity(quantity: number) {
  return Math.min(99, Math.max(1, Math.floor(quantity || 1)));
}

function normalizeItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<CartItem>;
  if (typeof item.slug !== "string" || !item.slug) return null;
  const pack: ProductPack = item.pack === "kit" ? "kit" : "single";
  const variantId = typeof item.variantId === "string" && item.variantId ? item.variantId : null;
  const source = sanitizeSource(item.source);
  return {
    key: typeof item.key === "string" && item.key ? item.key : source ? flowLineKey(item.slug, variantId, source) : cartLineKey(item.slug, variantId, pack),
    slug: item.slug,
    quantity: clampQuantity(Number(item.quantity ?? 1)),
    variantId,
    variantLabel: typeof item.variantLabel === "string" ? item.variantLabel : null,
    pack,
    source,
  };
}

/** Force kit lines to single for products that disallow kits, merging duplicates. Returns same array if unchanged. */
export function coerceCartItems(
  items: CartItem[],
  getProduct: (slug: string) => Product | null | undefined,
): CartItem[] {
  const repaired = repairPairedLines(items);
  let changed = repaired !== items;
  const out: CartItem[] = [];
  for (const item of repaired) {
    const product = getProduct(item.slug);
    let line = item;
    // Legacy product-only ownership cannot identify a size. Preserve the item
    // as an ordinary cart choice rather than guessing or deleting a purchase.
    const validSource = sanitizeSource(item.source);
    const source = validSource && /^(pen-companion|pen-case|kit-offer):[^:]+$/.test(validSource) ? null : validSource;
    if (source !== (item.source ?? null)) {
      changed = true;
      line = { ...line, source };
    }
    const canonicalKey = source ? flowLineKey(item.slug, item.variantId, source) : cartLineKey(item.slug, item.variantId, item.pack ?? "single");
    if (line.key !== canonicalKey) { changed = true; line = { ...line, key: canonicalKey }; }
    if (product && item.pack === "kit" && effectivePack(product, "kit") === "single") {
      changed = true;
      line = {
        ...line,
        pack: "single",
        key: line.source
          ? flowLineKey(item.slug, item.variantId ?? null, line.source)
          : cartLineKey(item.slug, item.variantId ?? null, "single"),
      };
    }
    const dup = out.find((o) => o.key === line.key);
    if (dup) {
      changed = true;
      dup.quantity = clampQuantity(dup.quantity + line.quantity);
    } else out.push({ ...line });
  }
  return changed ? out : items;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { getProduct } = useProducts();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [giftDeclined, setGiftDeclined] = useState<string[]>([]);
  const { data: giftContent } = useSiteContent();
  const giftRules = parseEquipmentGiftOffers(giftContent?.[EQUIPMENT_GIFTS_KEY]);
  useEffect(() => {
    let live = true;
    const apply = (id: string | null) => {
      if (!live) return;
      setMemberId(id);
      try {
        const raw = localStorage.getItem(`titan-equipment-gifts-declined:${id || "guest"}`);
        const declined = raw ? JSON.parse(raw) : [];
        const ids = Array.isArray(declined) ? declined.filter((v): v is string => typeof v === "string") : [];
        if (!raw && id && localStorage.getItem(`titan-storage-gift-declined:${id}`) === "true") ids.push(DEFAULT_STORAGE_RULE.id);
        setGiftDeclined(ids);
      } catch { setGiftDeclined([]); }
    };
    let authChanged = false;
    supabase.auth.getSession().then(({ data }) => { if (!authChanged) apply(data.session?.user.id ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { authChanged = true; apply(session?.user.id ?? null); });
    return () => { live = false; listener.subscription.unsubscribe(); };
  }, []);
  const selectGift = (id: string, selected: boolean) => {
    const next = selected ? giftDeclined.filter(v => v !== id) : [...new Set([...giftDeclined, id])];
    setGiftDeclined(next);
    try { localStorage.setItem(`titan-equipment-gifts-declined:${memberId || "guest"}`, JSON.stringify(next)); } catch { /* optional preference */ }
  };
  const availableGifts = eligibleGiftRules(giftRules, items, Boolean(memberId), getProduct);
  const giftChoices = availableGifts.map(rule => {
    const product = getProduct(rule.giftSlug);
    const variant = product?.variants?.find(v => v.id === rule.giftVariantId);
    return { id: rule.id, label: `${product?.name || "Equipment"}${variant ? ` — ${variant.label}` : ""}`, quantity: rule.giftQuantity, selected: !giftDeclined.includes(rule.id) };
  });
  const visibleItems: CartItem[] = [...items, ...availableGifts.filter(rule => !giftDeclined.includes(rule.id)).map(rule => ({ key: `free-gift:${rule.id}`, slug: rule.giftSlug, variantId: rule.giftVariantId, quantity: rule.giftQuantity, pack: "single" as const, freeGift: true, giftOfferId: rule.id }))];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.map(normalizeItem).filter((i): i is CartItem => Boolean(i)));
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items]);

  // Repair restored/stale lines: products that disallow kits are forced to single.
  useEffect(() => {
    setItems((prev) => coerceCartItems(prev, getProduct));
  }, [getProduct, items]);

  const value = useMemo<CartContextValue>(() => {
    const getLinePrice = (item: CartItem) => {
      if (isFreeGift(item)) return 0;
      const product = getProduct(item.slug);
      if (!product) return 0;
      return getProductOption(product, item.variantId ?? null, item.pack ?? "single").unitPrice;
    };
    const getLineLabel = (item: CartItem, product?: Product | null) => {
      const found = product ?? getProduct(item.slug);
      if (!found) return item.variantLabel ?? "Selected option";
      const base = getProductOption(found, item.variantId ?? null, item.pack ?? "single").label;
      const bundle = bundleSummary(found.variants?.find((v) => v.id === item.variantId)?.contents);
      const label = bundle ? `${base} (${bundle})` : base;
      return isFreeGift(item) ? `${label} · Complimentary gift` : label;
    };
    const count = visibleItems.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = visibleItems.reduce((sum, i) => sum + getLinePrice(i) * i.quantity, 0);
    return {
      items: visibleItems,
      giftChoices, setGiftSelected: selectGift,
      count,
      subtotal,
      addItem: (slug, quantity = 1, option) => {
        const product = getProduct(slug);
        const pack = product ? effectivePack(product, option?.pack) : (option?.pack ?? "single");
        const variantId = option?.variantId ?? null;
        const source = sanitizeSource(option?.source);
        const key = source ? flowLineKey(slug, variantId, source) : cartLineKey(slug, variantId, pack);
        setItems((prev) => {
          const existing = prev.find((i) => i.key === key);
          if (existing) {
            return prev.map((i) =>
              i.key === key ? { ...i, quantity: clampQuantity(i.quantity + quantity) } : i,
            );
          }
          return [
            ...prev,
            {
              key,
              slug,
              quantity: clampQuantity(quantity),
              variantId,
              variantLabel: option?.variantLabel ?? null,
              pack,
              source,
            },
          ];
        });
      },
      // A paired V2 pen and its case are linked: quantity and removal apply to both.
      setQuantity: (key, quantity) => {
        if (key.startsWith("free-gift:")) { if (quantity <= 0) selectGift(key.slice(10), false); return; }
        setItems((prev) => {
          const keys = linkedLineKeys(prev, key);
          return quantity <= 0
            ? prev.filter((i) => !keys.includes(i.key))
            : prev.map((i) => (keys.includes(i.key) ? { ...i, quantity: clampQuantity(quantity) } : i));
        });
      },
      removeItem: (key) => { if (key.startsWith("free-gift:")) { selectGift(key.slice(10), false); return; } setItems((prev) => { const keys = linkedLineKeys(prev, key); return prev.filter((i) => !keys.includes(i.key)); }); },
      clear: () => { setItems([]); setGiftDeclined([]); try { localStorage.removeItem(`titan-equipment-gifts-declined:${memberId || "guest"}`); if (memberId) localStorage.removeItem(`titan-storage-gift-declined:${memberId}`); } catch { /* optional preference */ } },
      getLinePrice,
      getLineLabel,
    };
  }, [items, getProduct, memberId, giftDeclined, giftContent]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}


