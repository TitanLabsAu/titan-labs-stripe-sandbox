import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  cartLineKey,
  effectivePack,
  getProductOption,
  bundleSummary,
  type ProductPack,
  type Product,
} from "./products";
import { useProducts } from "./useCatalog";

export type CartItem = {
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

const SOURCE_RE = /^[a-z0-9:-]{1,80}$/;
function sanitizeSource(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  return SOURCE_RE.test(s) ? s : null;
}

type CartContextValue = {
  items: CartItem[];
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
  let changed = false;
  const out: CartItem[] = [];
  for (const item of items) {
    const product = getProduct(item.slug);
    let line = item;
    if (product && item.pack === "kit" && effectivePack(product, "kit") === "single") {
      changed = true;
      line = { ...item, pack: "single", key: cartLineKey(item.slug, item.variantId ?? null, "single") };
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
      const product = getProduct(item.slug);
      if (!product) return 0;
      return getProductOption(product, item.variantId ?? null, item.pack ?? "single").unitPrice;
    };
    const getLineLabel = (item: CartItem, product?: Product | null) => {
      const found = product ?? getProduct(item.slug);
      if (!found) return item.variantLabel ?? "Selected option";
      const base = getProductOption(found, item.variantId ?? null, item.pack ?? "single").label;
      const bundle = bundleSummary(found.variants?.find((v) => v.id === item.variantId)?.contents);
      return bundle ? `${base} (${bundle})` : base;
    };
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + getLinePrice(i) * i.quantity, 0);
    return {
      items,
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
      setQuantity: (key, quantity) =>
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((i) => i.key !== key)
            : prev.map((i) => (i.key === key ? { ...i, quantity: clampQuantity(quantity) } : i)),
        ),
      removeItem: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
      clear: () => setItems([]),
      getLinePrice,
      getLineLabel,
    };
  }, [items, getProduct]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
