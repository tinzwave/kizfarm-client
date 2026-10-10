"use client";

import { useState } from "react";
import { uploadCourseCover } from "@/lib/kizfarm/supabase-mutations";

// Cover image picker for course forms: uploads immediately to the
// course-covers bucket and hands back the public URL, with a preview.
export default function CourseCoverInput({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      onChange(await uploadCourseCover(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">Cover image</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex h-28 w-48 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gradient-to-br from-green-900 to-lime-700">
          {value ? (
            <img src={value} alt="Course cover preview" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[40px] text-white/40">image</span>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50">
            {value ? "Change image" : "Upload image"}
            <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={uploading} />
          </label>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="text-left text-sm font-semibold text-red-600 hover:underline">
              Remove
            </button>
          )}
          <p className="text-xs text-slate-500">JPG or PNG, under 5 MB. Shown on course cards.</p>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
