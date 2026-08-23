"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNav from "@/components/top-nav";
import SiteFooter from "@/components/site-footer";
import { apiFetch } from "@/lib/kizfarm/api";
import { DEMO_PRODUCTS, DEMO_BLOG_POSTS, DEMO_COURSES } from "@/lib/kizfarm/demo-content";

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

const HERO_VIDEOS = [
  "/videos/kizfarmbg1.mp4",
  "/videos/kizfarm3.mp4",
  "/videos/kizfarm2.mp4",
];

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [activeHeroVideo, setActiveHeroVideo] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      setActiveHeroVideo((i) => (i + 1) % HERO_VIDEOS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const handleNewsletterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubmitted(true);
    setNewsletterEmail("");
  };

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
      let live: Product[] = [];
      try {
        const { payload } = await apiFetch("/marketplace/products");
        if (payload?.ok) live = payload.products ?? [];
      } catch {}
      setProducts([...live, ...DEMO_PRODUCTS].slice(0, 4));
    }
    loadProducts();
  }, []);

  useEffect(() => {
    async function loadBlogs() {
      let live: BlogPost[] = [];
      try {
        const { payload } = await apiFetch("/blog");
        if (payload?.ok) live = payload.posts ?? [];
      } catch {}
      setBlogPosts([...live, ...DEMO_BLOG_POSTS].slice(0, 3));
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
    router.push("/");
  };

  const steps = [
    {
      icon: "storefront",
      title: "Browse & Order",
      description:
        "Explore verified farms and hand-pick fresh produce straight from the harvest listing.",
    },
    {
      icon: "agriculture",
      title: "Farmers Prepare",
      description:
        "Your order is picked, packed, and quality-checked directly on the farm within hours.",
    },
    {
      icon: "local_shipping",
      title: "Fast, Tracked Delivery",
      description:
        "Cold-chain logistics get your produce to your door — fresh, with live tracking.",
    },
  ];

  const categories = [
    {
      icon: "nutrition",
      label: "Fruits & Vegetables",
      image:
        "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80",
    },
    {
      icon: "grain",
      label: "Grains & Cereals",
      image:
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
    },
    {
      icon: "egg",
      label: "Dairy & Eggs",
      image:
        "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=800&q=80",
    },
    {
      icon: "spa",
      label: "Herbs & Spices",
      image:
        "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80",
    },
    {
      icon: "water_drop",
      label: "Oils & Extracts",
      image:
        "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80",
    },
    {
      icon: "eco",
      label: "Organic Specials",
      image:
        "https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=800&q=80",
    },
  ];

  const testimonials = [
    {
      quote:
        "KizFarm cut our sourcing time in half. The produce arrives fresher than anything we used to get from wholesalers.",
      name: "Amara Okafor",
      role: "Restaurant Owner, Lagos",
    },
    {
      quote:
        "Listing my harvest and getting paid instantly changed how I plan my season. I finally sell at a fair price.",
      name: "Daniel Kip",
      role: "Farmer, Kaduna",
    },
    {
      quote:
        "Delivery tracking is spot on and the quality checks actually mean something. It's the most reliable platform we've used.",
      name: "Grace Mensah",
      role: "Household Buyer, Accra",
    },
  ];

  return (
    <>
    <main className="pt-16">
      <TopNav />
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        {/* Rotating cinematic video background */}
        <div className="absolute inset-0 bg-black">
          {HERO_VIDEOS.map((src, i) => (
            <video
              key={src}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className={`hero-video-zoom absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                i === activeHeroVideo ? "opacity-100" : "opacity-0"
              }`}
              src={src}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        </div>

        {/* Progress indicators for the video rotation */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {HERO_VIDEOS.map((src, i) => (
            <span
              key={src}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === activeHeroVideo ? "w-8 bg-[#a2f4b5]" : "w-4 bg-white/30"
              }`}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-24 w-full">
          <div className="max-w-2xl">
            <h1 className="text-display-xl font-bold text-white mb-6 max-w-xl text-5xl leading-tight drop-shadow-sm">
              Fresh Produce Delivered Safely From Farm to Home
            </h1>
            <p className="text-body-lg text-white/80 mb-10 max-w-lg leading-relaxed text-lg">
              Connecting farmers and buyers with fast delivery and reliable
              tracking. Experience the taste of precision-grown agriculture.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                href="/buyer/marketplace"
                className="px-8 py-4 bg-[#1B6D24] text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all active:scale-95 soil-shadow inline-block text-center"
              >
                Shop Products
              </Link>
              {!loggedIn ? (
                <Link
                  href="/signup"
                  className="px-8 py-4 border-2 border-white text-white font-bold text-sm rounded-xl hover:bg-white/10 transition-all active:scale-95 inline-block text-center"
                >
                  Sign Up
                </Link>
              ) : (
                <Link
                  href="/farmer/become"
                  className="px-8 py-4 border-2 border-white text-white font-bold text-sm rounded-xl hover:bg-white/10 transition-all active:scale-95 inline-block text-center"
                >
                  Become a Farmer
                </Link>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <span className="material-symbols-outlined text-[#a2f4b5] text-[20px]">verified_user</span>
                Verified Farmers
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <span className="material-symbols-outlined text-[#a2f4b5] text-[20px]">bolt</span>
                Fast Delivery
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <span className="material-symbols-outlined text-[#a2f4b5] text-[20px]">lock</span>
                Secure Payments
              </div>
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
              <Link
                key={product._id}
                href={
                  product._id.startsWith("demo-")
                    ? "/buyer/marketplace"
                    : `/buyer/marketplace-detail/${product._id}`
                }
                className="group border border-slate-100 rounded-xl overflow-hidden hover:border-[#1B6D24] transition-all duration-300"
              >
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

      {/* Learn to Farm — Courses */}
      <section className="py-20 bg-[#0B2412]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase bg-[#a2f4b5] text-[#002108] rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1B6D24]"></span>
                KizFarm Learning Hub
              </span>
              <h2 className="text-3xl font-bold text-white mb-3">
                Never Farmed Before? Learn From Professionals Who Have.
              </h2>
              <p className="text-white/60">
                Every course is built and taught by experienced, professional
                farmers — practical lessons you can apply from day one, no
                prior experience required.
              </p>
            </div>
            <Link
              href="/learning"
              className="text-[#a2f4b5] font-bold flex items-center gap-2 hover:underline whitespace-nowrap"
            >
              View All Courses{" "}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {DEMO_COURSES.slice(0, 3).map((course) => (
              <Link
                key={course._id}
                href="/learning"
                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-44 overflow-hidden relative">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-md text-xs font-bold text-[#1B6D24] flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    {course.rating}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-bold text-zinc-900 leading-snug mb-2 group-hover:text-[#1B6D24] transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed mb-5 flex-1">
                    {course.description}
                  </p>
                  <div className="flex items-center gap-3 mb-5 pt-5 border-t border-zinc-100">
                    <img
                      src={course.tutor.avatar}
                      alt={course.tutor.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{course.tutor.name}</p>
                      <p className="text-xs text-zinc-500">{course.tutor.credential}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">play_circle</span>
                        {course.lessons} lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">groups</span>
                        {course.students}
                      </span>
                    </span>
                    <span className="text-[#1B6D24] font-bold">{money(course.price)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase bg-emerald-50 text-[#1B6D24] rounded-full">
              How It Works
            </span>
            <h2 className="text-3xl font-bold text-on-surface mb-3">
              From Harvest to Doorstep in Three Steps
            </h2>
            <p className="text-on-surface-variant max-w-lg mx-auto">
              A transparent, verified journey — every order tracked from the
              farm to your table.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                className="relative bg-white p-8 rounded-2xl border border-slate-100 soil-shadow"
              >
                <span className="absolute top-6 right-6 text-5xl font-black text-emerald-100">
                  0{idx + 1}
                </span>
                <div className="relative w-14 h-14 rounded-xl bg-[#1B6D24]/10 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-[#1B6D24] text-[28px]">
                    {step.icon}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold text-on-surface mb-2">
                Shop by Category
              </h2>
              <p className="text-on-surface-variant">
                Everything you need, sourced directly from verified farms.
              </p>
            </div>
            <Link
              className="text-[#1B6D24] font-bold flex items-center gap-2 hover:underline"
              href="/buyer/marketplace"
            >
              Browse Marketplace{" "}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href="/buyer/marketplace"
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden soil-shadow"
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent transition-colors group-hover:from-[#1B6D24]/90" />
                <div className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#1B6D24] text-[18px]">
                    {cat.icon}
                  </span>
                </div>
                <span className="absolute bottom-3 left-3 right-3 text-xs font-bold text-white leading-tight">
                  {cat.label}
                </span>
              </Link>
            ))}
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
                  href="/signup"
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
                alt="Crate overflowing with fresh harvested vegetables"
                className="absolute inset-0 w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=1200&q=80"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#1B6D24] to-transparent opacity-40"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase bg-emerald-50 text-[#1B6D24] rounded-full">
              Trusted Nationwide
            </span>
            <h2 className="text-3xl font-bold text-on-surface">
              What Our Community Says
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="flex flex-col justify-between bg-slate-50 p-8 rounded-2xl border border-slate-100"
              >
                <div>
                  <div className="flex gap-1 mb-4 text-[#1B6D24]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-on-surface-variant leading-relaxed mb-8">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1B6D24] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-on-surface text-sm">{t.name}</p>
                    <p className="text-xs text-on-surface-variant">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
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
                href="/blog"
              >
                View All Articles{" "}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug}`}
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

      {/* Newsletter CTA */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#0B2412] px-8 py-16 md:px-16 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#1B6D24]/30 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative max-w-xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 text-xs font-bold tracking-widest uppercase bg-[#a2f4b5] text-[#002108] rounded-full">
                Stay in the Loop
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Get Fresh Harvest Updates in Your Inbox
              </h2>
              <p className="text-white/60 mb-8">
                Seasonal drops, farmer stories, and exclusive offers — no spam, unsubscribe anytime.
              </p>
              {newsletterSubmitted ? (
                <p className="inline-flex items-center gap-2 text-[#a2f4b5] font-bold">
                  <span className="material-symbols-outlined">check_circle</span>
                  You&apos;re subscribed — welcome to KizFarm.
                </p>
              ) : (
                <form
                  onSubmit={handleNewsletterSubmit}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                >
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 outline-none focus:border-[#a2f4b5] focus:ring-1 focus:ring-[#a2f4b5] transition-all"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3.5 rounded-xl bg-[#a2f4b5] text-[#002108] font-bold text-sm hover:brightness-105 transition-all active:scale-95 whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
      <SiteFooter />
    </>
  );
}
