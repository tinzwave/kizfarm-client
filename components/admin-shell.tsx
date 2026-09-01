"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/kizfarm/supabase-auth";
import { getAdminRecentActivity } from "@/lib/kizfarm/supabase-data";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [recentCount, setRecentCount] = useState(0);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const { res, payload } = await getAdminRecentActivity();
      if (res.ok) {
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const count = (payload.items || []).filter(
          (i: { createdAt: string }) => new Date(i.createdAt).getTime() > dayAgo,
        ).length;
        setRecentCount(count);
      }
    });
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/admin/login");
  };
  return (
    <div
      className="bg-surface-container-lowest text-on-surface"
      style={{ fontFamily: "'Inter', sans-serif", minHeight: "100dvh" }}
    >
      <aside className="fixed left-0 top-0 h-full w-[280px] border-r border-gray-200 bg-white shadow-none flex flex-col py-6 px-4 gap-2 z-50 overflow-y-auto">
        <div className="flex items-center gap-3 px-4 mb-8">
          <img
            alt="KizFarm Logo"
            className="w-10 h-10 object-contain"
            src="/logo.jpeg"
          />
          <h1 className="text-xl font-black tracking-tight text-emerald-900">
            KizFarm
          </h1>
        </div>
        <nav className="flex flex-col gap-1">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-emerald-700 font-semibold bg-emerald-50/50 rounded-lg scale-100 active:scale-[0.98] transition-all duration-200"
          >
            <span className="material-symbols-outlined" data-icon="dashboard">
              dashboard
            </span>
            <span className="font-inter text-sm antialiased">Dashboard</span>
          </Link>

          {/* Order Management */}
          <Link
            href="/admin/order-control"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span
              className="material-symbols-outlined"
              data-icon="receipt_long"
            >
              receipt_long
            </span>
            <span className="font-inter text-sm antialiased">
              Order Control
            </span>
          </Link>

          {/* Driver Management */}
          <Link
            href="/admin/driver-management"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span
              className="material-symbols-outlined"
              data-icon="local_shipping"
            >
              local_shipping
            </span>
            <span className="font-inter text-sm antialiased">
              Driver Management
            </span>
          </Link>

          <Link
            href="/learning/admin"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="school">
              school
            </span>
            <span className="font-inter text-sm antialiased">
              Courses & Tutors
            </span>
          </Link>
          <Link
            href="/admin/blog"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="article">
              article
            </span>
            <span className="font-inter text-sm antialiased">
              Blogs
            </span>
          </Link>

          {/* Notifications */}
          <Link
            href="/admin/notifications"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="notifications">
              notifications
            </span>
            <span className="font-inter text-sm antialiased">
              Notifications
            </span>
          </Link>

          {/* Farmer Management */}
          <Link
            href="/admin/verify-farmers"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="verified">
              verified
            </span>
            <span className="font-inter text-sm antialiased">
              Verify Farmers
            </span>
          </Link>

          {/* Product Management */}
          <Link
            href="/admin/products"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="inventory_2">
              inventory_2
            </span>
            <span className="font-inter text-sm antialiased">Products</span>
          </Link>

          {/* Product Reviews */}
          <Link
            href="/admin/product-review"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="star_rate">
              star_rate
            </span>
            <span className="font-inter text-sm antialiased">
              Product Reviews
            </span>
          </Link>

          {/* Escrow Management */}
          <Link
            href="/admin/escrow"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="security">
              security
            </span>
            <span className="font-inter text-sm antialiased">
              Escrow Management
            </span>
          </Link>

          {/* Refunds */}
          <Link
            href="/admin/refunds"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="money_off">
              money_off
            </span>
            <span className="font-inter text-sm antialiased">
              Refund Management
            </span>
          </Link>

          {/* Buyers Management */}
          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="person">
              person
            </span>
            <span className="font-inter text-sm antialiased">Buyers</span>
          </Link>

          {/* Farmers Management */}
          <Link
            href="/admin/farmers"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 scale-100 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" data-icon="agriculture">
              agriculture
            </span>
            <span className="font-inter text-sm antialiased">Farmers</span>
          </Link>
        </nav>
      </aside>

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm flex justify-between items-center h-16 px-8 ml-[280px] w-[calc(100%-280px)]">
        <div className="flex items-center gap-4">
          <button className="hover:bg-gray-100 rounded-full p-2 transition-all duration-200 text-emerald-800 lg:hidden">
            <span className="material-symbols-outlined" data-icon="menu">
              menu
            </span>
          </button>
          <h2 className="text-lg font-bold text-emerald-900">Admin Console</h2>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/admin/notifications" className="relative">
            <button className="hover:bg-gray-100 rounded-full p-2 transition-all duration-200 text-gray-500">
              <span
                className="material-symbols-outlined"
                data-icon="notifications"
              >
                notifications
              </span>
              {recentCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {recentCount > 9 ? "9+" : recentCount}
                </span>
              )}
            </button>
          </Link>
          <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors">
            <div className="text-right hidden sm:block">
              <p className="font-label-md text-on-surface leading-none mb-1">
                Admin User
              </p>
              <p className="font-label-sm text-on-surface-variant leading-none">
                Super Administrator
              </p>
            </div>
            <img
              alt="Admin Profile"
              className="w-9 h-9 rounded-full object-cover border border-emerald-100"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZC_LRaKvUzhFoj2SsEaEabfvJYppbkwRYYcSNz-1ab3fLWw39UTK-0f0rHEDQu94zZ7u4oDLeYxdtgzpDvikM5NiNmnaY6qLPgDZkI5mHIFKgVlKEMcURH4jQ71XVSD65ZI71db6-IRgfdKIxCakWyAIdguTpVQRigEhG4VNC2AGrMPyD_MaP_tDao5lAs6vTbGN5aqRVDYoyfFarSpWnPymFe9eijJEQy5yenpXZUlMS95KUsKHlTw6qQypQ3yk3XR4rHPgb_Q4"
            />
          </div>
          <button
            onClick={handleLogout}
            className="hover:bg-gray-100 rounded-full p-2 transition-all duration-200 text-gray-500"
            title="Log out"
          >
            <span className="material-symbols-outlined" data-icon="logout">
              logout
            </span>
          </button>
        </div>
      </header>

      <main className="ml-[280px] p-margin min-h-screen">{children}</main>
    </div>
  );
}
