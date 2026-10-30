"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getConversations } from "@/lib/kizfarm/supabase-data";
import { getCurrentProfile } from "@/lib/kizfarm/supabase-auth";
import { createClient } from "@/lib/kizfarm/supabase-client";
import { PartyAvatar, money } from "@/components/chat-party";

type CurrentRole = "buyer" | "farmer";

interface ChatParty {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  photo?: string | null;
}

interface ChatData {
  _id: string;
  buyerId: ChatParty;
  farmerId: ChatParty;
  productId: { _id: string; name?: string; price?: number; unit?: string; images?: string[] };
  lastMessage?: string;
  lastMessageTime?: string;
  updatedAt?: string;
  unreadCount?: number;
}

type Props = {
  currentRole: CurrentRole;
};

// Shared by both /buyer/chat and /farmer/chats -- a farmer account can also
// shop as a buyer (the marketplace link is right in their own sidebar), and
// getConversations() returns every chat the viewer is a participant in on
// EITHER side in one unified list. The list must never assume a fixed
// "viewer is always the buyer" / "viewer is always the farmer" role --
// otherwise a farmer's own chats where THEY are the buyer show their own
// name back at them instead of the actual seller's. Compare against the
// real participant ids instead, same fix applied to ChatDetailPage's
// getOtherUser().
export default function ChatListPage({ currentRole }: Props) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatData[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // `quiet` reloads (from live updates) keep the list on screen.
  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const [profile, { res, payload }] = await Promise.all([getCurrentProfile(), getConversations()]);
      if (profile?.id) setCurrentUserId(profile.id);
      if (!res.ok) {
        if (!quiet) setError(payload?.error || "Failed to load conversations");
        return;
      }
      setChats(payload.chats || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      if (!quiet) setError("Failed to load conversations");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  // New messages and new conversations show up without a refresh. RLS
  // limits the change feed to chats this user is part of.
  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(true), 400);
    };
    const channel = supabase
      .channel(`chat-list:${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${currentUserId}` }, reload)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, load]);

  const otherParty = (chat: ChatData): ChatParty | undefined => {
    if (currentUserId) {
      if (chat.buyerId?._id === currentUserId) return chat.farmerId;
      if (chat.farmerId?._id === currentUserId) return chat.buyerId;
    }
    // currentUserId hasn't loaded yet -- fall back to the role this page
    // was opened as so there's no flash of the wrong name while loading.
    return currentRole === "farmer" ? chat.buyerId : chat.farmerId;
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredChats = chats.filter((chat) => {
    const search = searchTerm.toLowerCase();
    if (!search) return true;
    const other = otherParty(chat);
    return (
      other?.name?.toLowerCase().includes(search) ||
      chat.productId?.name?.toLowerCase().includes(search) ||
      chat.lastMessage?.toLowerCase().includes(search)
    );
  });

  const detailHref = (chatId: string) => (currentRole === "farmer" ? `/farmer/chats/${chatId}` : `/buyer/chat/${chatId}`);

  const emptyStateCopy =
    currentRole === "farmer"
      ? "Buyers will message you when interested in your products"
      : "Message a farmer from a product page to start a conversation";

  const search = (
    <div className="relative w-full md:w-72">
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
      <input
        className="w-full h-11 pl-11 pr-4 bg-white border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md"
        placeholder="Search conversations..."
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );

  const list =
    loading ? (
      <div className="flex items-center justify-center gap-2 py-16 text-center text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin">autorenew</span>
        Loading conversations...
      </div>
    ) : error ? (
      <div className="py-16 text-center text-error">{error}</div>
    ) : filteredChats.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">forum</span>
        <p className="text-on-surface-variant font-semibold">No conversations yet</p>
        <p className="text-label-sm text-gray-400 mt-1">{emptyStateCopy}</p>
      </div>
    ) : (
      // Plain document flow -- no inner h-full/overflow-y-auto scroll pane.
      // The old split-pane farmer layout relied on percentage heights
      // cascading correctly from FarmerLayout's <main>, which only ever
      // has min-height, not height -- on mobile that collapsed the
      // scrollable region and any chat past the fold became unreachable
      // (the "disappears after four chats" symptom). Letting the whole
      // page scroll, same as this list already did on the buyer side, has
      // no such height dependency.
      <div className="flex flex-col gap-2">
        {filteredChats.map((chat) => {
          const other = otherParty(chat);
          return (
            <button
              key={chat._id}
              onClick={() => router.push(detailHref(chat._id))}
              className="group bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-4 hover:shadow-[0_10px_30px_rgba(27,109,36,0.05)] transition-all text-left"
            >
              <PartyAvatar name={other?.name} photo={other?.photo} seed={other?._id} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2 mb-1">
                  <h3 className={`text-[15px] text-on-surface truncate ${chat.unreadCount ? "font-bold" : "font-semibold"}`}>
                    {other?.name || (currentRole === "farmer" ? "Buyer" : "Farmer")}
                  </h3>
                  <span className="text-[11px] text-gray-400 shrink-0">{formatTime(chat.lastMessageTime || chat.updatedAt)}</span>
                </div>
                {chat.productId?.name && (
                  <p className="mb-0.5 flex items-center gap-1 truncate text-xs text-[#1B6D24]">
                    <span className="material-symbols-outlined text-[14px]">sell</span>
                    <span className="truncate">
                      {chat.productId.name}
                      {chat.productId.price != null ? ` · ${money(chat.productId.price)}${chat.productId.unit ? `/${chat.productId.unit}` : ""}` : ""}
                    </span>
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${chat.unreadCount ? "text-on-surface font-semibold" : "text-gray-500"}`}>
                    {chat.lastMessage || "No messages yet"}
                  </p>
                  {!!chat.unreadCount && (
                    <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                      {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              {chat.productId?.images?.[0] && (
                <img src={chat.productId.images[0]} alt="" className="hidden h-12 w-12 shrink-0 rounded-lg object-cover sm:block" />
              )}
            </button>
          );
        })}
      </div>
    );

  if (currentRole === "buyer") {
    return (
      <div className="bg-white text-on-surface font-body-md min-h-screen">
        <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto z-50 sticky top-0">
          <div className="flex items-center gap-3">
            <img alt="KIZ FARM" className="h-10 w-auto object-contain" src="/logo.jpeg" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 md:px-6 pb-24 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Messages</h1>
            {search}
          </div>
          {list}
        </main>
      </div>
    );
  }

  // Farmer: no self-rendered sticky/fixed header -- FarmerLayout already
  // supplies the seller-portal chrome (desktop sidebar, mobile top bar) on
  // this route, and stacking another fixed header on top of it is exactly
  // the bug already fixed on the chat detail page (see farmer-sidebar.tsx).
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pb-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Messages</h1>
        {search}
      </div>
      {list}
    </div>
  );
}
