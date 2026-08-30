"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getConversations } from '@/lib/kizfarm/supabase-data';

interface ChatData {
  _id: string;
  buyerId: any;
  farmerId: any;
  productId: any;
  lastMessage?: string;
  lastMessageTime?: string;
  updatedAt?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        setError(null);
        const { res, payload } = await getConversations();
        if (!res.ok) {
          setError(payload?.error || 'Failed to load conversations');
          return;
        }
        setChats(payload.chats || []);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredChats = chats.filter((chat) => {
    const search = searchTerm.toLowerCase();
    return (
      chat.farmerId?.name?.toLowerCase().includes(search) ||
      chat.productId?.name?.toLowerCase().includes(search) ||
      chat.lastMessage?.toLowerCase().includes(search)
    );
  });

  return (
    <>
      {/* TopAppBar */}
      <nav className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center w-full px-6 py-3 h-16 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img alt="KIZ FARM" className="h-10 w-auto object-contain" src="/logo.jpeg" />
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-500 dark:text-zinc-400 hover:opacity-80 transition-opacity active:scale-95 duration-150">
            <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
          </button>
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto px-margin lg:px-xl pb-20">
        {/* Header & Search */}
        <section className="py-md lg:py-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-md">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Messages</h1>
            <div className="relative w-full md:max-w-md">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline" data-icon="search">search</span>
              <input
                className="w-full h-12 pl-12 pr-4 bg-white border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-md text-body-md"
                placeholder="Search conversations..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Categories / Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            <button className="px-6 py-2 bg-primary text-on-primary rounded-full font-label-sm text-label-sm whitespace-nowrap">All Chats</button>
            <button className="px-6 py-2 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm whitespace-nowrap">Farmers</button>
            <button className="px-6 py-2 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm whitespace-nowrap">Orders</button>
            <button className="px-6 py-2 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm whitespace-nowrap">Support</button>
          </div>
        </section>

        {/* Chat List - Bento Style Modern Cards */}
        <section className="grid grid-cols-1 gap-xs">
          {loading ? (
            <div className="py-16 text-center text-on-surface-variant">Loading conversations...</div>
          ) : error ? (
            <div className="py-16 text-center text-error">{error}</div>
          ) : filteredChats.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant">No conversations yet</div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat._id}
                onClick={() => router.push(`/buyer/chat/${chat._id}`)}
                className="group bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-4 hover:shadow-[0_10px_30px_rgba(27,109,36,0.05)] transition-all cursor-pointer text-left"
              >
                <div className="relative">
                  <img alt={`${chat.farmerId?.name || 'Farmer'} Profile`} className="w-14 h-14 rounded-full object-cover" src="https://via.placeholder.com/56" />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-headline-md text-[18px] text-on-surface truncate">
                      {chat.farmerId?.name || 'Farmer'}
                    </h3>
                    <span className="font-label-xs text-label-xs text-primary">
                      {formatTime(chat.lastMessageTime || chat.updatedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="font-body-md text-body-md text-on-surface-variant truncate max-w-[80%]">
                      {chat.lastMessage || `Conversation about ${chat.productId?.name || 'this product'}`}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </section>
      </main>
    </>
  );
}
