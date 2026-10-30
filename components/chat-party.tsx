"use client";

import React from "react";

// Shared bits for showing a chat participant: avatar with initials
// fallback (most users have no photo), and the verified-farmer tick.

const TONES = ["bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-sky-100 text-sky-800", "bg-rose-100 text-rose-800", "bg-violet-100 text-violet-800"];

function initials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function toneFor(seed?: string | null) {
  let h = 0;
  for (const ch of seed || "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export function PartyAvatar({
  name,
  photo,
  seed,
  size = 40,
  online = false,
}: {
  name?: string | null;
  photo?: string | null;
  seed?: string | null;
  size?: number;
  online?: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {photo ? (
        <img src={photo} alt={name || ""} className="h-full w-full rounded-full border border-black/5 object-cover" />
      ) : (
        <span
          aria-hidden
          className={`flex h-full w-full items-center justify-center rounded-full font-bold ${toneFor(seed || name)}`}
          style={{ fontSize: Math.max(11, Math.round(size * 0.38)) }}
        >
          {initials(name)}
        </span>
      )}
      {online && (
        <span
          title="Online now"
          className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-green-500"
          style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28) }}
        />
      )}
    </span>
  );
}

export function VerifiedTick({ className = "" }: { className?: string }) {
  return (
    <span title="Verified farmer" className={`material-symbols-outlined text-[18px] text-[#1B6D24] ${className}`} style={{ fontVariationSettings: "'FILL' 1" }}>
      verified
    </span>
  );
}

export const money = (value?: number | null) => `NGN ${Number(value || 0).toLocaleString()}`;
