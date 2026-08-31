"use client";

import React, { useState, useEffect } from "react";
import { getAdminAllProducts } from "@/lib/kizfarm/supabase-data";
import { deleteAdminProduct } from "@/lib/kizfarm/supabase-mutations";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  images: string[];
  createdAt: string;
  farmerId?: {
    fullName: string;
    farmName: string;
  };
  userId?: {
    name: string;
    email: string;
  };
}

type Props = { hideSidebar?: boolean };

export default function AllProductsListPage({ hideSidebar = false }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");

  const fetchProducts = async (search?: string) => {
    try {
      setLoading(true);
      const { res, payload } = await getAdminAllProducts({ search });
      if (res.ok) {
        setProducts(payload.products || []);
        setTotal(payload.total || 0);
      }
    } catch (err) {
      console.error("Fetch products failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchProducts());
  }, []);

  const handleDelete = async (product: Product) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${product.name}"? All associated reviews will also be removed. This cannot be undone.`
      )
    )
      return;
    try {
      const { res, payload } = await deleteAdminProduct(product._id);
      if (res.ok) {
        fetchProducts(searchQ || undefined);
      } else {
        alert(payload?.error || "Failed to delete product");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.farmerId?.farmName?.toLowerCase().includes(q) ||
      p.userId?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="bg-background text-on-background antialiased overflow-x-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Main Content Area */}
      <main className={`${hideSidebar ? "pt-16 min-h-screen" : "min-h-screen"}`}>
        <div className="p-margin max-w-container-max mx-auto">
          {/* Breadcrumbs & Header Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <nav className="flex items-center gap-2 mb-2">
                <span className="text-slate-400 font-label-sm">Marketplace</span>
                <span
                  className="material-symbols-outlined text-slate-300 text-sm"
                  data-icon="chevron_right"
                >
                  chevron_right
                </span>
                <span className="text-emerald-800 font-label-sm">All Products</span>
              </nav>
              <h2 className="font-h1 text-on-background">Inventory Management</h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant text-primary rounded-lg font-label-md hover:bg-slate-50 transition-colors">
                <span
                  className="material-symbols-outlined text-lg"
                  data-icon="file_download"
                >
                  file_download
                </span>
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
            <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-label-sm">Total Listings</span>
                <span
                  className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg material-symbols-outlined text-lg"
                  data-icon="inventory_2"
                >
                  inventory_2
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-h2 text-slate-900">{total}</span>
                <span className="text-emerald-600 text-xs font-label-sm mb-1">
                  Platform-wide
                </span>
              </div>
            </div>
            <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-label-sm">Showing</span>
                <span
                  className="p-1.5 bg-blue-50 text-blue-700 rounded-lg material-symbols-outlined text-lg"
                  data-icon="view_list"
                >
                  view_list
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-h2 text-slate-900">
                  {filteredProducts.length}
                </span>
              </div>
            </div>
            <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-label-sm">Out of Stock</span>
                <span
                  className="p-1.5 bg-red-50 text-red-700 rounded-lg material-symbols-outlined text-lg"
                  data-icon="warning"
                >
                  warning
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-h2 text-slate-900">
                  {filteredProducts.filter((p) => (p.quantity || 0) <= 0).length}
                </span>
                <span className="text-red-600 text-xs font-label-sm mb-1">
                  Need Attention
                </span>
              </div>
            </div>
          </div>

          {/* Table Controls */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  All Products{" "}
                  <span className="text-slate-400 font-normal">
                    ({filteredProducts.length})
                  </span>
                </span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  search
                </span>
                <input
                  className="pl-9 pr-4 py-1.5 border border-outline-variant rounded-lg text-sm bg-white focus:ring-emerald-500 outline-none w-64"
                  placeholder="Search products..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
              </div>
            </div>

            {/* Product Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <span className="material-symbols-outlined animate-spin mr-2">
                    autorenew
                  </span>
                  Loading products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-3">
                    inventory_2
                  </span>
                  <p className="text-sm font-medium">No products found</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-4 font-label-sm text-slate-500 uppercase tracking-wider">
                        Product Info
                      </th>
                      <th className="px-6 py-4 font-label-sm text-slate-500 uppercase tracking-wider">
                        Farmer
                      </th>
                      <th className="px-6 py-4 font-label-sm text-slate-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 font-label-sm text-slate-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-4 font-label-sm text-slate-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-4 font-label-sm text-slate-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((product) => (
                      <tr
                        key={product._id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                              {product.images?.[0] ? (
                                <img
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  src={product.images[0]}
                                />
                              ) : (
                                <span className="material-symbols-outlined text-slate-400 text-lg">
                                  inventory_2
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-label-md text-slate-900">
                                {product.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                ID: {product._id.slice(-8).toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-body-sm text-slate-700">
                              {product.farmerId?.farmName || product.userId?.name || "—"}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {product.farmerId?.fullName || product.userId?.email || ""}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                            {product.category || "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-numeric font-medium text-slate-900">
                            ₦{product.price?.toLocaleString()}{" "}
                            {product.unit ? `/ ${product.unit}` : ""}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {(product.quantity ?? 0) <= 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              {product.quantity} {product.unit || "units"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDelete(product)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Footer */}
            {!loading && filteredProducts.length > 0 && (
              <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-slate-50/30">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900">
                    {filteredProducts.length}
                  </span>{" "}
                  of <span className="font-medium text-slate-900">{total}</span>{" "}
                  results
                </p>
                <button
                  onClick={() => fetchProducts(searchQ || undefined)}
                  className="text-sm text-primary hover:text-emerald-900 font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
