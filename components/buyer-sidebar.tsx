"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/lib/kizfarm/cart-context";
import { signOut } from "@/lib/kizfarm/supabase-auth";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/buyer/dashboard", icon: "home" },
  { name: "Marketplace", href: "/buyer/marketplace", icon: "storefront" },
  { name: "Courses", href: "/learning", icon: "school" },
  { name: "Blogs", href: "/buyer/blog", icon: "article" },
  { name: "Cart", href: "/buyer/cart", icon: "shopping_cart" },
  { name: "Orders", href: "/buyer/orders", icon: "shopping_bag" },
  { name: "Chats", href: "/buyer/chat", icon: "forum" },
  { name: "Notifications", href: "/buyer/notifications", icon: "notifications" },
  { name: "Refunds", href: "/buyer/refunds", icon: "money_off" },
  { name: "Wishlist", href: "/buyer/wishlist", icon: "favorite" },
  { name: "Refer & Earn", href: "/buyer/referrals", icon: "redeem" },
  { name: "Profile", href: "/buyer/profile", icon: "person" },
];

export default function BuyerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems } = useCart();

  const isActive = (href: string) => {
    if (href === "/buyer/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-200 bg-white px-4 py-5 shadow-sm lg:flex dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <img alt="KIZ FARM" className="h-10 w-auto object-contain" src="/logo.jpeg" />
        <p className="text-xs font-medium text-gray-500">Buyer Portal</p>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.filter((item) => item.href !== "/buyer/cart" || totalItems > 0).map((item) => {
          const active = isActive(item.href);
          const isCart = item.href === "/buyer/cart";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${
                active
                  ? "bg-[#f0fdf4] text-[#1B6D24]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {isCart && totalItems > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleSignOut}
        className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        <span className="material-symbols-outlined text-[22px]">logout</span>
        Sign Out
      </button>
    </aside>
  );
}
