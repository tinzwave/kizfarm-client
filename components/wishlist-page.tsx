"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWishlist } from "@/lib/kizfarm/supabase-data";
import { removeFromWishlist } from "@/lib/kizfarm/supabase-mutations";
import { useCart } from "@/lib/kizfarm/cart-context";

interface WishlistProduct {
  _id: string;
  name: string;
  price: number;
  unit?: string;
  quantity?: number;
  images?: string[];
  farmerId?: { farmName?: string } | null;
}

interface WishlistItem {
  wishlistId: string;
  addedAt: string;
  product: WishlistProduct;
}

export default function WishlistPage() {
  const { addItem } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const { res, payload } = await getWishlist();
      if (res.ok) {
        setItems((payload.items as WishlistItem[]) || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchWishlist());
  }, []);

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try {
      const { res } = await removeFromWishlist(productId);
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.product._id !== productId));
      }
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItem({
      productId: item.product._id,
      name: item.product.name,
      price: item.product.price,
      unit: item.product.unit,
      maxQuantity: item.product.quantity,
      image: item.product.images?.[0],
      farmerName: item.product.farmerId?.farmName,
    });
  };

  return (
    <>
      {/* TopAppBar */}
      <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-50 w-full">
        <div className="flex justify-between items-center w-full px-6 py-3 h-16 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <img alt="KIZ FARM" className="h-10 w-auto object-contain" src="/logo.jpeg" />
          </div>
        </div>
      </header>

      <main className="flex-grow pt-8 pb-32 px-margin max-w-[1440px] mx-auto w-full">
        {/* Page Header */}
        <div className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-outline text-label-xs font-label-xs mb-2">
              <Link className="hover:text-primary transition-colors" href="/buyer/marketplace">Market</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>Wishlist</span>
            </nav>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">My Wishlist</h1>
            <p className="text-on-surface-variant mt-1 font-body-md text-body-md">
              {loading ? "Loading..." : `You have ${items.length} item${items.length === 1 ? "" : "s"} saved for later`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">autorenew</span>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">favorite_border</span>
            <p className="text-lg font-semibold text-on-surface mb-2">Your wishlist is empty</p>
            <p className="text-sm text-on-surface-variant mb-6">Save products you like from the marketplace to find them here later.</p>
            <Link href="/buyer/marketplace">
              <button className="px-6 py-3 bg-[#1B6D24] text-white rounded-lg font-bold hover:bg-primary transition-colors">
                Browse Marketplace
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {items.map((item) => {
              const outOfStock = (item.product.quantity ?? 0) <= 0;
              return (
                <div key={item.wishlistId} className={`bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-[0_10px_30px_rgba(27,109,36,0.05)] transition-all duration-300 ${outOfStock ? "opacity-75" : ""}`}>
                  <div className="relative h-56 overflow-hidden">
                    <img
                      alt={item.product.name}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${outOfStock ? "grayscale" : ""}`}
                      src={item.product.images?.[0] || "/placeholder-product.png"}
                    />
                    <button
                      onClick={() => handleRemove(item.product._id)}
                      disabled={removingId === item.product._id}
                      className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm text-error flex items-center justify-center hover:bg-error hover:text-white transition-all active:scale-90 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-on-surface px-4 py-2 rounded-lg text-label-sm font-label-sm font-bold">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-md">
                    <h3 className="font-headline-md text-body-lg text-on-surface mb-1">{item.product.name}</h3>
                    <p className="text-on-surface-variant text-label-sm font-label-sm mb-4">
                      {item.product.farmerId?.farmName ? `Sold by ${item.product.farmerId.farmName}` : "KIZ FARM Marketplace"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-headline-md text-primary">
                        ₦{item.product.price.toLocaleString()}
                        {item.product.unit && <span className="text-label-xs font-label-xs text-outline"> / {item.product.unit}</span>}
                      </span>
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={outOfStock}
                        className="h-10 px-4 bg-[#1B6D24] text-white rounded-lg flex items-center gap-2 text-label-xs font-label-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
