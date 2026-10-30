"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/lib/kizfarm/cart-context";
import { UnreadBadge, useUnreadNotificationCount } from "@/hooks/use-notifications";
import { signOut } from "@/lib/kizfarm/supabase-auth";
import { useFarmerStatus } from "@/hooks/use-farmer-status";

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
  const unreadNotifications = useUnreadNotificationCount();

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
                {item.href === "/buyer/notifications" && <UnreadBadge count={unreadNotifications} />}
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <FarmerEntry />

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

// Where the buyer is on the road to selling: one always-visible entry so
// "how do I become a farmer / where's my application / where's my farm"
// never needs explaining.
function FarmerEntry() {
  const { farmer, loaded } = useFarmerStatus();
  if (!loaded) return <div className="mb-2 h-[58px]" />;

  if (farmer?.status === "approved") {
    return (
      <Link
        href="/farmer/dashboard"
        className="mb-2 flex items-center gap-3 rounded-xl bg-[#1B6D24] px-3 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-110"
      >
        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          verified
        </span>
        <span className="flex-1 leading-tight">
          Farmer Dashboard
          <span className="block text-[11px] font-medium text-white/80">You&apos;re a verified farmer</span>
        </span>
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Link>
    );
  }

  const entry = !farmer
    ? { title: "Become a Farmer", sub: "Sell your farm products", icon: "agriculture", tone: "border-green-200 bg-green-50 text-[#1B6D24]", href: "/farmer/become" }
    : farmer.status === "pending"
      ? { title: "Farmer application", sub: "Under review by admin", icon: "hourglass_top", tone: "border-amber-200 bg-amber-50 text-amber-900", href: "/farmer/verify" }
      : farmer.status === "rejected"
        ? { title: "Farmer application", sub: "Needs changes — tap to fix", icon: "error", tone: "border-rose-200 bg-rose-50 text-rose-800", href: "/farmer/verify" }
        : {
            title: "Finish farmer application",
            sub: farmer.missingCount > 0 ? `${farmer.missingCount} item${farmer.missingCount === 1 ? "" : "s"} left` : "Ready to submit",
            icon: "edit_note",
            tone: "border-amber-200 bg-amber-50 text-amber-900",
            href: "/farmer/verify",
          };

  return (
    <Link href={entry.href} className={`mb-2 flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold hover:brightness-95 ${entry.tone}`}>
      <span className="material-symbols-outlined text-[22px]">{entry.icon}</span>
      <span className="flex-1 leading-tight">
        {entry.title}
        <span className="block text-[11px] font-medium opacity-80">{entry.sub}</span>
      </span>
      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
    </Link>
  );
}
