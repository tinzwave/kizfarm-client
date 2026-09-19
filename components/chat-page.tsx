"use client";

// Thin re-export -- the buyer chat list used to be a separate, near-
// duplicate implementation from the farmer one (app/farmer/chats/page.tsx),
// which is how they drifted into different bugs (see chat-list-page.tsx's
// header comment). Both now share the one implementation.
import ChatListPage from "@/components/chat-list-page";

export default function ChatPage() {
  return <ChatListPage currentRole="buyer" />;
}
