"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/kizfarm/api";

interface Block {
  type: "heading" | "paragraph" | "image" | "video";
  value: string;
  level?: number;
}

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImage?: string;
  category: string;
  readTime: number;
  author: string;
  createdAt: string;
}

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function BlogDetail({ slug, onBack }: { slug: string; onBack?: () => void }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPost() {
      try {
        setLoading(true);
        const { res, payload } = await apiFetch(`/blog/${slug}`);
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
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1B6D24] mb-4"></div>
        <p className="text-zinc-500 font-medium">Loading article...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Error Loading Article</h3>
        <p className="text-zinc-600 mb-6">{error || "Article not found."}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-[#1B6D24] font-bold hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Blogs
          </button>
        )}
      </div>
    );
  }

  const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const renderBlocks = () => {
    try {
      const blocks: Block[] = JSON.parse(post.content);
      return blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            const level = block.level || 2;
            const sizeClass =
              level === 1
                ? "text-3xl font-extrabold text-zinc-900 mt-8 mb-4 tracking-tight"
                : level === 3
                ? "text-xl font-bold text-zinc-800 mt-6 mb-2"
                : "text-2xl font-bold text-zinc-900 mt-8 mb-3 tracking-tight";
            const Tag = `h${level}` as any;
            return (
              <Tag key={idx} className={sizeClass}>
                {block.value}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p
                key={idx}
                className="text-zinc-700 text-base leading-relaxed mb-6 whitespace-pre-wrap"
              >
                {block.value}
              </p>
            );
          case "image":
            return (
              <div key={idx} className="my-8 rounded-2xl overflow-hidden shadow-md border border-zinc-100">
                <img
                  src={block.value}
                  alt={post.title}
                  className="w-full object-cover max-h-[500px]"
                />
              </div>
            );
          case "video": {
            const videoId = getYouTubeId(block.value);
            if (videoId) {
              return (
                <div
                  key={idx}
                  className="my-8 rounded-2xl overflow-hidden shadow-lg aspect-video w-full border border-zinc-100"
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube Video"
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  ></iframe>
                </div>
              );
            }
            return (
              <p key={idx} className="text-red-500 text-sm my-4 italic">
                Invalid video link: {block.value}
              </p>
            );
          }
          default:
            return null;
        }
      });
    } catch {
      // Fallback if not JSON
      return (
        <p className="text-zinc-700 text-base leading-relaxed mb-6 whitespace-pre-wrap">
          {post.content}
        </p>
      );
    }
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-zinc-500 hover:text-[#1B6D24] font-semibold text-sm transition-colors group"
        >
          <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
            arrow_back
          </span>
          Back to Blogs
        </button>
      )}

      {/* Header Info */}
      <div className="space-y-4 mb-8">
        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#1B6D24] text-xs font-bold uppercase tracking-wider">
          {post.category}
        </span>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-zinc-900 leading-tight tracking-tight">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 font-medium">
          <span>{post.author}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
          <span>{formattedDate}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            {post.readTime} min read
          </span>
        </div>
      </div>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-lg mb-10 border border-zinc-100">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Excerpt Summary */}
      {post.summary && (
        <p className="text-lg md:text-xl text-zinc-600 font-medium italic border-l-4 border-emerald-500 pl-4 py-1 mb-8 leading-relaxed">
          {post.summary}
        </p>
      )}

      {/* Blog Body Blocks */}
      <div className="prose max-w-none text-zinc-800">{renderBlocks()}</div>
    </article>
  );
}
