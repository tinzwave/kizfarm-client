"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { notificationHrefFor, useNotifications, type AppNotification } from "@/hooks/use-notifications";

const TYPE_ICON: Record<AppNotification["type"], string> = {
  order: "shopping_bag",
  payment: "payments",
  message: "forum",
  course: "school",
  farmer: "agriculture",
  refund: "money_off",
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

export default function NotificationPage({ role = "buyer" }: { role?: "buyer" | "farmer" }) {
  const router = useRouter();
  const { items, unreadCount, loading, error, reload, markRead, markAllRead } = useNotifications();

  const open = (n: AppNotification) => {
    if (!n.readAt) void markRead(n.id);
    router.push(notificationHrefFor(role, n));
  };

  return (
    <>
      {/* TopAppBar */}
      <header className="sticky top-0 left-0 w-full z-50 bg-white border-b border-gray-200 flex justify-between items-center px-6 py-3 h-16">
        <div className="flex items-center gap-3">
          <img alt="KIZ FARM Logo" className="h-10 w-auto object-contain" src="/logo.jpeg" />
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto pt-8 pb-24 px-margin md:px-lg">
        <section className="mb-lg flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-headline-lg text-primary mb-xs">Notifications</h1>
            <p className="font-body-md text-on-surface-variant">
              {unreadCount > 0 ? `${unreadCount} unread` : "Updates on your orders, payments, chats and courses."}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#1B6D24] hover:bg-green-50"
            >
              Mark all as read
            </button>
          )}
        </section>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden" aria-label="Loading notifications">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-md animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="h-3 w-2/3 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">wifi_off</span>
            <p className="text-lg font-semibold text-on-surface mb-4">Couldn&apos;t load notifications</p>
            <button onClick={() => void reload()} className="rounded-lg bg-[#1B6D24] px-5 py-2 text-sm font-semibold text-white">
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">notifications_off</span>
            <p className="text-lg font-semibold text-on-surface mb-2">You&apos;re all caught up</p>
            <p className="text-sm text-on-surface-variant">Updates on your orders, payments, chats and courses will show up here.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {items.map((item) => {
              const unread = !item.readAt;
              const urgent = unread && item.type === "payment" && /pay now/i.test(item.title);
              return (
                <button
                  key={item.id}
                  onClick={() => open(item)}
                  className={`w-full text-left flex items-start gap-4 p-md transition-colors hover:bg-surface-container-low ${unread ? "bg-green-50/60" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${urgent ? "bg-amber-100" : "bg-primary-container"}`}>
                    <span className={`material-symbols-outlined text-[20px] ${urgent ? "text-amber-700" : "text-primary"}`}>{TYPE_ICON[item.type] ?? "notifications"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-body-md text-on-surface ${unread ? "font-semibold" : ""}`}>{item.title}</p>
                    {item.body && <p className="text-sm text-on-surface-variant mt-0.5">{item.body}</p>}
                    {urgent && <span className="mt-2 inline-block rounded-md bg-[#1B6D24] px-3 py-1 text-xs font-bold text-white">Pay now</span>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-label-xs text-outline">{timeAgo(item.createdAt)}</span>
                    {unread && <span className="h-2.5 w-2.5 rounded-full bg-[#1B6D24]" aria-label="Unread" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
