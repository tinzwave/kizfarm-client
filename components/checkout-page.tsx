"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from "@/lib/kizfarm/cart-context";
import { apiFetch } from "@/lib/kizfarm/api";

interface AddressItem {
  _id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");

  // Fetch saved addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setLoadingAddresses(true);
        const addrRes = await apiFetch("/buyer/addresses");

        if (addrRes.res.ok && addrRes.payload.addresses) {
          const list = addrRes.payload.addresses;
          setAddresses(list);
          if (list.length > 0) {
            const defaultAddress = list.find((a: AddressItem) => a.isDefault) || list[0];
            setSelectedAddressId(defaultAddress._id);
          }
        }
      } catch (err) {
        console.error("Error loading checkout details:", err);
      } finally {
        setLoadingAddresses(false);
      }
    };
    fetchAddresses();
  }, []);

  // Calculate pricing
  const serviceCharge = items.length > 0 ? 1200 : 0;
  const totalBeforeTransport = totalPrice + serviceCharge;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!selectedAddressId) {
      setError("Please select a shipping address.");
      return;
    }

    setPlacingOrder(true);

    try {
      const orderPayload = {
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        addressId: selectedAddressId,
        paymentMethod: paymentMethod === "card" ? "card" : paymentMethod === "bank" ? "bank_transfer" : "mpesa",
      };

      const { res, payload } = await apiFetch("/buyer/orders", {
        method: "POST",
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        setError(payload?.error || "Failed to submit order for transport fare review.");
        return;
      }

      clearCart();
      router.push("/buyer/orders");
    } catch (err) {
      console.error("Transport fare request error:", err);
      setError("Failed to submit your order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <>
      {/* Header / TopAppBar */}
      <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/buyer/marketplace">
            <img alt="KIZ FARM Logo" className="h-10 w-auto object-contain cursor-pointer" src="/logo.jpeg" />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-gray-500">lock</span>
          <span className="font-label-sm text-label-sm text-gray-500 uppercase tracking-widest">Secure Checkout</span>
        </div>
      </header>

      {/* Address Validation Gate Overlay */}
      {!loadingAddresses && addresses.length === 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 text-center">
            <span className="material-symbols-outlined text-6xl text-amber-500 mb-4">home_pin</span>
            <h3 className="text-xl font-bold text-on-surface mb-2">Delivery Address Required</h3>
            <p className="text-sm text-secondary mb-6 leading-relaxed">
              You must have at least one saved delivery address in your profile to checkout. 
              Please add an address first.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/buyer/addresses" className="block w-full">
                <button className="w-full py-3 bg-[#1B6D24] text-white rounded-lg font-bold hover:bg-primary transition-colors">
                  Add Delivery Address
                </button>
              </Link>
              <Link href="/buyer/cart" className="block w-full text-center text-sm text-secondary hover:underline">
                Return to Cart
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1440px] mx-auto px-margin mt-lg">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-gutter">
          {/* Left Column: Checkout Flow */}
          <div className="lg:col-span-8 space-y-lg">
            {/* Steps Indicator */}
            <nav className="flex items-center justify-between w-full max-w-2xl mx-auto mb-lg">
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold">1</div>
                <span className="font-label-sm text-label-sm text-primary">Address</span>
              </div>
              <div className="h-[2px] flex-1 bg-primary-container/20 mx-4">
                <div className="h-full bg-primary-container w-full"></div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold">2</div>
                <span className="font-label-sm text-label-sm text-primary font-semibold">Payment</span>
              </div>
              <div className="h-[2px] flex-1 bg-primary-container/20 mx-4">
                <div className="h-full bg-primary-container w-full"></div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold">3</div>
                <span className="font-label-sm text-label-sm text-primary">Review</span>
              </div>
            </nav>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">error</span>
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {/* Section: Address Selection */}
            <section className="bg-white rounded-xl border border-[#E5E7EB] p-md">
              <div className="flex justify-between items-center mb-md">
                <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">local_shipping</span>
                  Shipping Address
                </h2>
                <Link href="/buyer/addresses">
                  <span className="text-primary font-label-sm text-label-sm hover:underline cursor-pointer">+ Manage Addresses</span>
                </Link>
              </div>

              {loadingAddresses ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-base">
                  {addresses.map((address) => (
                    <label 
                      key={address._id}
                      className={`relative flex p-md border-2 rounded-xl cursor-pointer transition-all ${
                        selectedAddressId === address._id 
                          ? "border-primary-container bg-primary/5" 
                          : "border-[#E5E7EB] hover:border-primary/30"
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="address" 
                        value={address._id}
                        checked={selectedAddressId === address._id}
                        onChange={() => setSelectedAddressId(address._id)}
                        className="absolute top-4 right-4 text-primary focus:ring-primary h-4 w-4" 
                      />
                      <div className="flex flex-col pr-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`material-symbols-outlined ${selectedAddressId === address._id ? "text-primary" : "text-secondary"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {address.label?.toLowerCase() === "office" ? "business" : "home"}
                          </span>
                          <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
                            {address.label || "Address"} {address.isDefault && "(Default)"}
                          </span>
                        </div>
                        <p className="font-body-md text-body-md text-on-surface-variant leading-tight">{address.street}</p>
                        <p className="font-body-md text-body-md text-on-surface-variant leading-tight">{address.city}, {address.state}</p>
                        <p className="font-body-md text-body-md text-on-surface-variant leading-tight">{address.country}</p>
                        {address.phone && (
                          <p className="mt-2 font-label-xs text-label-xs text-gray-500">{address.phone}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Section: Payment Method */}
            <section className="bg-white rounded-xl border border-[#E5E7EB] p-md">
              <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-md">
                <span className="material-symbols-outlined text-primary">payments</span>
                Payment Method
              </h2>
              <div className="space-y-base">
                {/* Option: Card */}
                <div className={`border rounded-xl p-md transition-all ${paymentMethod === "card" ? "border-primary bg-primary/5" : "border-[#E5E7EB]"}`}>
                  <div className="flex items-center justify-between mb-md">
                    <label className="flex items-center gap-4 cursor-pointer" onClick={() => setPaymentMethod("card")}>
                      <input 
                        type="radio" 
                        name="payment_method" 
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                        className="text-primary focus:ring-primary h-4 w-4" 
                      />
                      <span className="material-symbols-outlined text-primary">credit_card</span>
                      <span className="font-body-md text-body-md font-semibold">Credit / Debit Card</span>
                    </label>
                    <div className="flex gap-2">
                      <img alt="Visa" className="h-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-RsglwsNPJXX73IDwIdQ3HHRuxBh_1XbfDe37VlY-hYlEIQ-bqUL3dPkwdRKIljsqZm9DRrSfojmLcoHNeMj-QCiPeagPjjVewcLjw0X0xsoPzIycqSJp3awK3PohQeShlQSa7KydGKlnsLoDsDiB6U3LLo5e0RzeIZ2UXJLZ2yPKLu-J1ZrI0CsViyXLZcd52FqFAiBhY_wy9VjGt_apM-1wgbIS67XOUw9mfDF5w_NSEifFkvRswqOHHVa1AcaPHF-BJs8K5H4" />
                      <img alt="Mastercard" className="h-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkuSVgKnfSjdSUQhzCb_xOF05-EKPt81CZU4qgCxV845GnamHkdNdRtu78LF9bOBto2glzTPFzCD4zFGr8QbAJw90ZkoNbC3RvUx8O2oZYMMqc4bb_eiQ5C5J5mNBIoOAiQYbmm58z1LUOcYWJN5kWkAa7Z6B02TxxPSgLSOrLC3efCgfhfIsXOaA6mRl0CejF9c4fLOtz8Pt1u0-xoU26cLq3R8b63-GGozQ6uIquPzzUPa5BnpPwktl_9RIixJnikNIBHqcCVro" />
                    </div>
                  </div>
                  {paymentMethod === "card" && (
                    <div className="space-y-xs mt-4 p-md rounded-lg bg-green-50/50 border border-green-100 text-sm text-slate-700">
                      <p className="font-semibold text-green-900 mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">shield</span> Secured via Paystack
                      </p>
                      <p className="text-xs text-slate-500">This method will be used after the admin adds your transport fare.</p>
                    </div>
                  )}
                </div>
                {/* Option: Bank Transfer */}
                <div className={`border rounded-xl p-md transition-all ${paymentMethod === "bank" ? "border-primary bg-primary/5" : "border-[#E5E7EB]"}`}>
                  <label className="flex items-center justify-between cursor-pointer" onClick={() => setPaymentMethod("bank")}>
                    <div className="flex items-center gap-4">
                      <input 
                        type="radio" 
                        name="payment_method" 
                        checked={paymentMethod === "bank"}
                        onChange={() => setPaymentMethod("bank")}
                        className="text-primary focus:ring-primary h-4 w-4" 
                      />
                      <span className="material-symbols-outlined text-gray-500">account_balance</span>
                      <span className="font-body-md text-body-md font-semibold text-gray-700">Direct Bank Transfer / USSD</span>
                    </div>
                  </label>
                  {paymentMethod === "bank" && (
                    <div className="space-y-xs mt-4 p-md rounded-lg bg-green-50/50 border border-green-100 text-sm text-slate-700">
                      <p className="font-semibold text-green-900 mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">shield</span> Secured via Paystack
                      </p>
                      <p className="text-xs text-slate-500">This method will be used after the admin adds your transport fare.</p>
                    </div>
                  )}
                </div>
                {/* Option: Mobile Money */}
                <div className={`border rounded-xl p-md transition-all ${paymentMethod === "mobile_money" ? "border-primary bg-primary/5" : "border-[#E5E7EB]"}`}>
                  <label className="flex items-center justify-between cursor-pointer" onClick={() => setPaymentMethod("mobile_money")}>
                    <div className="flex items-center gap-4">
                      <input 
                        type="radio" 
                        name="payment_method" 
                        checked={paymentMethod === "mobile_money"}
                        onChange={() => setPaymentMethod("mobile_money")}
                        className="text-primary focus:ring-primary h-4 w-4" 
                      />
                      <span className="material-symbols-outlined text-gray-500">smartphone</span>
                      <span className="font-body-md text-body-md font-semibold text-gray-700">Mobile Money / OPAY / M-Pesa</span>
                    </div>
                  </label>
                  {paymentMethod === "mobile_money" && (
                    <div className="space-y-xs mt-4 p-md rounded-lg bg-green-50/50 border border-green-100 text-sm text-slate-700">
                      <p className="font-semibold text-green-900 mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">shield</span> Secured via Paystack
                      </p>
                      <p className="text-xs text-slate-500">This method will be used after the admin adds your transport fare.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-4">
            <aside className="sticky top-24 space-y-md">
              <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                <div className="p-md border-b border-[#E5E7EB] bg-gray-50">
                  <h3 className="font-headline-md text-headline-md text-on-surface">Order Summary</h3>
                </div>
                {/* Mini Product List */}
                <div className="p-md space-y-md max-h-[300px] overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        <img 
                          className="w-full h-full object-cover" 
                          alt={item.name} 
                          src={item.image || "https://via.placeholder.com/150?text=No+Image"} 
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-label-sm text-label-sm font-bold text-on-surface line-clamp-1">{item.name}</h4>
                        <p className="font-label-xs text-label-xs text-gray-500">Qty: {item.quantity}</p>
                        <p className="font-body-md text-body-md font-semibold text-primary mt-1">₦ {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Price Calculations */}
                <div className="p-md space-y-base border-t border-[#E5E7EB]">
                  <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>₦ {totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                    <span>Transport Fare</span>
                    <span className="text-amber-700 font-semibold">Admin will contact you</span>
                  </div>
                  <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                    <span>Service Charge</span>
                    <span>₦ {serviceCharge.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-headline-md text-headline-md text-on-surface pt-md border-t border-[#E5E7EB]">
                    <span>Total before transport</span>
                    <span className="text-[#1B6D24] font-bold">₦ {totalBeforeTransport.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mx-md mb-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">support_agent</span>
                    Transport fare review required
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">
                    Submit this order and KIZ FARM admin will review the goods and delivery address, then contact you with the transport fare. Payment will open after the fare is added to your order summary.
                  </p>
                </div>
                <div className="p-md">
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || items.length === 0 || !selectedAddressId}
                    className={`w-full h-12 bg-[#1B6D24] text-white font-label-sm text-label-sm font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 active:scale-95 duration-150 shadow-lg shadow-[#1B6D24]/20 ${
                      placingOrder || items.length === 0 || !selectedAddressId 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-[#15521B]"
                    }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                    {placingOrder ? "Submitting..." : "Request Transport Fare Review"}
                  </button>
                  <p className="text-center font-label-xs text-label-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    You will pay after admin adds the transport fare.
                  </p>
                </div>
              </div>
              {/* Map/Delivery Status Card */}
              <div className="bg-green-50/10 rounded-xl border border-green-100 p-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#1B6D24]">bolt</span>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm font-bold text-[#1B6D24]">Farm-to-Door Delivery</p>
                  <p className="font-label-xs text-label-xs text-slate-500">Estimated: Tomorrow by 10:00 AM</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only Shell) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-2 bg-white/80 backdrop-blur-md border-t border-gray-200">
        <Link href="/buyer/marketplace" className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 px-4 py-1">
          <span className="material-symbols-outlined">home</span>
          <span className="font-label-xs text-label-xs">Home</span>
        </Link>
        <Link href="/buyer/marketplace" className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 px-4 py-1">
          <span className="material-symbols-outlined">storefront</span>
          <span className="font-label-xs text-label-xs">Market</span>
        </Link>
        <Link href="/buyer/orders" className="flex flex-col items-center justify-center text-[#1B6D24] bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-1">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          <span className="font-label-xs text-label-xs">Orders</span>
        </Link>
        <Link href="/buyer/profile" className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 px-4 py-1">
          <span className="material-symbols-outlined">person</span>
          <span className="font-label-xs text-label-xs">Profile</span>
        </Link>
      </nav>

      {/* Separation Padding for Bottom Nav */}
      <div className="h-24 md:hidden"></div>
    </>
  );
}
