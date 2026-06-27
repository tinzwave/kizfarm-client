"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/kizfarm/api";
import BlogDetail from "./blog-detail";

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

export default function DashboardBlogPage({ portal }: { portal: "buyer" | "farmer" }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
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

  if (selectedSlug) {
    return <BlogDetail slug={selectedSlug} onBack={() => setSelectedSlug(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-20 text-zinc-950">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur py-4">
        <div className="mx-auto flex items-center justify-between px-4 md:px-8">
          <div>
            <h1 className="text-xl font-bold text-[#1B6D24] tracking-tight">KizFarm Blogs</h1>
            <p className="text-xs text-slate-500">Agronomy updates, tech reviews, and insights</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-8">
        {/* Banner Section */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 to-green-800 text-white p-8 md:p-12 shadow-md relative">
          <div className="max-w-2xl space-y-4 z-10 relative">
            <span className="text-xs font-bold uppercase tracking-wider text-green-300">
              KizFarm Knowledge Base
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
              Stay Informed with Agronomy & Agri-Tech Insights
            </h2>
            <p className="text-green-50 text-sm md:text-base leading-relaxed opacity-90">
              Explore professional articles written by agricultural experts to enhance crop yields, optimize inputs, and master agribusiness management.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4">
            <span className="material-symbols-outlined text-[300px]">agriculture</span>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm md:items-center md:justify-between">
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
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-xs outline-none focus:border-[#1B6D24] focus:ring-1 focus:ring-[#1B6D24]"
              placeholder="Search articles..."
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-zinc-400 text-[18px]">
              search
            </span>
          </div>
        </div>

        {/* Grid of articles */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1B6D24] mb-4"></div>
            <p className="text-zinc-500 font-medium">Loading articles...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-red-100 p-8">
            <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-zinc-500">
            <span className="material-symbols-outlined text-zinc-400 text-5xl mb-4">article</span>
            <p className="text-lg font-bold text-zinc-800">No blog posts found</p>
            <p className="text-zinc-500 text-sm mt-1">Try choosing another category or keyword.</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => {
              const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <article
                  key={post._id}
                  onClick={() => setSelectedSlug(post.slug)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-emerald-600 transition-all duration-300 cursor-pointer"
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
          </section>
        )}
      </main>
    </div>
  );
}
