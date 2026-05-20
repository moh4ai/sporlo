"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartLine {
  org_id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  variant_label: string | null;
  unit_price_sar: number;
  quantity: number;
  // Cover image path or URL — written when the line is added so the cart
  // page and mini-cart drawer can render thumbnails without re-fetching.
  image_path: string | null;
}

export interface CartState {
  org_id: string;
  lines: CartLine[];
}

// v1 lived under "sporlo-shop-cart" in sessionStorage. v2 moves to
// localStorage and includes image_path on each line. v1 carts are orphaned
// on purpose — acceptable for demo, documented in plan §15 risk #6.
const CART_KEY = "sporlo-shop-cart-v2";

function readStorage(): CartState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CART_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(state: CartState | null) {
  if (typeof window === "undefined") return;
  if (!state || state.lines.length === 0) {
    window.localStorage.removeItem(CART_KEY);
  } else {
    window.localStorage.setItem(CART_KEY, JSON.stringify(state));
  }
}

interface CartContextValue {
  cart: CartState | null;
  mounted: boolean;
  count: number;
  subtotalSar: number;
  addLine: (line: CartLine) => void;
  updateQty: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clear: () => void;
  openMiniCart: () => void;
  closeMiniCart: () => void;
  miniCartOpen: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);

  useEffect(() => {
    setCart(readStorage());
    setMounted(true);
    function onStorage(e: StorageEvent) {
      if (e.key !== CART_KEY) return;
      setCart(readStorage());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartState | null) => {
    writeStorage(next);
    setCart(next);
  }, []);

  const addLine = useCallback(
    (line: CartLine) => {
      const base: CartState =
        cart && cart.org_id === line.org_id
          ? { ...cart, lines: [...cart.lines] }
          : { org_id: line.org_id, lines: [] };
      const existing = base.lines.find((l) => l.variant_id === line.variant_id);
      if (existing) {
        existing.quantity = existing.quantity + line.quantity;
      } else {
        base.lines.push(line);
      }
      persist(base);
    },
    [cart, persist],
  );

  const updateQty = useCallback(
    (variantId: string, quantity: number) => {
      if (!cart) return;
      const lines = cart.lines
        .map((l) =>
          l.variant_id === variantId
            ? { ...l, quantity: Math.max(0, quantity) }
            : l,
        )
        .filter((l) => l.quantity > 0);
      persist(lines.length === 0 ? null : { ...cart, lines });
    },
    [cart, persist],
  );

  const removeLine = useCallback(
    (variantId: string) => {
      if (!cart) return;
      const lines = cart.lines.filter((l) => l.variant_id !== variantId);
      persist(lines.length === 0 ? null : { ...cart, lines });
    },
    [cart, persist],
  );

  const clear = useCallback(() => persist(null), [persist]);

  const count = useMemo(
    () => (cart?.lines ?? []).reduce((acc, l) => acc + l.quantity, 0),
    [cart],
  );
  const subtotalSar = useMemo(
    () =>
      (cart?.lines ?? []).reduce(
        (acc, l) => acc + l.unit_price_sar * l.quantity,
        0,
      ),
    [cart],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      mounted,
      count,
      subtotalSar,
      addLine,
      updateQty,
      removeLine,
      clear,
      miniCartOpen,
      openMiniCart: () => setMiniCartOpen(true),
      closeMiniCart: () => setMiniCartOpen(false),
    }),
    [
      cart,
      mounted,
      count,
      subtotalSar,
      addLine,
      updateQty,
      removeLine,
      clear,
      miniCartOpen,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}
