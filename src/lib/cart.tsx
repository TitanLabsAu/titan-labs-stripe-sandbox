import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProduct } from "./products";

export type CartItem = { slug: string; quantity: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (slug: string, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  removeItem: (slug: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "titan-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => getProduct(i?.slug)));
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

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce(
      (sum, i) => sum + (getProduct(i.slug)?.price ?? 0) * i.quantity,
      0,
    );
    return {
      items,
      count,
      subtotal,
      addItem: (slug, quantity = 1) =>
        setItems((prev) => {
          const existing = prev.find((i) => i.slug === slug);
          if (existing) {
            return prev.map((i) =>
              i.slug === slug ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i,
            );
          }
          return [...prev, { slug, quantity }];
        }),
      setQuantity: (slug, quantity) =>
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((i) => i.slug !== slug)
            : prev.map((i) => (i.slug === slug ? { ...i, quantity: Math.min(99, quantity) } : i)),
        ),
      removeItem: (slug) => setItems((prev) => prev.filter((i) => i.slug !== slug)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
