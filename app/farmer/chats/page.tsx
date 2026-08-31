"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConversations } from "@/lib/kizfarm/supabase-data";

interface ChatData {
  _id: string;
  buyerId: any;
  farmerId: any;
  productId: any;
  lastMessage: string;
  lastMessageTime: string;
  isActive: boolean;
}

export default function ChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { res, payload } = await getConversations();
      if (!res.ok) {
        setError(payload?.error || "Failed to load conversations");
        return;
      }
      setChats(payload.chats || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchConversations());
  }, []);

  const handleChatClick = (chatId: string) => {
    router.push(`/farmer/chats/${chatId}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    const days = diff / (1000 * 60 * 60 * 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (days < 7) return `${Math.floor(days)}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredChats = chats.filter((chat) =>
    chat.buyerId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.productId.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full bg-white">
      <div className="flex h-full overflow-hidden">
        {/* Left: Chat List */}
        <div className="flex flex-col w-full md:w-96 border-r border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="font-headline-md text-on-surface mb-4">Messages</h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-body-md focus:outline-none focus:border-primary"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                  <p className="text-on-surface-variant text-sm">Loading conversations...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center">
                  <p className="text-error mb-3">{error}</p>
                  <button
                    onClick={fetchConversations}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-3 block">
                    forum
                  </span>
                  <p className="text-on-surface-variant">No conversations yet</p>
                  <p className="text-label-sm text-gray-400 mt-1">Buyers will message you when interested in your products</p>
                </div>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat._id}
                  onClick={() => handleChatClick(chat._id)}
                  className="w-full flex items-start gap-4 p-4 border-l-4 border-transparent hover:bg-gray-50 hover:border-primary transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full object-cover border border-gray-100 bg-gray-200 flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-500">account_circle</span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-label-sm truncate text-on-surface">
                        {chat.buyerId.name}
                      </h3>
                      <span className="text-[10px] text-gray-400 ml-2">
                        {formatTime(chat.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-body-md text-gray-600 line-clamp-1">
                      {chat.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Empty State for Desktop */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1 bg-gray-50">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
            <span className="material-symbols-outlined text-4xl text-[#1B6D24]">forum</span>
          </div>
          <h3 className="font-headline-md mb-2">Select a Conversation</h3>
          <p className="text-body-md text-gray-500 max-w-sm text-center">
            Select a buyer&apos;s message to view details and respond to their inquiries
          </p>
        </div>
      </div>
    </div>
  );
}
