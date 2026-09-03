"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { signOut } from "@/lib/kizfarm/supabase-auth";

type FarmerSidebarProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

function NavLinks({
  pathname,
  onClick,
  collapsed: linksCollapsed = false,
}: {
  pathname: string;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav className="flex-1 space-y-1 px-3 pt-2">
      <Link
        href="/farmer/dashboard"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/farmer/dashboard") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">dashboard</span>
        {!linksCollapsed && "Dashboard"}
      </Link>
      <Link
        href="/farmer/products"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/farmer/products") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">inventory_2</span>
        {!linksCollapsed && "Products"}
      </Link>
      <Link
        href="/farmer/orders"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/farmer/orders") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">receipt_long</span>
        {!linksCollapsed && "Orders"}
      </Link>
      <Link
        href="/learning"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/learning") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">school</span>
        {!linksCollapsed && "Learning"}
      </Link>
      <Link
        href="/farmer/blog"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/farmer/blog") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">article</span>
        {!linksCollapsed && "Blogs"}
      </Link>
      <Link
        href="/farmer/products/add-product"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/farmer/products/add-product") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">add</span>
        {!linksCollapsed && "Add Product"}
      </Link>
      <Link
        href="/farmer/chats"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/farmer/chats") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">chat</span>
        {!linksCollapsed && "Chats"}
      </Link>
      <Link
        href="/buyer/marketplace"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/buyer/marketplace") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">storefront</span>
        {!linksCollapsed && "Marketplace"}
      </Link>
      <Link
        href="/farmer/profile"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/farmer/profile") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">person</span>
        {!linksCollapsed && "Profile"}
      </Link>
      <Link
        href="/farmer/bank-setup"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/farmer/bank-setup") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">account_balance</span>
        {!linksCollapsed && "Bank Details"}
      </Link>
      <Link
        href="/farmer/payouts"
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded ${linksCollapsed ? "justify-center" : ""} ${isActive(pathname, "/farmer/payouts") ? "bg-green-50 text-[#1B6D24] font-semibold border-r-4 border-[#1B6D24]" : "text-zinc-600"}`}
      >
        <span className="material-symbols-outlined">payments</span>
        {!linksCollapsed && "Payments History"}
      </Link>
    </nav>
  );
}

export default function FarmerSidebar({
  collapsed = false,
  onToggleCollapsed,
}: FarmerSidebarProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 ${collapsed ? "w-[80px]" : "w-[280px]"} z-[60] flex-col bg-white dark:bg-zinc-950 border-r border-zinc-100`}
      >
        <div className={`px-3 py-4 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <span className="text-xl font-bold text-[#1B6D24]">
              Seller Portal
            </span>
          )}
          {onToggleCollapsed && (
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggleCollapsed}
              className="p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-200"
            >
              <span className="material-symbols-outlined">
                {collapsed ? "chevron_right" : "chevron_left"}
              </span>
            </button>
          )}
        </div>
        <NavLinks pathname={pathname} collapsed={collapsed} />
        <div className="px-3 pb-4">
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3 px-3 py-3 rounded w-full text-zinc-600 hover:bg-red-50 hover:text-red-600 ${collapsed ? "justify-center" : ""}`}
          >
            <span className="material-symbols-outlined">logout</span>
            {!collapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Mobile top bar (hamburger) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[70] bg-white dark:bg-zinc-950 border-b border-zinc-100 flex items-center justify-between px-4 py-2 h-16">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="p-2 rounded bg-transparent text-zinc-700"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="text-lg font-semibold text-[#1B6D24]">
            Seller Portal
          </span>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[80]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-zinc-950 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-[#1B6D24]">
                Seller Portal
              </span>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <NavLinks pathname={pathname} onClick={() => setOpen(false)} collapsed={false} />
            <div className="px-3 pb-4">
              <button
                onClick={() => {
                  setOpen(false);
                  handleSignOut();
                }}
                className="flex items-center gap-3 px-3 py-3 rounded w-full text-zinc-600 hover:bg-red-50 hover:text-red-600"
              >
                <span className="material-symbols-outlined">logout</span>
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
