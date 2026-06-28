"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNav from "@/components/top-nav";
import { apiFetch } from "@/lib/kizfarm/api";

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  category?: string;
  images?: string[];
  farmerId?: { farmName?: string; location?: string };
}

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage?: string;
  category: string;
  readTime: number;
  createdAt: string;
}

const money = (value = 0) => `NGN ${Number(value).toLocaleString()}`;

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("kizfarm_token");
    const user = localStorage.getItem("kizfarm_user");
    if (token) {
      let role = "user";
      if (user) {
        try {
          const parsed = JSON.parse(user);
          if (parsed.role) role = parsed.role;
        } catch {}
      }
      if (role === "farmer") {
        router.push("/farmer/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/buyer/dashboard");
      }
      return;
    }
    setLoggedIn(false);
    setUserEmail(null);

    const onAuth = () => {
      const t = localStorage.getItem("kizfarm_token");
      const u = localStorage.getItem("kizfarm_user");
      setLoggedIn(!!t);
      try {
        setUserEmail(u ? JSON.parse(u).email : null);
      } catch {
        setUserEmail(null);
      }
    };
    window.addEventListener("storage", onAuth);
    window.addEventListener("kizfarm_auth_changed", onAuth as EventListener);
    return () => {
      window.removeEventListener("storage", onAuth);
      window.removeEventListener(
        "kizfarm_auth_changed",
        onAuth as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        const { payload } = await apiFetch("/marketplace/products");
        if (payload?.ok) setProducts((payload.products ?? []).slice(0, 4));
      } catch {
        setProducts([]);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    async function loadBlogs() {
      try {
        const { payload } = await apiFetch("/blog");
        if (payload?.ok) setBlogPosts((payload.posts ?? []).slice(0, 3));
      } catch {
        setBlogPosts([]);
      }
    }
    loadBlogs();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("kizfarm_token");
    localStorage.removeItem("kizfarm_user");
    try {
      window.dispatchEvent(new Event("kizfarm_auth_changed"));
    } catch {}
    setLoggedIn(false);
    router.push("/public/home");
  };

  return (
    <main className="pt-16">
      <TopNav />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#FFFFFF] py-20 md:py-32">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-12 lg:gap-20">
          <div className="z-10 order-2 md:order-1">
            <span className="inline-block px-3 py-1 mb-6 text-xs font-bold tracking-widest uppercase bg-[#a2f4b5] text-[#002108] rounded-full">
              Farm to Table Delivery
            </span>
            <h1 className="text-display-xl font-bold text-on-background mb-6 max-w-xl text-5xl leading-tight">
              Fresh Produce Delivered Safely From Farm to Home
            </h1>
            <p className="text-body-lg text-on-surface-variant mb-10 max-w-lg leading-relaxed text-lg">
              Connecting farmers and buyers with fast delivery and reliable
              tracking. Experience the taste of precision-grown agriculture.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/buyer/marketplace"
                className="px-8 py-4 bg-[#1B6D24] text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all active:scale-95 soil-shadow inline-block text-center"
              >
                Shop Products
              </Link>
              {!loggedIn ? (
                <Link
                  href="/public/signup"
                  className="px-8 py-4 border-2 border-[#1B6D24] text-[#1B6D24] font-bold text-sm rounded-xl hover:bg-[#a2f4b5]/20 transition-all active:scale-95 inline-block text-center"
                >
                  Sign Up
                </Link>
              ) : (
                <Link
                  href="/farmer/become"
                  className="px-8 py-4 border-2 border-[#1B6D24] text-[#1B6D24] font-bold text-sm rounded-xl hover:bg-[#a2f4b5]/20 transition-all active:scale-95 inline-block text-center"
                >
                  Become a Farmer
                </Link>
              )}
            </div>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#1B6D24]/10 rounded-full blur-3xl"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl transform rotate-1">
              <img
                alt="Fresh vegetables in a basket"
                className="w-full h-[500px] object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqnL0LI9lEm3Z8y6c39xYOuNsKMm98c3zSduhiDfpQjv7soxdm42bDvCy0pJ_StXswHWjQuWFiGy4qVI2JPdU6N8-7DbcjfQgJ2R-vtWv1QC7cu-ULI09spxyeleFHZRq5C0scGs5pYOQlB5ZKTUIrA5UAgI5ZUUioaMrZIiWzJC3yS5ql946BON9XV7IuqEW-1vVUrn0DDMgWyaiKoIEgobuPqmuInDFEo-cqC4xm3B6ltJA_Z2D-L9iRmpK-Tv7kPURENm7Ynh8"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl soil-shadow max-w-[200px]">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-[#1B6D24]">
                  verified
                </span>
                <span className="font-bold text-sm text-on-surface">
                  100% Organic
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Directly sourced from certified local family farms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-[#FFFFFF]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-headline-lg font-bold text-on-surface mb-2 text-3xl">
                Featured Harvests
              </h2>
              <p className="text-body-md text-on-surface-variant">
                Picked at peak ripeness and ready for your kitchen.
              </p>
            </div>
            <Link
              className="text-[#1B6D24] font-bold flex items-center gap-2 hover:underline"
              href="/buyer/marketplace"
            >
              View All Products{" "}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <Link key={product._id} href={`/buyer/marketplace-detail/${product._id}`} className="group border border-slate-100 rounded-xl overflow-hidden hover:border-[#1B6D24] transition-all duration-300">
                <div className="h-64 overflow-hidden">
                  <img alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={product.images?.[0] || "/placeholder.jpg"} />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <h3 className="text-lg font-bold text-on-surface line-clamp-2">{product.name}</h3>
                    <span className="text-[#1B6D24] font-bold whitespace-nowrap">{money(product.price)}</span>
                  </div>
                  <p className="text-xs font-bold text-on-surface-variant mb-4 line-clamp-1">
                    {product.farmerId?.farmName || product.category || "Farm product"}{product.unit ? ` · ${product.unit}` : ""}
                  </p>
                  <span className="block w-full py-2 rounded-lg bg-slate-50 text-[#1B6D24] font-bold text-sm text-center group-hover:bg-[#1B6D24] group-hover:text-white transition-colors">
                    View Product
                  </span>
                </div>
              </Link>
            ))}
            {products.length === 0 && (
              <div className="lg:col-span-4 rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                No products available yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Become a Farmer Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="bg-[#1B6D24] rounded-[2rem] overflow-hidden flex flex-col lg:flex-row items-stretch">
            <div className="p-6 md:p-20 flex-1 flex flex-col justify-center text-white">
              <h2 className="text-5xl font-bold mb-6 leading-tight">
                Empower Your Farm with Global Technology.
              </h2>
              <p className="text-lg text-white/80 mb-10">
                Join over 5,000 farmers who use KIZ FARM to reach direct buyers,
                optimize their harvest schedules, and ensure fair pricing for
                their hard work.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#a2f4b5]">
                      monitoring
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">
                      Advanced Analytics
                    </h4>
                    <p className="text-sm opacity-80">
                      Track soil health and crop progress in real-time.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#a2f4b5]">
                      payments
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Fast Payments</h4>
                    <p className="text-sm opacity-80">
                      Get paid instantly upon delivery confirmation.
                    </p>
                  </div>
                </div>
              </div>
              {!loggedIn ? (
                <Link
                  href="/public/signup"
                  className="w-fit inline-block px-10 py-5 bg-white text-[#1B6D24] font-black text-lg rounded-xl hover:bg-slate-100 transition-all active:scale-95"
                >
                  Sign Up
                </Link>
              ) : (
                <Link
                  href="/farmer/become"
                  className="w-fit inline-block px-10 py-5 bg-white text-[#1B6D24] font-black text-lg rounded-xl hover:bg-slate-100 transition-all active:scale-95"
                >
                  Apply to Become a Farmer
                </Link>
              )}
            </div>
            <div className="hidden lg:block lg:w-1/3 min-h-[600px] relative">
              <img
                alt="Professional Farmer"
                className="absolute inset-0 w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD60xlDNOf-3oMdQ6goJaeitBYChf3-ze5byUTyHN3nKaX5sKI2QtYuRHjlPyySTIQEChDhEd0b-MP7KnprgX2IEtZwJAvEes9Rdmj7w-rH4ycnoL6dmA2kksvZHZPNQSIrKeuh81AZX9ya48Tc0WXDFzZPMAJ5FikpSl-Mg01l7wZKjNIj_RHTyY4aFyzavTUok1jmn-uGZTNMk18r5I6ikoI397L2I8-Z6r-_O1U4k9eR1j5EaZBmUX87Snk1HBXmvLD2KCQSu2w"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#1B6D24] to-transparent opacity-40"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Preview Section */}
      {blogPosts.length > 0 && (
        <section className="py-20 bg-[#f9fafb]">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase bg-emerald-50 text-[#1B6D24] rounded-full">
                  KizFarm Insights
                </span>
                <h2 className="text-3xl font-bold text-zinc-900">
                  Latest from the Blog
                </h2>
                <p className="text-zinc-500 mt-2">
                  Expert agronomy updates, agri-tech news, and farming tips.
                </p>
              </div>
              <Link
                className="text-[#1B6D24] font-bold flex items-center gap-2 hover:underline whitespace-nowrap"
                href="/public/blog"
              >
                View All Articles{" "}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <Link
                  key={post._id}
                  href={`/public/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-emerald-600 transition-all duration-300"
                >
                  {post.coverImage ? (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-emerald-900 to-green-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/30 text-[80px]">article</span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B6D24] bg-emerald-50 px-2 py-0.5 rounded">
                        {post.category}
                      </span>
                      <span className="text-xs text-zinc-400">{post.readTime} min read</span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 group-hover:text-[#1B6D24] transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2 flex-1">
                      {post.summary || "Click to read this article."}
                    </p>
                    <div className="pt-3 flex items-center justify-between border-t border-zinc-100 text-xs font-bold text-[#1B6D24]">
                      <span>Read Article</span>
                      <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-20 bg-[#FFFFFF]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center p-8 bg-slate-50 rounded-2xl">
              <p className="text-5xl font-bold text-[#1B6D24] mb-2">12M+</p>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Kilos Delivered
              </p>
            </div>
            <div className="text-center p-8 bg-slate-50 rounded-2xl">
              <p className="text-5xl font-bold text-[#1B6D24] mb-2">500+</p>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Active Farms
              </p>
            </div>
            <div className="text-center p-8 bg-slate-50 rounded-2xl">
              <p className="text-5xl font-bold text-[#1B6D24] mb-2">24h</p>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Delivery Promise
              </p>
            </div>
            <div className="text-center p-8 bg-slate-50 rounded-2xl">
              <p className="text-5xl font-bold text-[#1B6D24] mb-2">99.9%</p>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Quality Rating
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
