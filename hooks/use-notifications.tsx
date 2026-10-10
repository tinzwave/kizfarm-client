"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/kizfarm/supabase-client";

// Stored notifications (public.notifications), created by database
// triggers whenever something happens to the user's orders, chats, courses
// or farmer account. Kept live with Realtime so the bell and the
// notifications page update the moment e.g. a transport fare is added.

export type AppNotification = {
  id: string;
  type: "order" | "payment" | "message" | "course" | "farmer" | "refund";
  title: string;
  body: string | null;
  linkType: string | null;
  linkId: string | null;
  readAt: string | null;
  createdAt: string;
};

function toNotification(n: any): AppNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    linkType: n.link_type,
    linkId: n.link_id,
    readAt: n.read_at,
    createdAt: n.created_at,
  };
}

// Where tapping a notification goes in the web app.
export function notificationHref(n: Pick<AppNotification, "linkType" | "linkId">): string {
  const id = n.linkId ? encodeURIComponent(n.linkId) : "";
  switch (n.linkType) {
    case "buyer_order":
      return `/buyer/track-order?id=${id}`;
    case "farmer_order":
      return `/farmer/orders/${id}`;
    case "chat":
      return `/buyer/chat/${id}`;
    case "course":
      return `/learning/course?courseId=${id}&access=1`;
    case "my_courses":
      return "/buyer/courses";
    case "farmer_status":
      return "/farmer/verify";
    case "refunds":
      return "/buyer/refunds";
    default:
      return "/";
  }
}

// Farmers read chats under /farmer/chats; everything else is shared.
export function notificationHrefFor(role: "buyer" | "farmer", n: AppNotification) {
  if (role === "farmer" && n.linkType === "chat" && n.linkId) return `/farmer/chats/${encodeURIComponent(n.linkId)}`;
  return notificationHref(n);
}

export function useNotifications({ limit = 50, countOnly = false }: { limit?: number; countOnly?: boolean } = {}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const [listRes, countRes] = await Promise.all([
      countOnly
        ? Promise.resolve({ data: [], error: null })
        : supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    if (listRes.error) setError(listRes.error.message);
    else {
      setError(null);
      if (!countOnly) setItems((listRes.data || []).map(toNotification));
    }
    setUnreadCount(countRes.count ?? 0);
    setLoading(false);
  }, [limit, countOnly]);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      await load();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      channel = supabase
        // Unique per hook instance: the bell and the page both listen at once,
        // and same-named channels would be torn down together.
        .channel(`notifications:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => {
            load();
          },
        )
        .subscribe();
    })();

    // Catch up after the tab was in the background.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
    await createClient().from("notifications").update({ read_at: now }).is("read_at", null);
  }, []);

  return { items, unreadCount, loading, error, reload: load, markRead, markAllRead };
}

// Just the unread count, for nav badges.
export function useUnreadNotificationCount() {
  return useNotifications({ countOnly: true }).unreadCount;
}

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
