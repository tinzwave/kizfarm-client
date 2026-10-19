"use client";

import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, ImageIcon, Italic, List, Upload, Video, X } from "lucide-react";
import React, { useRef, useState } from "react";
import { uploadCourseCover } from "@/lib/kizfarm/supabase-mutations";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export default function LearningRichEditor({ value, onChange, onUploadingChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlModal, setUrlModal] = useState<{ type: "image" | "youtube"; value: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Youtube.configure({ width: 640, height: 360 }),
    ],
    content: value || "<p>Write course content here...</p>",
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-64 rounded-b-lg border border-t-0 border-gray-300 bg-white px-4 py-3 text-sm leading-7 outline-none prose prose-sm max-w-none",
      },
    },
  });

  if (!editor) return null;

  // Upload to storage and insert the hosted URL. Embedding the photo as
  // base64 put multi-megabyte images inside the course content, so saving
  // a course with phone photos took minutes on mobile data or failed.
  const insertLocalImage = async (file?: File) => {
    if (!file) return;
    setImageError("");
    setUploadingImage(true);
    onUploadingChange?.(true);
    try {
      const src = await uploadCourseCover(file);
      editor.chain().focus().setImage({ src }).run();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not upload the image.");
    } finally {
      setUploadingImage(false);
      onUploadingChange?.(false);
    }
  };

  const buttonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-slate-600 hover:bg-green-50 hover:text-green-800";

  function confirmUrlModal() {
    if (!urlModal) return;
    const value = urlModal.value.trim();
    if (value) {
      if (urlModal.type === "image") {
        editor?.chain().focus().setImage({ src: value }).run();
      } else {
        editor?.commands.setYoutubeVideo({ src: value });
      }
    }
    setUrlModal(null);
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 rounded-t-lg border border-gray-300 bg-slate-50 p-2">
        <button
          className={buttonClass}
          type="button"
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </button>
        <button
          className={buttonClass}
          type="button"
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </button>
        <button
          className={buttonClass}
          type="button"
          title="Heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </button>
        <button
          className={buttonClass}
          type="button"
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </button>
        <button
          className={buttonClass}
          type="button"
          title="Insert image by URL"
          onClick={() => setUrlModal({ type: "image", value: "" })}
        >
          <ImageIcon size={16} />
        </button>
        <button
          className={buttonClass}
          type="button"
          title="Upload image"
          disabled={uploadingImage}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} />
        </button>
        <button
          className={buttonClass}
          type="button"
          title="Embed YouTube video"
          onClick={() => setUrlModal({ type: "youtube", value: "" })}
        >
          <Video size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            insertLocalImage(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {uploadingImage && <p className="border-x border-gray-300 bg-green-50 px-4 py-2 text-xs font-semibold text-green-800">Uploading image...</p>}
      {imageError && <p className="border-x border-gray-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">{imageError}</p>}
      <EditorContent editor={editor} />

      {urlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {urlModal.type === "image" ? "Insert image by URL" : "Embed YouTube video"}
              </h3>
              <button type="button" onClick={() => setUrlModal(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <input
              autoFocus
              value={urlModal.value}
              onChange={(e) => setUrlModal({ ...urlModal, value: e.target.value })}
              onKeyDown={(e) => {
                // The editor sits inside the course form: without
                // preventDefault, Enter here would submit the whole course.
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmUrlModal();
                }
                if (e.key === "Escape") setUrlModal(null);
              }}
              placeholder={urlModal.type === "image" ? "https://example.com/image.jpg" : "https://youtube.com/watch?v=..."}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-700"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUrlModal(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUrlModal}
                className="rounded-lg bg-green-800 px-4 py-2 text-sm font-bold text-white hover:bg-green-900"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
