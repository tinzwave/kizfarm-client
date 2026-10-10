"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBuyerOpenOrders, type BuyerOpenOrder } from "@/lib/kizfarm/supabase-data";

const money = (value = 0) => `₦${Number(value).toLocaleString()}`;

const COPY: Record<BuyerOpenOrder["status"], { icon: string; tone: string; title: (o: BuyerOpenOrder) => string; body: (o: BuyerOpenOrder) => string; cta: string }> = {
  awaiting_payment: {
    icon: "payments",
    tone: "border-green-300 bg-green-50",
    title: () => "Transport fare ready — complete your payment",
    body: (o) => `Transport ${money(o.deliveryFee)} added. Total to pay ${money(o.total)}.`,
    cta: "Pay now",
  },
  delivered: {
    icon: "inventory_2",
    tone: "border-blue-200 bg-blue-50",
    title: () => "Order delivered — confirm receipt",
    body: () => "Let us know you received it so the farmer gets paid.",
    cta: "Confirm receipt",
  },
  awaiting_transport_quote: {
    icon: "local_shipping",
    tone: "border-amber-200 bg-amber-50",
    title: () => "Calculating your transport fare",
    body: () => "Usually within 60 minutes during working hours. We'll notify you here and by email when it's ready to pay.",
    cta: "View order",
  },
};

function itemsLabel(o: BuyerOpenOrder) {
  if (o.items.length === 0) return o.ref;
  const first = o.items[0];
  const more = o.items.length > 1 ? ` +${o.items.length - 1} more` : "";
  return `${first.name} × ${first.quantity}${more} · ${o.ref}`;
}

export function BuyerOrderActionCard({ order }: { order: BuyerOpenOrder }) {
  const c = COPY[order.status];
  const primary = order.status !== "awaiting_transport_quote";
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${c.tone}`}>
      <div className="flex flex-1 items-start gap-3 min-w-0">
        <span className="material-symbols-outlined mt-0.5 rounded-full bg-white p-2 text-[#1B6D24] shadow-sm">{c.icon}</span>
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{c.title(order)}</p>
          <p className="text-sm text-slate-600">{c.body(order)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{itemsLabel(order)}</p>
        </div>
      </div>
      <Link
        href={`/buyer/track-order?id=${encodeURIComponent(order.id)}`}
        className={`shrink-0 rounded-xl px-5 py-2.5 text-center text-sm font-bold transition-colors ${
          primary ? "bg-[#1B6D24] text-white hover:bg-green-800" : "border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
        }`}
      >
        {c.cta}
      </Link>
    </div>
  );
}

export default function BuyerActionItems() {
  const [orders, setOrders] = useState<BuyerOpenOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { res, payload } = await getBuyerOpenOrders();
      if (!cancelled && res.ok) setOrders(payload.orders);
    };
    load();
    // Status changes (e.g. the fare being added) show up when the buyer
    // returns to the tab.
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (orders.length === 0) return null;

  return (
    <section className="mb-6" aria-labelledby="action-needed-heading">
      <h2 id="action-needed-heading" className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
        <span className="material-symbols-outlined text-amber-600">notification_important</span>
        Your orders need attention
      </h2>
      <div className="space-y-3">
        {orders.slice(0, 5).map((o) => (
          <BuyerOrderActionCard key={o.id} order={o} />
        ))}
      </div>
      {orders.length > 5 && (
        <Link href="/buyer/orders" className="mt-3 inline-block text-sm font-semibold text-[#1B6D24] hover:underline">
          See all {orders.length} orders
        </Link>
      )}
    </section>
  );
}
