"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { getChatAttachmentUrl, getChatContext, getMessages, type ChatContext, type ChatPartyCard } from "@/lib/kizfarm/supabase-data";
import { markMessagesAsRead } from "@/lib/kizfarm/supabase-mutations";
import { getCurrentProfile } from "@/lib/kizfarm/supabase-auth";
import { useChat, type ChatMessage, type ChatParticipant } from "@/hooks/use-chat";
import { PartyAvatar, VerifiedTick, money } from "@/components/chat-party";

// One buyer <-> farmer conversation. Every chat belongs to exactly one
// product (chats.product_id), so the product is pinned above the messages
// and both people's public profiles are a tap away (get_chat_context,
// migration 0048).

const PAGE_SIZE = 40;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const BUYER_QUICK_REPLIES = [
  "Hello, is this still available?",
  "Can you deliver to my location?",
  "What's your best price for a bulk order?",
  "When will the next harvest be ready?",
];
const FARMER_QUICK_REPLIES = [
  "Hello, yes it's available.",
  "How many do you need?",
  "Please place the order on KIZ FARM and I'll prepare it.",
  "Where should it be delivered?",
];

function getId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return getId(value._id);
  if (value.id) return String(value.id);
  return "";
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function memberSince(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function roleLine(card: ChatPartyCard) {
  if (card.accountStatus === "deactivated") return "This account was deleted";
  if (card.verifiedFarmer) return [card.farmName, card.location].filter(Boolean).join(" · ") || "Verified farmer";
  return ["Buyer", card.location].filter(Boolean).join(" · ");
}

function ProfileCard({ card, title, isMe = false, online = false }: { card: ChatPartyCard; title: string; isMe?: boolean; online?: boolean }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</p>
      <div className="flex items-center gap-3">
        <PartyAvatar name={card.name} photo={card.photo} seed={card.id} size={52} online={online} />
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate font-bold text-gray-900">
            {card.name}
            {isMe && <span className="font-normal text-gray-400">(you)</span>}
            {card.verifiedFarmer && <VerifiedTick />}
          </p>
          <p className="truncate text-sm text-gray-500">{roleLine(card)}</p>
        </div>
      </div>
      {card.accountStatus !== "deactivated" && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-gray-50 p-2">
            <dt className="text-[11px] text-gray-500">Member since</dt>
            <dd className="font-semibold">{memberSince(card.memberSince)}</dd>
          </div>
          {card.verifiedFarmer ? (
            <>
              <div className="rounded-lg bg-gray-50 p-2">
                <dt className="text-[11px] text-gray-500">Rating</dt>
                <dd className="font-semibold">{card.rating ? `★ ${card.rating} (${card.reviewCount})` : "No reviews yet"}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <dt className="text-[11px] text-gray-500">Products listed</dt>
                <dd className="font-semibold">{card.activeListings ?? 0}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <dt className="text-[11px] text-gray-500">Completed sales</dt>
                <dd className="font-semibold">{card.completedSales ?? 0}</dd>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 p-2">
              <dt className="text-[11px] text-gray-500">Account</dt>
              <dd className="font-semibold">{card.role === "farmer" ? "Farmer" : "Buyer"}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

function ProductCard({
  product,
  href,
  unavailable,
  compact = false,
}: {
  product: ChatContext["product"];
  href: string | null;
  unavailable: boolean;
  compact?: boolean;
}) {
  if (!product) return <p className="text-sm text-gray-500">The product for this conversation is no longer available.</p>;
  if (!compact) {
    return (
      <div>
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="material-symbols-outlined flex h-full items-center justify-center text-4xl text-gray-300">inventory_2</span>
          )}
        </div>
        <p className="mt-3 font-semibold text-gray-900">{product.name}</p>
        <p className="text-sm text-gray-600">
          <span className="font-bold text-[#1B6D24]">{money(product.price)}</span>
          {product.unit ? <span className="text-gray-400"> / {product.unit}</span> : null}
        </p>
        <p className={`mt-1 text-xs font-semibold ${unavailable ? "text-amber-700" : "text-gray-500"}`}>
          {!product.isActive ? "No longer listed" : product.quantity === 0 ? "Out of stock" : product.quantity != null ? `${product.quantity} in stock` : "In stock"}
        </p>
        {href && (
          <Link href={href} className="mt-3 flex h-10 items-center justify-center rounded-lg bg-[#1B6D24] text-sm font-semibold text-white hover:brightness-110">
            View product
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="material-symbols-outlined flex h-full items-center justify-center text-gray-300">inventory_2</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
        <p className="text-sm text-gray-600">
          <span className="font-bold text-[#1B6D24]">{money(product.price)}</span>
          {product.unit ? <span className="text-gray-400"> / {product.unit}</span> : null}
          {!unavailable && product.quantity != null && <span className="text-gray-400"> · {product.quantity} in stock</span>}
        </p>
      </div>
      {href && (
        <Link href={href} className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#1B6D24] hover:text-[#1B6D24]">
          View product
        </Link>
      )}
    </div>
  );
}

export default function ChatDetailPage() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const params = useParams();
  const chatId = (params?.chatId || params?.id) as string | undefined;
  const inFarmerPortal = pathname.startsWith("/farmer");

  const [context, setContext] = useState<ChatContext | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  // Profile panel starts open on wide screens, where it sits beside the
  // conversation; on small screens it's a sheet opened from the header.
  const [panelOpen, setPanelOpen] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stickToBottom = useRef(true);
  const preserveFrom = useRef<number | null>(null);

  const buyer = useMemo<ChatParticipant | null>(
    () => (context ? { _id: context.buyer.id, name: context.buyer.name, email: "" } : null),
    [context?.buyer.id, context?.buyer.name], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const farmer = useMemo<ChatParticipant | null>(
    () => (context ? { _id: context.farmer.id, name: context.farmer.name, email: "" } : null),
    [context?.farmer.id, context?.farmer.name], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const { messages, setMessages, typingUsers, onlineUsers, isSending, error: chatError, sendMessage, sendAttachment, emitTyping, emitStopTyping } =
    useChat({ chatId, currentUserId, buyer, farmer });

  // Who is who. Never inferred from the route: a farmer can also chat as a
  // buyer about someone else's product.
  const iAmBuyer = !!context && context.buyer.id === currentUserId;
  const me = context ? (iAmBuyer ? context.buyer : context.farmer) : null;
  const other = context ? (iAmBuyer ? context.farmer : context.buyer) : null;
  const otherOnline = !!other && onlineUsers.has(other.id);
  const otherTyping = !!other && typingUsers.has(other.id);
  const product = context?.product ?? null;
  const productHref = product ? (iAmBuyer ? `/buyer/marketplace-detail/${product.id}` : `/farmer/products/${product.id}`) : null;
  const productUnavailable = !!product && (!product.isActive || product.quantity === 0);
  const otherDeleted = other?.accountStatus === "deactivated";

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [profile, ctx, msgs] = await Promise.all([getCurrentProfile(), getChatContext(chatId), getMessages(chatId, PAGE_SIZE, 0)]);
      if (cancelled) return;
      if (profile) setCurrentUserId(profile.id);
      if (!ctx.res.ok || !ctx.payload.context) {
        setLoadError(/not allowed/i.test(ctx.payload.error || "") ? "You don't have access to this conversation." : "This conversation could not be found.");
        setLoading(false);
        return;
      }
      setContext(ctx.payload.context);
      if (msgs.res.ok) {
        setMessages(msgs.payload.messages || []);
        setHasMore(!!msgs.payload.hasMore);
      }
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setLoadError("Could not load this conversation. Check your connection and try again.");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chatId, setMessages]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, []);

  // Keep the view pinned to the newest message unless the reader has
  // scrolled up; keep their place when older messages are prepended.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (preserveFrom.current !== null) {
      el.scrollTop = el.scrollHeight - preserveFrom.current;
      preserveFrom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const loadOlder = async () => {
    if (!chatId || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const { res, payload } = await getMessages(chatId, PAGE_SIZE, 0, messages[0].createdAt);
    if (res.ok) {
      preserveFrom.current = scrollRef.current?.scrollHeight ?? null;
      setMessages((cur) => [...(payload.messages || []), ...cur]);
      setHasMore(!!payload.hasMore);
    }
    setLoadingOlder(false);
  };

  // Signed URLs for attachments in the private bucket.
  useEffect(() => {
    const pending = messages.filter((m) => m.attachmentUrl && !m.attachmentUrl.startsWith("http") && !attachmentUrls[m.attachmentUrl]);
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(pending.map(async (m) => [m.attachmentUrl as string, await getChatAttachmentUrl(m.attachmentUrl as string)] as const));
      if (cancelled) return;
      setAttachmentUrls((prev) => {
        const next = { ...prev };
        for (const [path, url] of entries) if (url) next[path] = url;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, attachmentUrls]);

  const resolveUrl = (url?: string) => (!url ? "" : url.startsWith("http") ? url : attachmentUrls[url] || "");

  // Read receipts for incoming messages.
  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setMessages((prev) => prev.map((m) => (ids.includes(m._id || "") ? { ...m, isRead: true, deliveryStatus: "read" as const } : m)));
      await markMessagesAsRead(ids).catch(() => {});
    },
    [setMessages],
  );
  useEffect(() => {
    if (!currentUserId) return;
    const unread = messages.filter((m) => m._id && getId(m.senderId) !== currentUserId && !m.isRead).map((m) => m._id as string);
    if (unread.length) void markRead(unread);
  }, [messages, currentUserId, markRead]);

  // Auto-grow the composer up to ~5 lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const send = async (text = input) => {
    const content = text.trim();
    if (!content || isSending || !chatId) return;
    setSendError(null);
    setInput("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitStopTyping();
    stickToBottom.current = true;
    const sent = await sendMessage(content);
    if (!sent) {
      setInput(content);
      setSendError("Your message wasn't sent. Check your connection and try again.");
    }
    inputRef.current?.focus();
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setSendError("That file is larger than 10MB. Please choose a smaller one.");
      return;
    }
    setSendError(null);
    stickToBottom.current = true;
    const sent = await sendAttachment(file, input.trim() || undefined);
    if (sent) setInput("");
    else setSendError("The file couldn't be sent. Please try again.");
  };

  const onInputChange = (value: string) => {
    setInput(value);
    setSendError(null);
    emitTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitStopTyping(), 2000);
  };

  const iHaveWritten = messages.some((m) => getId(m.senderId) === currentUserId);
  const quickReplies = iAmBuyer ? BUYER_QUICK_REPLIES : FARMER_QUICK_REPLIES;

  // Undo the buyer layout's bottom-nav spacer: this page fills the screen
  // and the bottom nav is hidden on conversations.
  const rootClass = `flex h-[100dvh] flex-col bg-[#f6f8f6] ${inFarmerPortal ? "" : "-mb-20 lg:mb-0"}`;

  if (loading) {
    return (
      <div className={rootClass}>
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Loading conversation…</div>
      </div>
    );
  }

  if (loadError || !context || !other || !me) {
    return (
      <div className={`${rootClass} items-center justify-center px-6 text-center`}>
        <span className="material-symbols-outlined mb-2 text-5xl text-gray-300">forum</span>
        <p className="mb-4 text-gray-700">{loadError || "This conversation could not be found."}</p>
        <button onClick={() => router.push(inFarmerPortal ? "/farmer/chats" : "/buyer/chat")} className="rounded-lg bg-[#1B6D24] px-5 py-2 text-sm font-semibold text-white">
          Back to messages
        </button>
      </div>
    );
  }

  const statusLine = otherTyping ? "Typing…" : otherOnline ? "Online now" : roleLine(other);

  // Group messages by day; mark the last bubble of each run from the same
  // sender so the avatar and time show once per run.
  const rows: React.ReactNode[] = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const mine = getId(msg.senderId) === currentUserId;
    if (!prev || !sameDay(new Date(prev.createdAt), new Date(msg.createdAt))) {
      rows.push(
        <div key={`day-${msg.createdAt}`} className="my-3 flex justify-center">
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-gray-500 shadow-sm">{dayLabel(msg.createdAt)}</span>
        </div>,
      );
    }
    const lastOfRun =
      !next || getId(next.senderId) !== getId(msg.senderId) || !sameDay(new Date(next.createdAt), new Date(msg.createdAt)) ||
      new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() > 5 * 60 * 1000;
    const read = msg.isRead || msg.deliveryStatus === "read";
    const url = resolveUrl(msg.attachmentUrl);

    rows.push(
      <div key={msg._id || `${msg.createdAt}-${i}`} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${lastOfRun ? "mb-3" : "mb-1"}`}>
        {!mine && <div className="w-8 shrink-0">{lastOfRun && <PartyAvatar name={other.name} photo={other.photo} seed={other.id} size={32} />}</div>}
        <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
          <div
            className={`overflow-hidden text-[15px] leading-relaxed shadow-sm ${
              mine ? "bg-[#1B6D24] text-white" : "border border-gray-100 bg-white text-gray-900"
            } ${msg.messageType === "text" ? "px-4 py-2.5" : "p-1.5"} rounded-2xl ${lastOfRun ? (mine ? "rounded-br-md" : "rounded-bl-md") : ""}`}
          >
            {msg.messageType === "image" ? (
              <>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Shared photo" className="max-h-72 w-full max-w-xs rounded-xl object-cover" />
                  </a>
                ) : (
                  <div className="h-48 w-60 animate-pulse rounded-xl bg-gray-200" />
                )}
                {msg.content && msg.content !== "Sent an image" && <p className="whitespace-pre-wrap break-words px-2.5 py-1.5">{msg.content}</p>}
              </>
            ) : msg.messageType === "file" ? (
              <a href={url || undefined} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2">
                <span className="material-symbols-outlined">description</span>
                <span className="underline">{msg.content && msg.content !== "Sent a file" ? msg.content : "Open file"}</span>
              </a>
            ) : (
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            )}
          </div>
          {lastOfRun && (
            <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-gray-400">
              {timeLabel(msg.createdAt)}
              {mine && (
                <>
                  <span className={`material-symbols-outlined text-[15px] ${read ? "text-[#1B6D24]" : ""}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {read ? "done_all" : "done"}
                  </span>
                  {read ? "Seen" : "Sent"}
                </>
              )}
            </span>
          )}
        </div>
      </div>,
    );
  });

  return (
    <div className={rootClass}>
      {/* Header */}
      <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-2 sm:px-4">
        <button
          onClick={() => (window.history.length > 1 ? router.back() : router.push(inFarmerPortal ? "/farmer/chats" : "/buyer/chat"))}
          aria-label="Back to messages"
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <button onClick={() => setPanelOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <PartyAvatar name={other.name} photo={other.photo} seed={other.id} size={40} online={otherOnline} />
          <span className="min-w-0">
            <span className="flex items-center gap-1 truncate font-bold text-gray-900">
              {other.name}
              {other.verifiedFarmer && <VerifiedTick />}
            </span>
            <span className={`block truncate text-xs ${otherTyping || otherOnline ? "font-semibold text-[#1B6D24]" : "text-gray-500"}`}>{statusLine}</span>
          </span>
        </button>
        <button
          onClick={() => setPanelOpen((v) => !v)}
          aria-label={panelOpen ? "Hide details" : "Show details"}
          aria-pressed={panelOpen}
          className={`rounded-full p-2 ${panelOpen ? "bg-green-50 text-[#1B6D24]" : "text-gray-500 hover:bg-gray-100"}`}
        >
          <span className="material-symbols-outlined">info</span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Conversation */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Product this chat is about */}
          <div className="shrink-0 border-b border-gray-200 bg-white/95 px-3 py-2 sm:px-4">
            <div className="mx-auto max-w-3xl">
              <ProductCard compact product={product} href={productHref} unavailable={productUnavailable} />
              {productUnavailable && (
                <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  {product?.isActive ? "This product is currently out of stock." : "This product is no longer listed on the marketplace."}
                </p>
              )}
            </div>
          </div>

          <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
            <div className="mx-auto max-w-3xl">
              {hasMore && (
                <div className="mb-3 flex justify-center">
                  <button onClick={loadOlder} disabled={loadingOlder} className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 shadow-sm hover:text-[#1B6D24] disabled:opacity-60">
                    {loadingOlder ? "Loading…" : "Load earlier messages"}
                  </button>
                </div>
              )}

              {!hasMore && (
                <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 text-center">
                  <p className="text-sm text-gray-700">
                    {iAmBuyer ? (
                      <>You started this conversation with <span className="font-semibold">{other.name}</span></>
                    ) : (
                      <><span className="font-semibold">{other.name}</span> messaged you</>
                    )}{" "}
                    about <span className="font-semibold">{product?.name || "a product"}</span> on {new Date(context.startedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}.
                  </p>
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-500">
                    <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                    For your safety, keep payments inside KIZ FARM — your money is held in escrow until delivery.
                  </p>
                </div>
              )}

              {messages.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-500">
                  {iAmBuyer ? "Say hello and ask the farmer anything about this product." : "No messages yet."}
                </p>
              )}

              {rows}

              {otherTyping && (
                <div className="mb-3 flex items-end gap-2">
                  <PartyAvatar name={other.name} photo={other.photo} seed={other.id} size={32} />
                  <span className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
                    <span className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-3 pt-2 sm:px-4" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
            <div className="mx-auto max-w-3xl">
              {otherDeleted ? (
                <p className="py-3 text-center text-sm text-gray-500">This account was deleted, so you can no longer reply.</p>
              ) : (
                <>
                  {!iHaveWritten && !input && (
                    <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                      {quickReplies.map((q) => (
                        <button key={q} onClick={() => send(q)} disabled={isSending} className="shrink-0 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-[#1B6D24] hover:bg-green-100">
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  {(sendError || chatError) && <p className="mb-2 text-xs font-medium text-red-600">{sendError || chatError}</p>}
                  <div className="flex items-end gap-2">
                    <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-gray-100" title="Send a photo or file">
                      <input type="file" accept="image/*,application/pdf" onChange={onPickFile} className="hidden" disabled={isSending} />
                      <span className="material-symbols-outlined">attach_file</span>
                    </label>
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={input}
                      onChange={(e) => onInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      maxLength={4000}
                      placeholder={`Message ${other.name.split(" ")[0]}…`}
                      className="max-h-[140px] min-h-11 flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[15px] outline-none focus:border-[#1B6D24] focus:bg-white focus:ring-2 focus:ring-[#1B6D24]/15"
                    />
                    <button
                      onClick={() => send()}
                      disabled={!input.trim() || isSending}
                      aria-label="Send message"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1B6D24] text-white shadow-sm transition active:scale-95 disabled:opacity-40"
                    >
                      {isSending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 hidden text-[11px] text-gray-400 sm:block">Enter to send · Shift + Enter for a new line</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Details panel: side column on wide screens, sheet on small ones */}
        {panelOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/30 xl:hidden" onClick={() => setPanelOpen(false)} />
            <aside className="fixed inset-y-0 right-0 z-40 w-[88%] max-w-sm overflow-y-auto border-l border-gray-200 bg-[#f6f8f6] p-4 xl:static xl:z-auto xl:w-80 xl:max-w-none">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Conversation details</h2>
                <button onClick={() => setPanelOpen(false)} aria-label="Close details" className="rounded-full p-1.5 text-gray-500 hover:bg-gray-200">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="space-y-3">
                <ProfileCard card={other} title={iAmBuyer ? "Farmer" : "Buyer"} online={otherOnline} />
                <section className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">About this product</p>
                  <ProductCard product={product} href={productHref} unavailable={productUnavailable} />
                  {context.ordersTogether > 0 && (
                    <p className="mt-3 text-xs text-gray-500">
                      {context.ordersTogether} order{context.ordersTogether === 1 ? "" : "s"} between you so far.
                    </p>
                  )}
                </section>
                <ProfileCard card={me} title="You" isMe />
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                  <span className="material-symbols-outlined text-[16px]">shield</span>
                  Never pay outside KIZ FARM or share your bank PIN or OTP in chat. Payments made through KIZ FARM are protected by escrow.
                </p>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
