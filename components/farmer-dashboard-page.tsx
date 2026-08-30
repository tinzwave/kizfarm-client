"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getFarmerDashboard } from "@/lib/kizfarm/supabase-data";

interface Product {
  _id: string;
  name: string;
  price: number;
  quantity?: number;
  unit?: string;
  images?: string[];
  category?: string;
}

interface Order {
  _id: string;
  masterOrderId?: string;
  status: string;
  total: number;
  items: { name: string; quantity: number; image?: string }[];
  buyerId?: { name?: string; email?: string };
}

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  coverImage?: string;
}

interface FarmerDashboard {
  farmer?: { farmName?: string; fullName?: string; location?: string };
  stats: {
    totalSales: number;
    totalOrders: number;
    activeProducts: number;
    activeOrders: number;
    deliveredOrders: number;
  };
  products: Product[];
  recentOrders: Order[];
  courses: Course[];
}

const money = (value = 0) => `NGN ${Number(value).toLocaleString()}`;

function statusClass(status: string) {
  if (["delivered", "receipt_confirmed"].includes(status)) return "bg-green-100 text-green-800";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (["assigned", "in_transit"].includes(status)) return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

export default function FarmerDashboardPage() {
  const [data, setData] = useState<FarmerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const { res, payload } = await getFarmerDashboard();
        if (!res.ok) {
          setError(payload?.error || "Could not load farmer dashboard.");
          return;
        }
        setData(payload as FarmerDashboard);
      } catch {
        setError("Could not connect to the backend.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const farmName = data?.farmer?.farmName || data?.farmer?.fullName || "Your Farm";
  const cards = [
    { label: "Total Sales", value: money(data?.stats.totalSales || 0), icon: "payments" },
    { label: "Total Orders", value: data?.stats.totalOrders ?? 0, icon: "shopping_basket" },
    { label: "Active Products", value: data?.stats.activeProducts ?? 0, icon: "potted_plant" },
    { label: "Active Orders", value: data?.stats.activeOrders ?? 0, icon: "local_shipping" },
  ];

  return (
    <div className="bg-background text-on-background font-body-md">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-16 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <img alt="KIZ FARM" className="h-10 w-auto object-contain" src="/logo.jpeg" />
        </div>
        <div className="hidden md:flex gap-6">
          <Link className="text-[#1B6D24] font-bold text-sm" href="/farmer/dashboard">Dashboard</Link>
          <Link className="text-zinc-600 text-sm font-medium" href="/farmer/products">Products</Link>
          <Link className="text-zinc-600 text-sm font-medium" href="/farmer/orders">Orders</Link>
          <Link className="text-zinc-600 text-sm font-medium" href="/learning">Learning</Link>
        </div>
      </header>

      <main className="p-4 md:p-8 space-y-8 max-w-[1440px] mx-auto w-full">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-headline-lg font-headline-lg text-on-surface">{loading ? "Farm Overview" : farmName}</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">
              {data?.farmer?.location ? `${data.farmer.location} · ` : ""}Live sales, products, and order activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/farmer/orders" className="flex items-center gap-2 px-5 h-[48px] border border-[#1B6D24] text-[#1B6D24] rounded-lg font-label-sm hover:bg-zinc-50">
              <span className="material-symbols-outlined">receipt_long</span>
              View Orders
            </Link>
            <Link href="/farmer/add-product" className="flex items-center gap-2 px-5 h-[48px] bg-[#1B6D24] text-white rounded-lg font-label-sm hover:opacity-90">
              <span className="material-symbols-outlined">add</span>
              Add Product
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {cards.map((card) => (
            <div key={card.label} className="bg-white p-6 rounded-xl border border-zinc-200">
              <div className="p-3 bg-green-50 rounded-lg text-primary w-fit mb-4">
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <p className="text-label-xs font-label-xs text-on-surface-variant mb-1">{card.label}</p>
              <p className="text-headline-md font-headline-md">{loading ? "-" : card.value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="p-6 flex justify-between items-center">
              <div>
                <h3 className="text-headline-md font-headline-md">Recent Orders</h3>
                <p className="text-sm text-on-surface-variant">Latest buyer orders for your farm</p>
              </div>
              <Link href="/farmer/orders" className="text-[#1B6D24] font-label-sm hover:underline">See all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-y border-zinc-100">
                    <th className="px-6 py-4 text-label-xs text-on-surface-variant uppercase">Order</th>
                    <th className="px-6 py-4 text-label-xs text-on-surface-variant uppercase">Customer</th>
                    <th className="px-6 py-4 text-label-xs text-on-surface-variant uppercase">Items</th>
                    <th className="px-6 py-4 text-label-xs text-on-surface-variant uppercase">Status</th>
                    <th className="px-6 py-4 text-label-xs text-on-surface-variant uppercase text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(data?.recentOrders ?? []).map((order) => (
                    <tr key={order._id} className="hover:bg-zinc-50/50">
                      <td className="px-6 py-4 text-label-sm font-semibold">{order.masterOrderId || order._id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-4 text-label-sm">{order.buyerId?.name || order.buyerId?.email || "Buyer"}</td>
                      <td className="px-6 py-4 text-label-sm text-on-surface-variant">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</td>
                      <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(order.status)}`}>{order.status.replaceAll("_", " ")}</span></td>
                      <td className="px-6 py-4 font-bold text-right">{money(order.total)}</td>
                    </tr>
                  ))}
                  {!loading && (data?.recentOrders ?? []).length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">No orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-primary text-white p-6 rounded-xl">
            <span className="material-symbols-outlined text-5xl">verified</span>
            <h3 className="mt-4 text-xl font-bold">Fulfillment Progress</h3>
            <p className="mt-2 text-white/80 text-sm">Delivered orders are counted from real order statuses.</p>
            <div className="mt-6 flex justify-between border-t border-white/20 pt-4">
              <span>Delivered</span>
              <span className="font-bold">{loading ? "-" : data?.stats.deliveredOrders ?? 0}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex justify-between items-end mb-5">
            <div>
              <h3 className="text-headline-md font-headline-md">Your Latest Products</h3>
              <p className="text-sm text-on-surface-variant">Pulled from your product inventory</p>
            </div>
            <Link href="/farmer/products" className="text-[#1B6D24] font-label-sm hover:underline">Manage</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.products ?? []).map((product) => (
              <article key={product._id} className="rounded-xl border border-zinc-100 overflow-hidden">
                <img src={product.images?.[0] || "/placeholder.jpg"} alt={product.name} className="h-40 w-full object-cover" />
                <div className="p-4">
                  <h4 className="font-bold line-clamp-1">{product.name}</h4>
                  <p className="text-sm text-on-surface-variant">{product.quantity ?? 0} {product.unit || "units"} available</p>
                  <p className="mt-2 font-bold text-[#1B6D24]">{money(product.price)}</p>
                </div>
              </article>
            ))}
            {!loading && (data?.products ?? []).length === 0 && (
              <div className="lg:col-span-3 rounded-lg border border-dashed border-zinc-200 p-8 text-center text-sm text-slate-500">No products added yet.</div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex justify-between items-end mb-5">
            <div>
              <h3 className="text-headline-md font-headline-md">Courses for You</h3>
              <p className="text-sm text-on-surface-variant">Practical training from KIZ FARM's learning hub</p>
            </div>
            <Link href="/learning" className="text-[#1B6D24] font-label-sm hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.courses ?? []).map((course) => (
              <Link key={course._id} href="/learning" className="rounded-xl border border-zinc-100 overflow-hidden block group">
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
                  <h4 className="font-bold line-clamp-1">{course.title}</h4>
                  <p className="text-sm text-on-surface-variant line-clamp-2">{course.description}</p>
                  <p className="mt-2 font-bold text-[#1B6D24]">{money(course.price)}</p>
                </div>
              </Link>
            ))}
            {!loading && (data?.courses ?? []).length === 0 && (
              <div className="lg:col-span-3 rounded-lg border border-dashed border-zinc-200 p-8 text-center text-sm text-slate-500">No courses available yet.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
