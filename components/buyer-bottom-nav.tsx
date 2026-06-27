"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/kizfarm/cart-context";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/buyer/dashboard", icon: "home" },
  { name: "Marketplace", href: "/buyer/marketplace", icon: "storefront" },
  { name: "Courses", href: "/buyer/courses", icon: "school" },
  { name: "Blogs", href: "/buyer/blog", icon: "article" },
  { name: "Cart", href: "/buyer/cart", icon: "shopping_cart" },
  { name: "Orders", href: "/buyer/orders", icon: "shopping_bag" },
  { name: "Chats", href: "/buyer/chat", icon: "forum" },
  { name: "Notifications", href: "/buyer/notifications", icon: "notifications" },
  { name: "Refunds", href: "/buyer/refunds", icon: "money_off" },
  { name: "Wishlist", href: "/buyer/wishlist", icon: "favorite" },
  { name: "Profile", href: "/buyer/profile", icon: "person" },
];

export default function BuyerBottomNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();

  const isActive = (href: string) => {
    if (href === "/buyer/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800 shadow-lg lg:hidden z-50 overflow-x-auto">
      <div className="flex items-center h-16 px-2 py-2 min-w-max gap-1">
        {NAV_ITEMS.filter((item) => item.href !== "/buyer/cart" || totalItems > 0).map((item) => {
          const active = isActive(item.href);
          const isCart = item.href === "/buyer/cart";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors active:scale-90 duration-200 flex-shrink-0 ${
                active
                  ? "text-[#1B6D24] dark:text-green-500"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
              }`}
              title={item.name}
            >
              <span className="relative">
                <span
                  className={`material-symbols-outlined ${active ? "font-bold" : ""}`}
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {isCart && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
