"use client";

import ChatDetailPage from "@/components/chat-detail-page";

export default function Page({ params }: { params: { chatId: string } }) {
  return <ChatDetailPage />;
}
