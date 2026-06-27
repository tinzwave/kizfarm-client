"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/kizfarm/api";

interface BlogPost {
  _id: string;
  title: string;
  category: string;
  status: "draft" | "published";
  createdAt: string;
  readTime: number;
  coverImage?: string;
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPosts() {
    try {
      setLoading(true);
      const { res, payload } = await apiFetch("/blog/admin");
      if (!res.ok) {
        throw new Error(payload.error || "Failed to load posts");
      }
      setPosts(payload.posts || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const { res, payload } = await apiFetch(`/blog/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(payload.error || "Failed to delete post");
      }
      await loadPosts();
    } catch (err: any) {
      alert(err.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-emerald-950 tracking-tight">Blogs Management</h1>
          <p className="text-xs text-secondary mt-1">
            Create, publish, edit, or delete articles on the KizFarm dynamic blog.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/blog/new")}
          className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-900 transition-colors shadow-md flex items-center gap-2 max-w-max"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Create Blog Post
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-850 mb-4"></div>
          <p className="text-zinc-500 font-medium">Loading blogs...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 bg-white rounded-3xl border border-red-100 p-8 shadow-sm">
          <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center text-zinc-500 shadow-sm">
          <span className="material-symbols-outlined text-zinc-400 text-5xl mb-4">article</span>
          <p className="text-lg font-bold text-zinc-800">No blog posts found</p>
          <p className="text-zinc-500 text-sm mt-1">Get started by creating your very first article.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-xs font-bold uppercase border-b border-gray-200">
                  <th className="py-4 px-6">Cover</th>
                  <th className="py-4 px-6">Title</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Read Time</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Created At</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm text-zinc-700">
                {posts.map((post) => {
                  const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <tr key={post._id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 px-6">
                        {post.coverImage ? (
                          <div className="w-16 h-10 rounded-lg overflow-hidden border border-zinc-200 shadow-sm bg-zinc-50">
                            <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-10 rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400">
                            <span className="material-symbols-outlined text-[20px]">image</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 font-semibold text-zinc-900 max-w-xs truncate">
                        {post.title}
                      </td>
                      <td className="py-4 px-6 text-zinc-600 font-medium">{post.category}</td>
                      <td className="py-4 px-6 text-zinc-500">{post.readTime} min</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase ${
                            post.status === "published"
                              ? "bg-green-50 text-green-700 border border-green-150"
                              : "bg-amber-50 text-amber-700 border border-amber-150"
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-zinc-500">{formattedDate}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/blog/edit/${post._id}`)}
                            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-600"
                            title="Edit Post"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(post._id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-650"
                            title="Delete Post"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
