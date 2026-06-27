"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/kizfarm/api";
import AdminBlogEditor from "@/components/admin-blog-editor";

interface BlogPost {
  _id: string;
  title: string;
  summary: string;
  content: string; // JSON blocks
  coverImage?: string;
  category: string;
  readTime: number;
  status: "draft" | "published";
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPost() {
      try {
        setLoading(true);
        const { res, payload } = await apiFetch(`/blog/${id}`);
        if (!res.ok) {
          throw new Error(payload.error || "Failed to load blog post");
        }
        setPost(payload.post);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px] bg-white rounded-3xl border border-gray-200 shadow-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-850 mb-4"></div>
        <p className="text-zinc-500 font-medium">Loading post data...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
        <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Error Loading Blog Post</h3>
        <p className="text-zinc-600 mb-6">{error || "Blog post not found."}</p>
        <button
          onClick={() => router.push("/admin/blog")}
          className="inline-flex items-center gap-2 text-emerald-800 font-bold hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Blogs
        </button>
      </div>
    );
  }

  return <AdminBlogEditor initialData={post} isEdit={true} />;
}
