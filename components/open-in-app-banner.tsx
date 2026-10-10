"use client";

import { useEffect, useState } from "react";

// On phones, offers to open the current blog post in the KIZ FARM app via
// its kizfarm:// deep link. Useful when a shared link was opened inside a
// browser (e.g. WhatsApp's in-app browser) instead of going straight to
// the installed app. Hidden on desktop and once dismissed.
export default function OpenInAppBanner({ path }: { path: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("kizfarm_open_in_app_dismissed") === "1";
    } catch {}
    if (isPhone && !dismissed) void Promise.resolve().then(() => setShow(true));
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
      <img src="/logo.jpeg" alt="" className="h-9 w-9 rounded-lg object-contain bg-white" />
      <p className="flex-1 text-sm font-semibold text-green-900">Read this in the KIZ FARM app</p>
      <a href={`kizfarm://${path.replace(/^\//, "")}`} className="rounded-lg bg-[#1B6D24] px-3 py-1.5 text-xs font-bold text-white">
        Open app
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setShow(false);
          try {
            sessionStorage.setItem("kizfarm_open_in_app_dismissed", "1");
          } catch {}
        }}
        className="text-green-800"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
