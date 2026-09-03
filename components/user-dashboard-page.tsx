"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useCart } from "@/lib/kizfarm/cart-context";
import { getBuyerDashboard, getFarmerStatus } from "@/lib/kizfarm/supabase-data";

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  unit?: string;
  category?: string;
  images?: string[];
  farmerId?: { _id?: string; farmName?: string; location?: string };
}

interface Order {
  _id: string;
  masterOrderId?: string;
  status: string;
  total: number;
  items: { name: string; quantity: number; image?: string }[];
  farmerId?: { farmName?: string; location?: string };
}

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  coverImage?: string;
  tutor?: { name: string; imageUrl?: string };
}

interface BuyerDashboard {
  products: Product[];
  recentOrders: Order[];
  courses: Course[];
  stats: {
    totalOrders: number;
    cartItems: number;
    availableProducts: number;
  };
}

interface FarmerStatus {
  _id: string;
  status?: string;
}

const money = (value = 0) => `NGN ${Number(value).toLocaleString()}`;

export default function UserDashboardPage() {
  const { addItem, isInCart, totalItems } = useCart();
  const [data, setData] = useState<BuyerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [farmer, setFarmer] = useState<FarmerStatus | null>(null);
  const [farmerStatusLoaded, setFarmerStatusLoaded] = useState(false);

  useEffect(() => {
    async function loadFarmerStatus() {
      try {
        const { res, payload } = await getFarmerStatus();
        if (res.ok) setFarmer(payload?.farmer ?? null);
      } finally {
        setFarmerStatusLoaded(true);
      }
    }
    loadFarmerStatus();
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const { res, payload } = await getBuyerDashboard();
        if (!res.ok) {
          setError(payload?.error || "Could not load buyer dashboard.");
          return;
        }
        setData(payload as BuyerDashboard);
      } catch {
        setError("Could not connect to the backend.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  function addProduct(product: Product) {
    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      maxQuantity: product.quantity,
      unit: product.unit,
      farmerId: product.farmerId?._id,
      farmerName: product.farmerId?.farmName,
    });
  }

  const isApprovedFarmer = farmer?.status === "approved";
  const hasFarmerApplication = !!farmer;
  const showBecomeFarmer = farmerStatusLoaded && !hasFarmerApplication;

  return (
    <div className="bg-white text-on-surface font-body-md">
      <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto z-50 sticky top-0">
        <div className="flex items-center gap-4">
          <img className="h-10 w-auto object-contain" alt="KIZ FARM" src="/logo.jpeg" />
        </div>
        <div className="flex items-center gap-4">
          {showBecomeFarmer && (
            <Link href="/farmer/become" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-[#1B6D24] hover:bg-green-800 transition-all">
              <span className="material-symbols-outlined text-lg">agriculture</span>
              Become a Farmer
            </Link>
          )}
          {hasFarmerApplication && farmer?.status === "pending" && (
            <Link href="/farmer/verify" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all">
              <span className="material-symbols-outlined text-lg">hourglass_top</span>
              Awaiting Admin Approval
            </Link>
          )}
          {hasFarmerApplication && (farmer?.status === "draft" || farmer?.status === "rejected") && (
            <Link href="/farmer/verify" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all">
              <span className="material-symbols-outlined text-lg">verified</span>
              Farmer Verification
            </Link>
          )}
          {isApprovedFarmer && (
            <Link href="/farmer/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-[#1B6D24] bg-green-50 border border-green-200 hover:bg-green-100 transition-all">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              Approved
            </Link>
          )}
          <Link href="/buyer/cart" className="relative rounded-full p-2 hover:bg-gray-50">
            <span className="material-symbols-outlined text-gray-600">shopping_cart</span>
            {totalItems > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#1B6D24] px-1.5 text-xs font-bold text-white">{totalItems}</span>}
          </Link>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 pb-24 md:pb-12">
        <section className="mt-8 mb-lg">
          <div className="relative min-h-[320px] rounded-3xl overflow-hidden bg-[#1B6D24]">
            <img className="absolute inset-0 h-full w-full object-cover opacity-35" alt="Farm produce" src={data?.products?.[0]?.images?.[0] || "/placeholder.jpg"} />
            <div className="relative z-10 flex min-h-[320px] flex-col justify-center px-8 md:px-16 text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-3">Welcome back</h1>
              <p className="max-w-xl text-white/90">Shop real products from verified farmers and track your recent purchases in one place.</p>
              <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/15 p-4"><p className="text-2xl font-bold">{loading ? "-" : data?.stats.availableProducts ?? 0}</p><p className="text-xs">Products</p></div>
                <div className="rounded-xl bg-white/15 p-4"><p className="text-2xl font-bold">{loading ? "-" : data?.stats.totalOrders ?? 0}</p><p className="text-xs">Orders</p></div>
                <div className="rounded-xl bg-white/15 p-4"><p className="text-2xl font-bold">{totalItems}</p><p className="text-xs">In cart</p></div>
              </div>
            </div>
          </div>
        </section>

        {showBecomeFarmer && (
          <div className="mb-6 bg-white border border-green-100 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div>
              <h2 className="text-xl font-bold mb-1 text-slate-900">Sell your farm products on KIZ FARM</h2>
              <p className="text-slate-600 text-sm">Register as a farmer to create listings, receive orders, and manage payouts from the farmer portal.</p>
            </div>
            <Link href="/farmer/become" className="px-6 py-3 bg-[#1B6D24] text-white hover:bg-green-800 transition-all font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 shadow-sm active:scale-95">
              Become a Farmer
              <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            </Link>
          </div>
        )}

        {hasFarmerApplication && farmer?.status === "pending" && (
          <div className="mb-6 bg-amber-50 border border-amber-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1 text-amber-950">Awaiting admin approval</h2>
              <p className="text-amber-800 text-sm">Your farmer application has been submitted. Our admin team will review it and get back to you.</p>
            </div>
            <Link href="/farmer/verify" className="px-6 py-3 bg-amber-600 text-white hover:bg-amber-700 transition-all font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 active:scale-95">
              View Application
              <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            </Link>
          </div>
        )}

        {hasFarmerApplication && (farmer?.status === "draft" || farmer?.status === "rejected") && (
          <div className="mb-6 bg-amber-50 border border-amber-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1 text-amber-950">
                {farmer?.status === "rejected" ? "Farmer application needs changes" : "Farmer application in progress"}
              </h2>
              <p className="text-amber-800 text-sm">
                {farmer?.status === "rejected"
                  ? "Your application was rejected -- review the reason and resubmit."
                  : "Continue verification so your farmer portal can be activated."}
              </p>
            </div>
            <Link href="/farmer/verify" className="px-6 py-3 bg-amber-600 text-white hover:bg-amber-700 transition-all font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 active:scale-95">
              Continue Verification
              <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            </Link>
          </div>
        )}

        {isApprovedFarmer && (
          <div className="mb-6 bg-gradient-to-r from-emerald-600 to-green-700 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg border border-emerald-500/20">
            <div>
              <h2 className="text-xl font-bold mb-1">Farmer Portal Connected</h2>
              <p className="text-white/80 text-sm">You are logged in as a verified farmer. Manage your crops, listings, and payouts here.</p>
            </div>
            <Link href="/farmer/dashboard" className="px-6 py-3 bg-white text-[#1B6D24] hover:bg-slate-100 transition-all font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 shadow-sm active:scale-95">
              <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
              Approved -- Go to Farmer Dashboard
            </Link>
          </div>
        )}

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mb-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/buyer/marketplace" className="flex items-center justify-between p-6 bg-white border border-outline-variant rounded-2xl hover:bg-gray-50 hover:shadow-md">
              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-[#1B6D24]"><span className="material-symbols-outlined text-3xl">storefront</span></div><span className="font-headline-md">Browse Products</span></div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </Link>
            <Link href="/buyer/orders" className="flex items-center justify-between p-6 bg-white border border-outline-variant rounded-2xl hover:bg-gray-50 hover:shadow-md">
              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-[#1B6D24]"><span className="material-symbols-outlined text-3xl">receipt_long</span></div><span className="font-headline-md">View Orders</span></div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </Link>
            <Link href="/buyer/wishlist" className="flex items-center justify-between p-6 bg-white border border-outline-variant rounded-2xl hover:bg-gray-50 hover:shadow-md">
              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-[#1B6D24]"><span className="material-symbols-outlined text-3xl">favorite</span></div><span className="font-headline-md">Wishlist</span></div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </Link>
          </div>
        </section>

        <section className="mb-lg">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="font-headline-lg text-on-surface">Fresh Products</h2>
              <p className="text-on-surface-variant font-body-md">Real products currently listed on KIZ FARM</p>
            </div>
            <Link className="text-primary font-semibold flex items-center gap-2 hover:underline" href="/buyer/marketplace">
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(data?.products ?? []).map((product) => (
              <div key={product._id} className="group bg-white border border-outline-variant rounded-2xl overflow-hidden hover:shadow-xl transition-all">
                <Link href={`/buyer/marketplace-detail/${product._id}`} className="block relative h-48 overflow-hidden">
                  <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={product.name} src={product.images?.[0] || "/placeholder.jpg"} />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-label-xs text-primary">{product.quantity && product.quantity <= 0 ? "Out of stock" : "In Stock"}</span>
                </Link>
                <div className="p-4">
                  <h3 className="font-headline-md mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-label-sm text-on-surface-variant mb-3 line-clamp-1">{product.farmerId?.farmName || product.category || "Farm product"} · {product.unit || "unit"}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-headline-md font-bold text-on-surface">{money(product.price)}</span>
                    <button onClick={() => addProduct(product)} className="bg-[#1B6D24] text-white p-2 rounded-xl active:scale-95 transition-transform" title={isInCart(product._id) ? "Add another" : "Add to cart"}>
                      <span className="material-symbols-outlined">{isInCart(product._id) ? "check" : "add_shopping_cart"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && (data?.products ?? []).length === 0 && (
              <div className="lg:col-span-4 rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-slate-500">No products available yet.</div>
            )}
          </div>
        </section>

        <section className="mb-lg">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="font-headline-lg text-on-surface">Courses for You</h2>
              <p className="text-on-surface-variant font-body-md">Practical training from KIZ FARM&apos;s learning hub</p>
            </div>
            <Link className="text-primary font-semibold flex items-center gap-2 hover:underline" href="/learning">
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(data?.courses ?? []).map((course) => (
              <Link key={course._id} href="/learning" className="group bg-white border border-outline-variant rounded-2xl overflow-hidden hover:shadow-xl transition-all">
                <div className="h-32 overflow-hidden relative bg-gradient-to-br from-emerald-900 to-green-700 flex items-center justify-center">
                  {course.coverImage ? (
                    <img
                      src={course.coverImage}
                      alt={course.title}
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-white/30 text-[40px]">school</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-headline-md mb-1 line-clamp-1">{course.title}</h3>
                  <p className="text-label-sm text-on-surface-variant mb-3 line-clamp-2">{course.description}</p>
                  <span className="text-headline-md font-bold text-on-surface">{money(course.price)}</span>
                </div>
              </Link>
            ))}
            {!loading && (data?.courses ?? []).length === 0 && (
              <div className="lg:col-span-4 rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-slate-500">No courses available yet.</div>
            )}
          </div>
        </section>

        <section className="mb-lg">
          <h2 className="font-headline-md text-on-surface mb-6">Recent Orders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.recentOrders ?? []).map((order) => (
              <Link key={order._id} href="/buyer/orders" className="rounded-xl border border-outline-variant p-4 hover:bg-slate-50">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-bold">{order.masterOrderId || order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-slate-500">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#1B6D24]">{money(order.total)}</p>
                    <p className="text-xs capitalize text-slate-500">{order.status.replaceAll("_", " ")}</p>
                  </div>
                </div>
              </Link>
            ))}
            {!loading && (data?.recentOrders ?? []).length === 0 && (
              <div className="md:col-span-2 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-slate-500">No orders yet.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
