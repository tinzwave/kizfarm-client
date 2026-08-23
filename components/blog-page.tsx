"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/top-nav";
import SiteFooter from "@/components/site-footer";
import { apiFetch } from "@/lib/kizfarm/api";
import { DEMO_BLOG_POSTS } from "@/lib/kizfarm/demo-content";

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
      setLoading(true);
      let live: BlogPost[] = [];
      try {
        const { res, payload } = await apiFetch("/blog");
        if (res.ok) live = payload.posts || [];
      } catch {}
      setPosts([...live, ...DEMO_BLOG_POSTS]);
      setLoading(false);
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
      <TopNav />

      <main className="pt-16 min-h-screen bg-[#f9fafb]">
        {/* Hero / Intro */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-[#f9fafb] py-16 md:py-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#1B6D24]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative max-w-[1280px] mx-auto px-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 text-xs font-bold tracking-widest uppercase bg-[#a2f4b5] text-[#002108] rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B6D24]"></span>
              KizFarm Insights
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight mb-4">
              Stories from the Field
            </h1>
            <p className="text-zinc-500 text-lg max-w-2xl mx-auto leading-relaxed">
              Expert agronomy updates, agri-tech news, and practical farming
              tips from the KizFarm community.
            </p>
          </div>
        </section>

        <div className="max-w-[1280px] mx-auto px-6 pb-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
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
            <section className="pt-4 pb-4">
              <div
                className="group flex flex-col lg:flex-row gap-8 items-center bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-xl hover:border-[#1B6D24]/30 cursor-pointer transition-all duration-300"
                onClick={() => router.push(`/blog/${featuredPost.slug}`)}
              >
                <div className="lg:w-1/2 space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#1B6D24] text-xs font-bold uppercase tracking-wider">
                    Featured: {featuredPost.category}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black text-zinc-900 leading-tight tracking-tight group-hover:text-[#1B6D24] transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-zinc-600 text-base leading-relaxed line-clamp-3">
                    {featuredPost.summary || "No description available for this featured article."}
                  </p>
                  <div className="pt-2 flex items-center gap-6 text-sm text-zinc-500 font-semibold">
                    <span>By {featuredPost.author}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                    <span>{new Date(featuredPost.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                    <span>{featuredPost.readTime} min read</span>
                  </div>
                  <div className="pt-4">
                    <span className="inline-flex items-center gap-2 bg-[#1B6D24] text-white px-6 py-3 rounded-lg font-bold text-sm shadow-sm shadow-emerald-900/10 group-hover:brightness-110 transition-all">
                      Read Article <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </span>
                  </div>
                </div>
                {featuredPost.coverImage ? (
                  <div className="lg:w-1/2 w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-md border border-zinc-100">
                    <img
                      alt={featuredPost.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      src={featuredPost.coverImage}
                    />
                  </div>
                ) : (
                  <div className="lg:w-1/2 w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-900 to-green-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/20 text-[96px]">article</span>
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
            <div className="sticky top-16 z-20 flex flex-col md:flex-row gap-4 bg-white/95 backdrop-blur p-4 rounded-2xl border border-zinc-200 shadow-sm md:items-center md:justify-between my-10">
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 md:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      selectedCategory === cat
                        ? "bg-[#1B6D24] text-white shadow-sm shadow-emerald-900/10"
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
                      onClick={() => router.push(`/blog/${post.slug}`)}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-lg hover:border-[#1B6D24]/40 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
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

          {!loading && !error && posts.length > 0 && filteredPosts.length === 0 && (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500 my-12">
              <span className="material-symbols-outlined text-zinc-400 text-5xl mb-4">search_off</span>
              <p className="text-lg font-bold text-zinc-800">No articles match your search</p>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
