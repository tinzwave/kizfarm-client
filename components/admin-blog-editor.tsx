"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/kizfarm/api";

interface Block {
  type: "heading" | "paragraph" | "image" | "video";
  value: string;
  level?: number;
}

interface BlogPost {
  _id?: string;
  title: string;
  summary: string;
  content: string; // JSON blocks
  coverImage?: string;
  category: string;
  readTime: number;
  status: "draft" | "published";
}

interface AdminBlogEditorProps {
  initialData?: BlogPost;
  isEdit?: boolean;
}

export default function AdminBlogEditor({ initialData, isEdit = false }: AdminBlogEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [category, setCategory] = useState(initialData?.category || "General");
  const [readTime, setReadTime] = useState(initialData?.readTime || 5);
  const [status, setStatus] = useState<"draft" | "published">(initialData?.status || "published");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [uploadingCover, setUploadingCover] = useState(false);

  // Initialize blocks
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialData?.content) {
      try {
        return JSON.parse(initialData.content);
      } catch {
        // Fallback if old plain text content
        return [{ type: "paragraph", value: initialData.content }];
      }
    }
    return [{ type: "paragraph", value: "" }];
  });

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Upload file helper
  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    const { res, payload } = await apiFetch("/blog/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error(payload.error || "File upload failed");
    }
    return payload.imageUrl;
  }

  // Handle cover image selection
  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      const url = await uploadFile(file);
      setCoverImage(url);
    } catch (err: any) {
      alert(err.message || "Failed to upload cover image");
    } finally {
      setUploadingCover(false);
    }
  }

  // Handle block image selection
  async function handleBlockImageChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Set temporary state loading or similar
      const updated = [...blocks];
      updated[idx].value = "Uploading image...";
      setBlocks(updated);

      const url = await uploadFile(file);
      updated[idx].value = url;
      setBlocks(updated);
    } catch (err: any) {
      alert(err.message || "Failed to upload block image");
      const updated = [...blocks];
      updated[idx].value = "";
      setBlocks(updated);
    }
  }

  // Block management functions
  function addBlock(type: "heading" | "paragraph" | "image" | "video") {
    const newBlock: Block = { type, value: "" };
    if (type === "heading") {
      newBlock.level = 2; // Default to H2
    }
    setBlocks([...blocks, newBlock]);
  }

  function removeBlock(idx: number) {
    const updated = blocks.filter((_, i) => i !== idx);
    setBlocks(updated.length === 0 ? [{ type: "paragraph", value: "" }] : updated);
  }

  function updateBlockValue(idx: number, val: string) {
    const updated = [...blocks];
    updated[idx].value = val;
    setBlocks(updated);
  }

  function updateHeadingLevel(idx: number, level: number) {
    const updated = [...blocks];
    updated[idx].level = level;
    setBlocks(updated);
  }

  function moveBlock(idx: number, direction: "up" | "down") {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === blocks.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...blocks];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setBlocks(updated);
  }

  // Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) {
      setMessage("Please enter a title.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const payloadBody = {
        title,
        summary,
        category,
        readTime: Number(readTime),
        status,
        coverImage,
        content: JSON.stringify(blocks),
      };

      const url = isEdit ? `/blog/${initialData?._id}` : "/blog";
      const method = isEdit ? "PATCH" : "POST";

      const { res, payload } = await apiFetch(url, {
        method,
        body: JSON.stringify(payloadBody),
      });

      if (!res.ok) {
        throw new Error(payload.error || "Failed to save blog post");
      }

      setMessage(isEdit ? "Blog post updated successfully!" : "Blog post published successfully!");
      setTimeout(() => {
        router.push("/admin/blog");
      }, 1000);
    } catch (err: any) {
      setMessage(err.message || "Failed to save post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-black text-emerald-950">
          {isEdit ? "Edit Blog Post" : "Create New Blog Post"}
        </h2>
        <button
          type="button"
          onClick={() => router.push("/admin/blog")}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">close</span> Cancel
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm font-semibold border ${
            message.includes("success")
              ? "bg-green-50 text-green-900 border-green-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Image Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-zinc-800">Cover Image Banner</label>
          {coverImage ? (
            <div className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-zinc-100 group shadow-sm max-w-full">
              <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                <label className="bg-white text-zinc-800 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-zinc-100 shadow">
                  Change Image
                  <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 shadow"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-[21/9] rounded-2xl border-2 border-dashed border-zinc-300 hover:border-emerald-600 cursor-pointer bg-zinc-50 hover:bg-zinc-50/50 transition-colors p-6 text-center shadow-inner">
              <span className="material-symbols-outlined text-4xl text-zinc-400 mb-2">cloud_upload</span>
              <span className="text-sm font-bold text-zinc-700">
                {uploadingCover ? "Uploading cover image..." : "Upload Cover Banner"}
              </span>
              <span className="text-xs text-zinc-400 mt-1">PNG, JPG, JPEG up to 10MB</span>
              <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Title, Category, Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-zinc-800 mb-1" htmlFor="post-title">
              Article Title
            </label>
            <input
              required
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="e.g. 5 Smart Irrigation Practices to Increase Cassava Yields"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-800 mb-1" htmlFor="post-category">
              Category
            </label>
            <select
              id="post-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
            >
              <option value="General">General</option>
              <option value="Irrigation Tech">Irrigation Tech</option>
              <option value="Soil Health">Soil Health</option>
              <option value="Agri-Tech">Agri-Tech</option>
              <option value="Crop Science">Crop Science</option>
              <option value="Agribusiness">Agribusiness</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-800 mb-1" htmlFor="post-readtime">
              Read Time (minutes)
            </label>
            <input
              required
              id="post-readtime"
              type="number"
              min="1"
              value={readTime}
              onChange={(e) => setReadTime(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-800 mb-1" htmlFor="post-status">
              Publishing Status
            </label>
            <select
              id="post-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Short Summary Excerpt */}
        <div>
          <label className="block text-sm font-bold text-zinc-800 mb-1" htmlFor="post-summary">
            Short Summary / Excerpt
          </label>
          <textarea
            id="post-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            placeholder="A brief overview of the post to show in the listings..."
            rows={2}
          />
        </div>

        {/* Content Blocks Section */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Content Blocks</h3>
          <p className="text-xs text-zinc-500 mb-4">
            Build your post article page by adding dynamic text paragraphs, heading texts, image uploads, and embedded YouTube videos.
          </p>

          <div className="space-y-4">
            {blocks.map((block, idx) => {
              return (
                <div
                  key={idx}
                  className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex flex-col gap-3 relative group"
                >
                  {/* Block Metadata & Reorder controls */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <span className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">
                        {block.type === "heading"
                          ? "title"
                          : block.type === "image"
                          ? "image"
                          : block.type === "video"
                          ? "video_library"
                          : "notes"}
                      </span>
                      {block.type} Block
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 rounded hover:bg-zinc-200 disabled:opacity-30 text-zinc-600"
                        title="Move Block Up"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, "down")}
                        disabled={idx === blocks.length - 1}
                        className="p-1.5 rounded hover:bg-zinc-200 disabled:opacity-30 text-zinc-600"
                        title="Move Block Down"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(idx)}
                        className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors ml-2"
                        title="Delete Block"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Rendering Content fields depending on block type */}
                  {block.type === "heading" && (
                    <div className="flex gap-4 items-center">
                      <select
                        value={block.level || 2}
                        onChange={(e) => updateHeadingLevel(idx, Number(e.target.value))}
                        className="rounded-lg border border-zinc-300 px-3 py-2 bg-white text-sm outline-none font-bold"
                      >
                        <option value={1}>H1 (Main)</option>
                        <option value={2}>H2 (Section)</option>
                        <option value={3}>H3 (Sub)</option>
                      </select>
                      <input
                        required
                        value={block.value}
                        onChange={(e) => updateBlockValue(idx, e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-emerald-600 text-base font-semibold"
                        placeholder="Enter heading text..."
                      />
                    </div>
                  )}

                  {block.type === "paragraph" && (
                    <textarea
                      required
                      value={block.value}
                      onChange={(e) => updateBlockValue(idx, e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-600 text-sm leading-relaxed"
                      placeholder="Write paragraph content..."
                      rows={4}
                    />
                  )}

                  {block.type === "image" && (
                    <div className="space-y-2">
                      {block.value ? (
                        block.value.startsWith("Uploading") ? (
                          <div className="flex items-center gap-2 py-4 justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#1B6D24]"></div>
                            <span className="text-zinc-500 text-sm font-medium">{block.value}</span>
                          </div>
                        ) : (
                          <div className="relative rounded-xl overflow-hidden border border-zinc-200 max-w-sm group shadow-sm">
                            <img src={block.value} alt="Block Upload preview" className="w-full object-cover max-h-48" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                              <label className="bg-white text-zinc-800 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-zinc-100">
                                Replace Image
                                <input type="file" accept="image/*" onChange={(e) => handleBlockImageChange(idx, e)} className="hidden" />
                              </label>
                              <button
                                type="button"
                                onClick={() => updateBlockValue(idx, "")}
                                className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 hover:border-emerald-600 rounded-xl py-6 cursor-pointer bg-white hover:bg-zinc-50 transition-colors p-4">
                          <span className="material-symbols-outlined text-zinc-400 text-2xl mb-1">add_a_photo</span>
                          <span className="text-xs font-bold text-zinc-700">Upload Image Block from PC</span>
                          <input type="file" accept="image/*" onChange={(e) => handleBlockImageChange(idx, e)} className="hidden" />
                        </label>
                      )}
                    </div>
                  )}

                  {block.type === "video" && (
                    <div className="space-y-2">
                      <input
                        required
                        value={block.value}
                        onChange={(e) => updateBlockValue(idx, e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-emerald-600 text-sm"
                        placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
                      />
                      {block.value && (
                        <p className="text-[10px] text-zinc-400">
                          Supports watch links, mobile short URLs, and embed codes.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add block action triggers */}
          <div className="flex flex-wrap gap-2 justify-center pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => addBlock("paragraph")}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-100 border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">notes</span> + Paragraph
            </button>
            <button
              type="button"
              onClick={() => addBlock("heading")}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-100 border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">title</span> + Heading
            </button>
            <button
              type="button"
              onClick={() => addBlock("image")}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-100 border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">image</span> + Image
            </button>
            <button
              type="button"
              onClick={() => addBlock("video")}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-100 border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">video_library</span> + YouTube Video
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex gap-4 pt-6 border-t border-gray-100">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-xl bg-emerald-800 text-white py-3.5 text-sm font-bold shadow-md hover:bg-emerald-900 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">
              {isEdit ? "save" : "check_circle"}
            </span>
            {submitting ? "Saving..." : isEdit ? "Save Updates" : "Publish Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
