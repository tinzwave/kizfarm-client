"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/kizfarm/api";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage?: string;
  category: string;
  readTime: number;
  author: string;
  createdAt: string;
}

export default function BlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    async function loadBlogs() {
      try {
        setLoading(true);
        const { res, payload } = await apiFetch("/blog");
        if (!res.ok) {
          throw new Error(payload.error || "Failed to load blogs");
        }
        setPosts(payload.posts || []);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    loadBlogs();
  }, []);

  // Determine unique categories
  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category || "General").filter(Boolean)))];

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      (post.summary && post.summary.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory =
      selectedCategory === "All" || (post.category || "General") === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const standardPosts = featuredPost ? filteredPosts.slice(1) : [];

  return (
    <>
      {/* TopAppBar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
            <img alt="KizFarm Logo" className="h-12 w-auto" src="/logo.jpeg" />
            <span className="text-xl font-extrabold text-[#1B6D24] tracking-tight">KizFarm</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-zinc-500 hover:text-[#1B6D24] font-semibold text-sm transition-colors" href="/public/home">Home</a>
            <a className="text-zinc-500 hover:text-[#1B6D24] font-semibold text-sm transition-colors" href="/buyer/marketplace">Marketplace</a>
            <a className="text-[#1B6D24] font-bold text-sm transition-colors" href="/public/blog">Blog</a>
            <div className="h-6 w-[1px] bg-zinc-200"></div>
            <button
              onClick={() => router.push("/public/login")}
              className="bg-[#1B6D24] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto min-h-screen bg-[#f9fafb] pb-20 px-6">
        {/* Hero Section / Featured Article */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1B6D24] mb-4"></div>
            <p className="text-zinc-500 font-medium">Loading KizFarm insights...</p>
          </div>
        ) : error ? (
          <div className="max-w-2xl mx-auto py-20 text-center">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Error Loading Blog</h3>
            <p className="text-zinc-600 mb-6">{error}</p>
          </div>
        ) : featuredPost ? (
          <section className="py-12">
            <div
              className="flex flex-col lg:flex-row gap-8 items-center bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300"
              onClick={() => router.push(`/public/blog/${featuredPost.slug}`)}
            >
              <div className="lg:w-1/2 space-y-4">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#1B6D24] text-xs font-bold uppercase tracking-wider">
                  Featured: {featuredPost.category}
                </span>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-zinc-900 leading-tight tracking-tight hover:text-[#1B6D24] transition-colors">
                  {featuredPost.title}
                </h1>
                <p className="text-zinc-600 text-base leading-relaxed line-clamp-3">
                  {featuredPost.summary || "No description available for this featured article."}
                </p>
                <div className="pt-4 flex items-center gap-6 text-sm text-zinc-500 font-semibold">
                  <span>By {featuredPost.author}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                  <span>{new Date(featuredPost.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                  <span>{featuredPost.readTime} min read</span>
                </div>
                <div className="pt-6">
                  <button className="bg-[#1B6D24] text-white px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm">
                    Read Article <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
              {featuredPost.coverImage && (
                <div className="lg:w-1/2 w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-md border border-zinc-100">
                  <img
                    alt={featuredPost.title}
                    className="w-full h-full object-cover"
                    src={featuredPost.coverImage}
                  />
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500 my-12">
            <span className="material-symbols-outlined text-zinc-400 text-5xl mb-4">article</span>
            <p className="text-lg font-bold text-zinc-800">No blog posts found</p>
          </div>
        )}

        {/* Categories & Search */}
        {!loading && !error && posts.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm md:items-center md:justify-between mb-8">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-[#1B6D24] text-white"
                      : "text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative md:w-80">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-xs outline-none focus:border-[#1B6D24] focus:ring-1 focus:ring-[#1B6D24]"
                placeholder="Search blogs..."
              />
              <span className="material-symbols-outlined absolute left-3 top-3.5 text-zinc-400 text-[18px]">
                search
              </span>
            </div>
          </div>
        )}

        {/* Latest Articles List */}
        {!loading && !error && standardPosts.length > 0 && (
          <section className="mb-12 space-y-6">
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Latest Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {standardPosts.map((post) => {
                const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <article
                    key={post._id}
                    onClick={() => router.push(`/public/blog/${post.slug}`)}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-emerald-600 transition-all duration-300 cursor-pointer"
                  >
                    {post.coverImage ? (
                      <div className="h-48 overflow-hidden relative">
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute top-4 left-4 bg-white/90 backdrop-blur text-[#1B6D24] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm border border-zinc-100">
                          {post.category}
                        </span>
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-emerald-800 to-green-950 p-6 flex flex-col justify-between relative text-white">
                        <span className="bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md max-w-max border border-white/10">
                          {post.category}
                        </span>
                        <span className="material-symbols-outlined text-[80px] opacity-10 absolute right-4 bottom-4 pointer-events-none">
                          article
                        </span>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6 space-y-3">
                      <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                        <span>{formattedDate}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                        <span>{post.readTime} min read</span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 group-hover:text-[#1B6D24] transition-colors line-clamp-2 leading-tight">
                        {post.title}
                      </h3>
                      <p className="text-zinc-600 text-sm leading-relaxed line-clamp-3 flex-1">
                        {post.summary || "No overview provided."}
                      </p>
                      <div className="pt-4 flex items-center justify-between border-t border-zinc-100 text-xs font-bold text-[#1B6D24]">
                        <span>Read Article</span>
                        <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-zinc-50 border-t border-zinc-200 py-12 px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <span className="text-lg font-bold text-[#1B6D24]">KIZ FARM</span>
            <p className="text-zinc-600 text-sm">© 2026 KizFarm Digital Agronomy. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm">
            <a className="text-zinc-500 hover:text-[#1B6D24] transition-all" href="#">Privacy Policy</a>
            <a className="text-zinc-500 hover:text-[#1B6D24] transition-all" href="#">Terms of Service</a>
            <a className="text-zinc-500 hover:text-[#1B6D24] transition-all" href="#">Contact Us</a>
          </div>
        </div>
      </footer>
    </>
  );
}
