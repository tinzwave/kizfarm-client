"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { getFarmerProductById } from "@/lib/kizfarm/supabase-data";
import { updateFarmerProduct } from "@/lib/kizfarm/supabase-mutations";

type Product = Record<string, any>;

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function getImages(p: Product): string[] {
  const candidates = [
    p?.images,
    p?.imageUrls,
    p?.photos,
    p?.photoUrls,
    p?.gallery,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.every((x) => typeof x === "string")) return c;
  }
  return [];
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function fieldValue(product: Product | null, ...keys: string[]) {
  for (const key of keys) {
    const value = product?.[key];
    if (value === null || value === undefined) continue;
    return String(value);
  }
  return "";
}

export default function FarmerProductDetailPage({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    unit: "",
    quantity: "",
    moistureCode: "",
  });

  const images = useMemo(() => (product ? getImages(product) : []), [product]);

  const syncForm = (nextProduct: Product | null) => {
    setForm({
      name: fieldValue(nextProduct, "name", "title"),
      description: fieldValue(nextProduct, "description"),
      category: fieldValue(nextProduct, "category"),
      price: onlyDigits(fieldValue(nextProduct, "price", "amount")),
      unit: fieldValue(nextProduct, "unit"),
      quantity: onlyDigits(fieldValue(nextProduct, "quantity")),
      moistureCode: fieldValue(nextProduct, "moistureCode"),
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSaveError(null);
      setIsEditing(false);
      const { res, payload } = await getFarmerProductById(id);
      if (cancelled) return;
      if (!res.ok) {
        setError(payload?.error || "Failed to load product");
        setProduct(null);
        syncForm(null);
        setLoading(false);
        return;
      }
      const p = payload.product;
      setProduct(p || null);
      syncForm(p || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const name =
    firstString(product?.name) || firstString(product?.title) || "Product";
  const description = firstString(product?.description);
  const price = product?.price ?? product?.amount ?? null;
  const canSave =
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.price.trim().length > 0;

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const cancelEdit = () => {
    syncForm(product);
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setSaveError(null);

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      unit: form.unit.trim(),
      quantity: form.quantity.trim() ? Number(form.quantity) : undefined,
      moistureCode: form.moistureCode.trim(),
    };

    const { res, payload } = await updateFarmerProduct(id, body);

    if (!res.ok) {
      setSaveError(payload?.error || "Failed to update product");
      setSaving(false);
      return;
    }

    const updated = payload.product || { ...product, ...body };
    setProduct(updated);
    syncForm(updated);
    setIsEditing(false);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 h-16 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Link
            href="/farmer/products"
            className="p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900"
            aria-label="Back to products"
          >
            <span className="material-symbols-outlined text-[#1B6D24]">
              arrow_back
            </span>
          </Link>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {product ? (
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-[#1B6D24] text-white text-sm font-semibold hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit
            </button>
          ) : null}
          <Link
            href="/farmer/products/add-product"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-[#1B6D24] text-[#1B6D24] text-sm font-semibold hover:bg-green-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New
          </Link>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto w-full p-4 md:p-8">
        {loading ? (
          <div className="py-16 text-center text-zinc-500">Loading...</div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="text-red-600 font-medium">{error}</div>
          </div>
        ) : !product ? (
          <div className="py-16 text-center text-zinc-500">
            Product not found.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 space-y-3">
              <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                {images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[0]}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <span className="material-symbols-outlined text-[34px]">
                      image
                    </span>
                  </div>
                )}
              </div>
              {images.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {images.slice(0, 8).map((src) => (
                    <div
                      key={src}
                      className="aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    {saveError ? (
                      <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                        {saveError}
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      <label className="text-sm font-semibold">Product name *</label>
                      <input
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold">Description *</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => updateForm("description", e.target.value)}
                        className="w-full min-h-28 p-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Price (&#8358;) *</label>
                        <input
                          value={form.price}
                          onChange={(e) => updateForm("price", onlyDigits(e.target.value))}
                          className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                          placeholder="e.g., 2500"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Category</label>
                        <input
                          value={form.category}
                          onChange={(e) => updateForm("category", e.target.value)}
                          className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Unit</label>
                        <input
                          value={form.unit}
                          onChange={(e) => updateForm("unit", e.target.value)}
                          className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                          placeholder="e.g., per bag / per kg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold">Quantity</label>
                        <input
                          value={form.quantity}
                          onChange={(e) => updateForm("quantity", onlyDigits(e.target.value))}
                          className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold">Moisture code</label>
                      <input
                        value={form.moistureCode}
                        onChange={(e) => updateForm("moistureCode", e.target.value)}
                        className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-5 h-11 rounded-lg border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!canSave || saving}
                        className="px-6 h-11 rounded-lg bg-[#1B6D24] text-white font-semibold hover:opacity-90 disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {name}
                    </div>
                    {price != null ? (
                      <div className="mt-2 text-xl font-black text-[#1B6D24]">
                        &#8358;{String(price)}
                      </div>
                    ) : null}
                    {description ? (
                      <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {description}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-zinc-400">
                        No description provided.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
                <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                  Product details
                </div>
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {Object.entries(product)
                    .filter(([k, v]) => {
                      if (
                        k === "images" ||
                        k === "imageUrls" ||
                        k === "photos" ||
                        k === "photoUrls"
                      )
                        return false;
                      if (typeof v === "object") return false;
                      return (
                        typeof v === "string" ||
                        typeof v === "number" ||
                        typeof v === "boolean"
                      );
                    })
                    .slice(0, 10)
                    .map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
                        <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
                          {k}
                        </dt>
                        <dd className="mt-1 font-medium text-zinc-800 dark:text-zinc-100">
                          {String(v)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>

              <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
                <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                  Orders & reviews (next phase)
                </div>
                <div className="mt-2 text-sm text-zinc-500">
                  We will connect orders/reviews APIs next. This section is a
                  placeholder.
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
