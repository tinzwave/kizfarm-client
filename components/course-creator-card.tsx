"use client";

import type { CreatorProfile } from "@/lib/kizfarm/supabase-data";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function CreatorAvatar({ creator, size = 64 }: { creator: Pick<CreatorProfile, "name" | "photo">; size?: number }) {
  if (creator.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={creator.photo} alt={creator.name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover ring-2 ring-white shadow" />;
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-700 to-lime-600 font-bold text-white ring-2 ring-white shadow"
    >
      {initials(creator.name) || "K"}
    </span>
  );
}

// "Meet your instructor" card for community courses -- the counterpart of
// the admin courses' tutor card.
export default function CourseCreatorCard({ creator }: { creator: CreatorProfile }) {
  const since = creator.memberSince ? new Date(creator.memberSince).getFullYear() : null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Meet your instructor</p>
      <div className="mt-4 flex items-center gap-4">
        <CreatorAvatar creator={creator} size={72} />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-slate-900">{creator.name}</p>
          {creator.verifiedFarmer ? (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800">
              <span className="material-symbols-outlined text-[14px]">verified</span> Verified farmer
            </p>
          ) : (
            <p className="mt-1 text-xs font-semibold text-slate-500">{creator.role === "farmer" ? "Farmer" : "KizFarm member"}</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-slate-600">
        {creator.farmName && (
          <p className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-green-700">agriculture</span> {creator.farmName}
          </p>
        )}
        {creator.location && (
          <p className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-green-700">location_on</span> {creator.location}
          </p>
        )}
        <p className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-green-700">school</span>
          {creator.coursesPublished} published course{creator.coursesPublished === 1 ? "" : "s"}
          {since ? ` · On KizFarm since ${since}` : ""}
        </p>
      </div>

      {creator.bio && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{creator.bio}</p>}
    </div>
  );
}
