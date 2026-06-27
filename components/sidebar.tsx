"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { clearAuth, getAuthToken, getStoredUser, isAdminUser, parseJwt } from "@/lib/kizfarm/auth";

type NavItem = { name: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Public",
    items: [
      { name: "Home", href: "/public/home" },
      { name: "About", href: "/public/about" },
      { name: "Contact", href: "/public/contact" },
      { name: "Login", href: "/public/login" },
      { name: "OTP Verification", href: "/public/otp" },
      { name: "Sign Up", href: "/public/signup" },
    ],
  },
  {
    label: "Buyer",
    items: [
      { name: "Catalog", href: "/buyer/catalog" },
      { name: "Blog", href: "/public/blog" },
      { name: "Chat", href: "/buyer/chat" },
      { name: "Chat Detail", href: "/buyer/chat-detail" },
      { name: "Wishlist", href: "/buyer/wishlist" },
      { name: "Profile", href: "/buyer/profile" },
      { name: "Addresses", href: "/buyer/addresses" },
      { name: "Payment", href: "/buyer/payment" },
      { name: "Notifications", href: "/buyer/notifications" },
      { name: "Order Detail", href: "/buyer/order" },
      { name: "Track Order", href: "/buyer/track-order" },
      { name: "My Orders", href: "/buyer/orders" },
      { name: "Checkout", href: "/buyer/checkout" },
      { name: "Cart", href: "/buyer/cart" },
      { name: "Search", href: "/buyer/search" },
      { name: "Marketplace", href: "/buyer/marketplace" },
      { name: "Product Detail", href: "/buyer/product" },
      { name: "Dashboard", href: "/buyer/dashboard" },
    ],
  },
  {
    label: "Farmer",
    items: [
      { name: "Become a Farmer", href: "/farmer/become" },
      { name: "Identity Verification", href: "/farmer/verify" },
      { name: "Add Product", href: "/farmer/add-product" },
      { name: "Farmer Dashboard", href: "/farmer/dashboard" },
      { name: "Buyer Messages", href: "/farmer/messages" },
      { name: "Payout History", href: "/farmer/payouts" },
      { name: "Chat with Buyer", href: "/farmer/chat-with-buyer" },
      { name: "Bank Setup", href: "/farmer/bank-setup" },
      { name: "Farm Profile", href: "/farmer/profile" },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "All Farmers", href: "/admin/farmers" },
      { name: "Farmer Verification", href: "/admin/verify-farmers" },
      { name: "All Products", href: "/admin/products" },
      { name: "Product Review", href: "/admin/product-review" },
      { name: "Transactions", href: "/admin/transactions" },
      { name: "Escrow", href: "/admin/escrow" },
      { name: "Refunds", href: "/admin/refunds" },
      { name: "Order Control", href: "/admin/order-control" },
      { name: "Assign Driver", href: "/admin/assign-driver" },
      { name: "Driver Management", href: "/admin/driver-management" },
      { name: "User Detail", href: "/admin/user-detail" },
      { name: "User List", href: "/admin/users" },
      { name: "Admin Dashboard", href: "/admin/dashboard" },
    ],
  },
  {
    label: "Learning Hub",
    items: [
      { name: "Course Detail", href: "/learning/course" },
      { name: "Access & Contact", href: "/learning/access-contact" },
      { name: "Coach Profile", href: "/learning/coach" },
      { name: "Learning Hub", href: "/learning" },
      { name: "All Subscriptions", href: "/learning/subscriptions" },
      { name: "Add New Tutor", href: "/learning/add-tutor" },
      { name: "Hub Admin", href: "/learning/admin" },
      { name: "Add New Course", href: "/learning/add-course" },
    ],
  },
];

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname() || "";
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getAuthToken();
    const user = getStoredUser();
    setLoggedIn(!!token);
    try {
      setUserEmail(user?.email ?? null);
      const payload = parseJwt(token);
      setIsAdmin(isAdminUser(payload) || isAdminUser(user));
    } catch {
      setUserEmail(null);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const updateFromStorage = () => {
      const token = getAuthToken();
      const user = getStoredUser();
      setLoggedIn(!!token);
      try {
        setUserEmail(user?.email ?? null);
        const payload = parseJwt(token);
        setIsAdmin(isAdminUser(payload) || isAdminUser(user));
      } catch {
        setUserEmail(null);
        setIsAdmin(false);
      }
    };

    // respond to cross-tab storage changes
    window.addEventListener("storage", updateFromStorage);
    // respond to same-tab programmatic auth changes
    window.addEventListener("kizfarm_auth_changed", updateFromStorage);

    return () => {
      window.removeEventListener("storage", updateFromStorage);
      window.removeEventListener("kizfarm_auth_changed", updateFromStorage);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    // refresh sidebar state and navigate to home
    setLoggedIn(false);
    router.push("/public/home");
  };

  const isActive = (href: string) => {
    if (
      href === "/public/home" &&
      (pathname === "/" || pathname === "/public/home")
    )
      return true;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-[#1B6D24] text-white rounded-r-xl px-1 py-4 shadow-lg hover:bg-[#005312] transition-colors flex flex-col items-center gap-1"
        aria-label="Open navigation"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
        <span
          style={{
            writingMode: "vertical-rl",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            transform: "rotate(180deg)",
          }}
        >
          PAGES
        </span>
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300"
        style={{
          width: "260px",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-[#1B6D24]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white text-[20px]">
              grid_view
            </span>
            <span className="text-white font-semibold text-sm tracking-wide">
              All Pages
            </span>
          </div>
          <div className="flex items-center gap-2">
            {loggedIn && (
              <div className="text-white text-sm mr-2">{userEmail}</div>
            )}
            {loggedIn ? (
              <button
                onClick={handleLogout}
                className="text-white/90 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  logout
                </span>
              </button>
            ) : (
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map((group) => {
            // if user is admin, only show Admin group
            if (isAdmin && group.label !== "Admin") return null;
            return (
              <div key={group.label}>
                <div className="px-4 pt-4 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {group.label}
                  </span>
                </div>

                {group.label === "Admin" && !isAdmin ? (
                  <Link
                    key="admin-login"
                    href="/admin/login"
                    onClick={() => setSidebarOpen(false)}
                    className={`w-full block text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${isActive("/admin/login") ? "bg-[#f0fdf4] text-[#1B6D24] font-semibold" : "text-[#374151]"}`}
                  >
                    <span className="w-[14px]" />
                    Admin Login
                  </Link>
                ) : (
                  <>
                    {group.items.map((item) => {
                      // hide auth links when user is logged in
                      if (
                        loggedIn &&
                        (item.href === "/public/login" ||
                          item.href === "/public/signup" ||
                          item.href === "/public/otp")
                      ) {
                        return null;
                      }
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`w-full block text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${isActive(item.href) ? "bg-[#f0fdf4] text-[#1B6D24] font-semibold" : "text-[#374151]"}`}
                        >
                          {isActive(item.href) ? (
                            <span className="material-symbols-outlined text-[14px] text-[#1B6D24]">
                              arrow_right
                            </span>
                          ) : (
                            <span className="w-[14px]" />
                          )}
                          {item.name}
                        </Link>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[11px] text-gray-400 text-center">
            KizFarm · {NAV_GROUPS.reduce((a, g) => a + g.items.length, 0)}{" "}
            screens
          </p>
        </div>
      </div>
    </>
  );
}
