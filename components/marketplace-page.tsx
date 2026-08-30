"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMarketplaceProducts } from "@/lib/kizfarm/supabase-data";
import { useCart } from "@/lib/kizfarm/cart-context";

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  farmerId: {
    farmName: string;
    location: string;
  } | null;
  createdAt: string;
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const { totalItems } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const { res, payload } = await getMarketplaceProducts({
          category: selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
          q: searchQuery.trim() || undefined,
        });

        if (!res.ok) {
          setError(payload?.error || "Failed to fetch products");
          setProducts([]);
          return;
        }

        setProducts(payload?.products || []);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    const timeout = window.setTimeout(fetchProducts, searchQuery ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [selectedCategory, searchQuery]);

  const getCategoryLabel = (category?: string) => {
    if (!category) return "General";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getProductImage = (product: Product) => {
    return product.images && product.images.length > 0 
      ? product.images[0]
      : "https://via.placeholder.com/400x300?text=No+Image";
  };

  const getStatusBadge = (product: Product) => {
    if (product.category?.toLowerCase().includes("livestock")) {
      return "Premium";
    }
    return "In Stock";
  };

  const filteredProducts = products;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen pb-24 md:pb-0">
      {/* TopAppBar */}
      <header className="bg-white dark:bg-slate-950 docked full-width top-0 border-b border-gray-200 dark:border-gray-800 flat no shadows sticky z-50">
        <div className="flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4">
            <img alt="KIZ FARM" className="h-10 w-auto object-contain" src="/logo.jpeg" />
          </div>
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input 
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full focus:outline-none focus:border-primary-container font-label-sm" 
                placeholder="Search fresh produce, livestock..." 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/buyer/cart" className="relative p-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center justify-center active:scale-95 duration-150">
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">shopping_cart</span>
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1 -translate-y-1">
                  {totalItems}
                </span>
              )}
            </Link>
            <button className="material-symbols-outlined text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors p-2 rounded-full active:scale-95 duration-150">notifications</button>
            <div className="hidden md:flex gap-6 items-center ml-4">
              <Link href="/buyer/marketplace" className="font-['Inter'] antialiased text-sm font-semibold text-[#1B6D24] px-3 py-1 bg-green-50 rounded-lg">Market</Link>
              <Link href="/buyer/orders" className="font-['Inter'] antialiased text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors px-3 py-1 cursor-pointer">Orders</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-gutter py-md">
        {/* Marketplace Title & Search (Mobile) */}
        <div className="md:hidden mb-6">
          <div className="relative w-full mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input 
              className="w-full pl-10 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:border-primary-container shadow-sm" 
              placeholder="Search market..." 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <h2 className="font-headline-md text-on-surface">Agro Marketplace</h2>
        </div>

        {/* Filters & Sorting Row */}
        <div className="flex flex-col gap-6 mb-lg">
          <div className="flex items-center justify-between overflow-x-auto hide-scrollbar gap-3 py-2">
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedCategory("all")}
                className={`px-6 py-2 rounded-full font-label-sm whitespace-nowrap transition-colors ${
                  selectedCategory === "all"
                    ? "bg-primary-container text-white"
                    : "bg-white border border-outline-variant text-on-surface-variant hover:border-primary-container"
                }`}
              >
                All Products
              </button>
              {["Vegetables", "Fruits", "Grains", "Livestock"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat.toLowerCase())}
                  className={`px-6 py-2 rounded-full font-label-sm whitespace-nowrap transition-colors ${
                    selectedCategory === cat.toLowerCase()
                      ? "bg-primary-container text-white"
                      : "bg-white border border-outline-variant text-on-surface-variant hover:border-primary-container"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg bg-white cursor-pointer">
                <span className="material-symbols-outlined text-sm">sort</span>
                <span className="font-label-sm text-on-surface-variant">Sort: Recommended</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </div>
              <button className="p-2 border border-outline-variant rounded-lg bg-white flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">tune</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-on-surface-variant">Loading products...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-semibold">Error loading products</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">shopping_bag</span>
              <p className="text-on-surface-variant">No products available</p>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
            {filteredProducts.map((product) => (
              <div key={product._id} className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-[0px_10px_30px_rgba(27,109,36,0.05)] transition-all duration-300">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    src={getProductImage(product)} 
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold text-primary uppercase tracking-wider">
                    {getStatusBadge(product)}
                  </div>
                </div>
                <div className="p-md">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-headline-md text-lg text-on-surface line-clamp-2">{product.name}</h3>
                    <span className="font-headline-md text-primary whitespace-nowrap ml-2">₦{product.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-on-surface-variant mb-4">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                    <span className="font-label-sm text-xs line-clamp-1">
                      {product.farmerId?.location || product.farmerId?.farmName || "Unknown Location"}
                    </span>
                  </div>
                  <Link 
                    href={`/buyer/marketplace-detail/${product._id}`} 
                    className="block w-full py-3 border border-primary-container text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors duration-200 text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <Link href="/buyer/cart" className="fixed right-6 bottom-24 md:bottom-12 bg-primary text-white p-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
        <span className="material-symbols-outlined">shopping_cart</span>
        <span className="hidden md:block font-label-sm">View Cart ({totalItems})</span>
      </Link>
    </div>
  );
}
