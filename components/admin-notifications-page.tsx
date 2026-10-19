"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminRecentActivity } from "@/lib/kizfarm/supabase-data";

interface ActivityItem {
  id: string;
  type: "order" | "farmer" | "buyer" | "course";
  message: string;
  amount: number | null;
  createdAt: string;
  link: string;
  needsAction?: boolean;
}

const TYPE_ICON: Record<ActivityItem["type"], string> = {
  order: "shopping_bag",
  farmer: "agriculture",
  buyer: "person",
  course: "school",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const { res, payload } = await getAdminRecentActivity();
      if (res.ok) {
        setItems((payload.items as ActivityItem[]) || []);
      } else {
        setError(payload?.error || "Failed to load notifications");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchActivity());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-emerald-950 tracking-tight">Notifications</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Courses waiting for approval, recent orders, farmer verification requests, and new buyer signups.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-850 mb-4"></div>
          <p className="text-zinc-500 font-medium">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 bg-white rounded-3xl border border-red-100 p-8 shadow-sm">
          <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center text-zinc-500 shadow-sm">
          <span className="material-symbols-outlined text-zinc-400 text-5xl mb-4">notifications_off</span>
          <p className="text-lg font-bold text-zinc-800">No recent activity</p>
          <p className="text-zinc-500 text-sm mt-1">New courses, orders, farmer requests, and buyer signups will show up here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.link}
              className={`flex items-start gap-4 p-5 transition-colors ${item.needsAction ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-zinc-50/70"}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.needsAction ? "bg-amber-100" : "bg-emerald-50"}`}>
                <span className={`material-symbols-outlined text-[20px] ${item.needsAction ? "text-amber-700" : "text-emerald-700"}`}>{TYPE_ICON[item.type]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-800">{item.message}</p>
                {item.needsAction && (
                  <p className="mt-1 text-xs font-bold text-amber-700">Needs your approval · Review now →</p>
                )}
                {item.amount != null && (
                  <p className="text-xs text-zinc-500 mt-0.5">₦{item.amount.toLocaleString()}</p>
                )}
              </div>
              <span className="text-xs text-zinc-400 shrink-0">{timeAgo(item.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
