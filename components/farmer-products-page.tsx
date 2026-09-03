"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { getFarmerProducts } from "@/lib/kizfarm/supabase-data";
import { setProductActive } from "@/lib/kizfarm/supabase-mutations";

type FarmerProduct = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number | string;
  quantity?: number | string | null;
  unit?: string;
  images?: string[];
  imageUrls?: string[];
  isActive?: boolean;
  createdAt?: string;
};

function productId(p: FarmerProduct) {
  return p.id || p._id || "";
}

function productName(p: FarmerProduct) {
  return p.name || p.title || "Untitled product";
}

function productImages(p: FarmerProduct) {
  return p.images || p.imageUrls || [];
}

export default function FarmerProductsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<FarmerProduct[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<FarmerProduct | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const total = useMemo(() => products.length, [products.length]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    const { res, payload } = await getFarmerProducts();
    if (!res.ok) {
      setError(payload?.error || "Failed to load products");
      setProducts([]);
      setLoading(false);
      return;
    }
    setProducts(payload.products || []);
    setLoading(false);
  };

  useEffect(() => {
    void Promise.resolve().then(() => loadProducts());
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const applyStatusChange = async (p: FarmerProduct, nextActive: boolean) => {
    const id = productId(p);
    if (!id) return;
    setUpdatingId(id);
    try {
      const { res, payload } = await setProductActive(id, nextActive);
      if (res.ok) {
        setProducts((prev) => prev.map((item) => (productId(item) === id ? { ...item, isActive: nextActive } : item)));
        setSuccessMessage(nextActive ? `"${productName(p)}" is active again.` : `"${productName(p)}" has been deactivated.`);
      } else {
        alert(payload?.error || "Failed to update product");
      }
    } finally {
      setUpdatingId(null);
      setConfirmTarget(null);
    }
  };

  const handleActivate = (p: FarmerProduct) => applyStatusChange(p, true);
  const handleDeactivateClick = (p: FarmerProduct) => setConfirmTarget(p);
  const handleConfirmDeactivate = () => {
    if (confirmTarget) applyStatusChange(confirmTarget, false);
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 h-16 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold text-[#1B6D24]">
            Products
          </h1>
          <span className="text-xs text-zinc-500">({total})</span>
        </div>
        <Link
          href="/farmer/products/add-product"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-[#1B6D24] text-white text-sm font-semibold hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add product
        </Link>
      </header>

      {successMessage && (
        <div className="mx-4 md:mx-8 mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          {successMessage}
        </div>
      )}

      <main className="max-w-[1440px] mx-auto w-full p-4 md:p-8">
        {loading ? (
          <div className="py-16 text-center text-zinc-500">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="text-red-600 font-medium">{error}</div>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-zinc-700 font-medium">No products yet</div>
            <div className="text-sm text-zinc-500 mt-1">
              Add your first product to start selling.
            </div>
            <Link
              href="/farmer/products/add-product"
              className="inline-flex mt-6 items-center gap-2 px-5 h-11 rounded-lg border border-[#1B6D24] text-[#1B6D24] font-semibold hover:bg-green-50"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {products.map((p) => {
              const id = productId(p);
              const name = productName(p);
              const img = productImages(p)?.[0];
              const isActive = p.isActive ?? true;
              return (
                <div
                  key={id || name}
                  className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <Link href={id ? `/farmer/products/${id}` : "/farmer/products"}>
                    <div className={`aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 overflow-hidden ${isActive ? "" : "opacity-50 grayscale"}`}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <span className="material-symbols-outlined text-[28px]">
                            image
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {name}
                        </div>
                        <span
                          className={`text-[11px] px-2 py-1 rounded-full shrink-0 ${
                            isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {p.description ? (
                        <div className="text-sm text-zinc-500 line-clamp-2">
                          {p.description}
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-400">
                          No description
                        </div>
                      )}
                      {p.price != null ? (
                        <div className="pt-2 font-bold text-[#1B6D24]">
                          ₦{String(p.price)}
                        </div>
                      ) : null}
                      <div className="text-xs font-semibold text-zinc-500">
                        Stock: {p.quantity === null || p.quantity === undefined ? "Not set" : `${p.quantity}${p.unit ? ` ${p.unit}` : ""}`}
                      </div>
                    </div>
                  </Link>
                  <div className="px-4 pb-4">
                    {isActive ? (
                      <button
                        onClick={() => handleDeactivateClick(p)}
                        disabled={updatingId === id}
                        className="w-full h-9 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">visibility_off</span>
                        {updatingId === id ? "Updating…" : "Deactivate"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(p)}
                        disabled={updatingId === id}
                        className="w-full h-9 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border border-[#1B6D24] text-[#1B6D24] hover:bg-green-50 flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        {updatingId === id ? "Updating…" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <span className="material-symbols-outlined text-red-600">visibility_off</span>
              </div>
              <h3 className="text-base font-bold text-zinc-900">Deactivate product?</h3>
            </div>
            <p className="text-sm text-zinc-600 mb-6">
              Buyers won&apos;t see &quot;{productName(confirmTarget)}&quot; in the marketplace anymore. You can
              reactivate it any time from this page.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 h-10 rounded-lg text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeactivate}
                disabled={updatingId === productId(confirmTarget)}
                className="flex-1 h-10 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {updatingId === productId(confirmTarget) ? "Deactivating…" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
