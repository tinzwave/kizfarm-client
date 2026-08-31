"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxQuantity?: number;
  unit?: string;
  image?: string;
  farmerId?: string;
  farmerName?: string;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "kizfarm_cart";

function clampQuantity(quantity: number, maxQuantity?: number) {
  const normalized = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  return Math.max(
    1,
    maxQuantity ? Math.min(normalized, maxQuantity) : normalized,
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const addItem = useCallback(
    (incoming: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === incoming.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === incoming.productId
              ? {
                  ...i,
                  maxQuantity: incoming.maxQuantity ?? i.maxQuantity,
                  quantity: clampQuantity(
                    i.quantity + (incoming.quantity ?? 1),
                    incoming.maxQuantity ?? i.maxQuantity,
                  ),
                }
              : i,
          );
        }
        return [
          ...prev,
          {
            ...incoming,
            quantity: clampQuantity(
              incoming.quantity ?? 1,
              incoming.maxQuantity,
            ),
          },
        ];
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity: clampQuantity(quantity, i.maxQuantity) }
            : i,
        ),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items],
  );

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}
