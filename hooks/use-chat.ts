"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/kizfarm/supabase-client";
import { sendMessage as sendMessageApi, sendAttachment as sendAttachmentApi } from "@/lib/kizfarm/supabase-mutations";

export interface ChatParticipant {
  _id: string;
  name: string;
  email: string;
}

export interface ChatMessage {
  _id?: string;
  chatId?: string;
  senderId: any;
  receiverId: any;
  content: string;
  messageType: "text" | "image" | "file";
  attachmentUrl?: string;
  attachmentType?: string;
  isRead: boolean;
  deliveryStatus: "sent" | "delivered" | "read";
  createdAt: string;
}

interface UseChatOptions {
  chatId?: string;
  currentUserId?: string;
  // The two chat participants, so an incoming Realtime row (which only
  // carries sender_id, not a joined profile) can be enriched into the same
  // { _id, name, email, role } shape getMessages() already returns.
  buyer?: ChatParticipant | null;
  farmer?: ChatParticipant | null;
}

// Replaces the old Socket.IO-backed useChats() hook: message delivery and
// read receipts now ride Postgres Realtime's change feed on `messages`
// (a plain client INSERT/UPDATE fans out to every subscriber automatically,
// including the sender's own other tabs), and typing indicators -- which
// have no reason to be persisted -- use the same channel's ephemeral
// Broadcast feature instead.
export function useChat({ chatId, currentUserId, buyer, farmer }: UseChatOptions) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const enrichSender = useCallback(
    (senderId: string) => {
      if (buyer && senderId === buyer._id) return { ...buyer, role: "buyer" };
      if (farmer && senderId === farmer._id) return { ...farmer, role: "farmer" };
      return { _id: senderId, name: "User", email: "", role: "" };
    },
    [buyer, farmer],
  );

  const upsertMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      if (!message._id) return [...prev, message];
      const existingIndex = prev.findIndex((m) => m._id === message._id);
      if (existingIndex === -1) return [...prev, message];
      return prev.map((m, i) => (i === existingIndex ? { ...m, ...message } : m));
    });
  }, []);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as any;
          upsertMessage({
            _id: row.id,
            chatId: row.chat_id,
            senderId: enrichSender(row.sender_id),
            receiverId: row.receiver_id,
            content: row.content,
            messageType: row.message_type,
            attachmentUrl: row.attachment_url,
            attachmentType: row.attachment_type,
            isRead: row.is_read,
            deliveryStatus: row.delivery_status,
            createdAt: row.created_at,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) =>
            prev.map((m) => (m._id === row.id ? { ...m, isRead: row.is_read, deliveryStatus: row.delivery_status } : m)),
          );
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }: { payload: { userId: string } }) => {
        if (payload.userId && payload.userId !== currentUserId) {
          setTypingUsers((prev) => new Set(prev).add(payload.userId));
        }
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }: { payload: { userId: string } }) => {
        if (payload.userId) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(payload.userId);
            return next;
          });
        }
      })
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [chatId, currentUserId, supabase, enrichSender, upsertMessage]);

  const sendMessage = useCallback(
    async (content: string): Promise<ChatMessage | null> => {
      if (!chatId || !content.trim()) return null;
      setIsSending(true);
      setError(null);
      try {
        const { res, payload } = await sendMessageApi(chatId, content);
        if (!res.ok) {
          setError(payload?.error || "Failed to send message");
          return null;
        }
        const message = payload.message as ChatMessage;
        upsertMessage(message);
        return message;
      } catch (err) {
        console.error("Error sending message:", err);
        setError("Failed to send message");
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [chatId, upsertMessage],
  );

  const sendAttachment = useCallback(
    async (file: File, caption?: string): Promise<ChatMessage | null> => {
      if (!chatId) return null;
      setIsSending(true);
      setError(null);
      try {
        const { res, payload } = await sendAttachmentApi(chatId, file, caption);
        if (!res.ok) {
          setError(payload?.error || "Failed to send attachment");
          return null;
        }
        const message = payload.message as ChatMessage;
        upsertMessage(message);
        return message;
      } catch (err) {
        console.error("Error sending attachment:", err);
        setError("Failed to send attachment");
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [chatId, upsertMessage],
  );

  const emitTyping = useCallback(() => {
    if (currentUserId) {
      channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId } });
    }
  }, [currentUserId]);

  const emitStopTyping = useCallback(() => {
    if (currentUserId) {
      channelRef.current?.send({ type: "broadcast", event: "stop_typing", payload: { userId: currentUserId } });
    }
  }, [currentUserId]);

  return {
    messages,
    setMessages,
    isConnected,
    isSending,
    error,
    typingUsers,
    sendMessage,
    sendAttachment,
    emitTyping,
    emitStopTyping,
  };
}
