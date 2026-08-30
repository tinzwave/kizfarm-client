"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBuyerRecentActivity } from "@/lib/kizfarm/supabase-data";

interface ActivityItem {
  id: string;
  type: "order" | "refund" | "chat";
  message: string;
  amount: number | null;
  createdAt: string;
  link: string;
}

const TYPE_ICON: Record<ActivityItem["type"], string> = {
  order: "shopping_bag",
  refund: "money_off",
  chat: "forum",
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

export default function NotificationPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      try {
        const { res, payload } = await getBuyerRecentActivity();
        if (res.ok) {
          setItems((payload.items as ActivityItem[]) || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  return (
    <>
      {/* TopAppBar */}
      <header className="sticky top-0 left-0 w-full z-50 bg-white border-b border-gray-200 flex justify-between items-center px-6 py-3 h-16">
        <div className="flex items-center gap-3">
          <img alt="KIZ FARM Logo" className="h-10 w-auto object-contain" src="/logo.jpeg" />
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto pt-8 pb-24 px-margin md:px-lg">
        <section className="mb-lg">
          <h1 className="font-headline-lg text-primary mb-xs">Notifications</h1>
          <p className="font-body-md text-on-surface-variant">Recent activity on your orders, refunds and chats.</p>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">autorenew</span>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">notifications_off</span>
            <p className="text-lg font-semibold text-on-surface mb-2">No recent activity</p>
            <p className="text-sm text-on-surface-variant">Updates on your orders, refunds, and chats will show up here.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                className="flex items-start gap-4 p-md hover:bg-surface-container-low transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">{TYPE_ICON[item.type]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-on-surface">{item.message}</p>
                  {item.amount != null && (
                    <p className="font-label-sm text-on-surface-variant">₦{item.amount.toLocaleString()}</p>
                  )}
                </div>
                <span className="font-label-xs text-outline shrink-0">{timeAgo(item.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
