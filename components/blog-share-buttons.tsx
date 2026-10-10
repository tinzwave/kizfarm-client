"use client";

import { useState } from "react";

const SITE_URL = "https://www.kizfarm.com";

// Share a blog post: native share sheet where the browser supports it
// (phones), direct WhatsApp / Facebook / X / LinkedIn links, and copy link.
// Always shares the public /blog/<slug> URL -- even when read from inside
// the buyer or farmer portal -- so anyone can open it without an account.
export default function BlogShareButtons({ title, slug, summary }: { title: string; slug: string; summary?: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/blog/${encodeURIComponent(slug)}`;
  const text = `${title} — KIZ FARM`;
  const enc = encodeURIComponent;

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function nativeShare() {
    try {
      await navigator.share({ title, text: summary || text, url });
    } catch {
      // cancelled
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const links = [
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${text}\n${url}`)}`, bg: "bg-[#25D366]", icon: "chat" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, bg: "bg-[#1877F2]", icon: "thumb_up" },
    { name: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`, bg: "bg-black", icon: "tag" },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, bg: "bg-[#0A66C2]", icon: "work" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Share this article">
      <span className="mr-1 text-sm font-semibold text-zinc-600">Share:</span>
      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          className="flex items-center gap-1.5 rounded-full bg-[#1B6D24] px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800"
        >
          <span className="material-symbols-outlined text-[16px]">share</span>
          Share
        </button>
      )}
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 ${l.bg}`}
        >
          <span className="material-symbols-outlined text-[16px]">{l.icon}</span>
          {l.name}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
      >
        <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "link"}</span>
        {copied ? "Link copied!" : "Copy link"}
      </button>
    </div>
  );
}
