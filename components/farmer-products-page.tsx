"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/kizfarm/api";

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
  status?: string;
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

  const total = useMemo(() => products.length, [products.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { res, payload } = await apiFetch("/farmer/products", {
        cache: "no-store",
      });
      if (cancelled) return;
      if (!res.ok) {
        setError(
          typeof payload === "string"
            ? payload
            : payload?.error || "Failed to load products",
        );
        setProducts([]);
        setLoading(false);
        return;
      }
      const list = Array.isArray(payload) ? payload : payload?.products || [];
      setProducts(Array.isArray(list) ? list : []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

      <main className="max-w-[1440px] mx-auto w-full p-4 md:p-8">
        {loading ? (
          <div className="py-16 text-center text-zinc-500">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="text-red-600 font-medium">{error}</div>
            <div className="text-sm text-zinc-500 mt-2">
              Ensure the API endpoint `GET /farmer/products` is available.
            </div>
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
              return (
                <Link
                  key={id || name}
                  href={id ? `/farmer/products/${id}` : "/farmer/products"}
                  className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
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
                      {p.status ? (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300">
                          {p.status}
                        </span>
                      ) : null}
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
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
