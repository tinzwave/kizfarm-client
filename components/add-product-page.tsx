"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createFarmerProduct } from "@/lib/kizfarm/supabase-mutations";

type Props = { hideSidebar?: boolean };

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function AddProductPage({ hideSidebar = false }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [moistureCode, setMoistureCode] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 0 &&
      description.trim().length > 0 &&
      String(price).trim().length > 0
    );
  }, [name, description, price]);

  const onPickImages = (files: FileList | null) => {
    if (!files) return setImages([]);
    setImages(Array.from(files).slice(0, 8));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const { res, payload } = await createFarmerProduct({
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || undefined,
      price: Number(price),
      unit: unit.trim() || undefined,
      quantity: quantity.trim() ? Number(quantity) : undefined,
      moistureCode: moistureCode.trim() || undefined,
      images,
    });

    if (!res.ok) {
      setError(payload?.error || "Failed to create product");
      setSubmitting(false);
      return;
    }

    const id = payload.product?.id || payload.product?._id;
    if (id) router.push(`/farmer/products/${id}`);
    else router.push("/farmer/products");
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 h-16 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[#1B6D24]">
              arrow_back
            </span>
          </button>
          <div className="font-bold text-[#1B6D24]">Add product</div>
        </div>
      </header>

      <main
        className={`${hideSidebar ? "" : ""} max-w-[900px] mx-auto w-full p-4 md:p-8`}
      >
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 md:p-7 space-y-5"
        >
          {error ? (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Product name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                placeholder="e.g., Fresh Tomatoes"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                placeholder="e.g., Vegetables"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-28 p-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
              placeholder="Describe the product, quality, packaging, etc."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Price (₦) *</label>
              <input
                value={price}
                onChange={(e) => setPrice(onlyDigits(e.target.value))}
                className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                placeholder="e.g., 2500"
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">Unit</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                placeholder="e.g., per bag / per kg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">Quantity</label>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                placeholder="e.g., 50"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Moisture code</label>
              <input
                value={moistureCode}
                onChange={(e) => setMoistureCode(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">
                Images (up to 8)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onPickImages(e.target.files)}
                className="w-full text-sm"
              />
              {images.length ? (
                <div className="text-xs text-zinc-500">
                  Selected: {images.length}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/farmer/products")}
              className="px-5 h-11 rounded-lg border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="px-6 h-11 rounded-lg bg-[#1B6D24] text-white font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create product"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
