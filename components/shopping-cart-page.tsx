"use client"

import React from 'react';
import Link from 'next/link';
import { useCart } from "@/lib/kizfarm/cart-context";

export default function ShoppingCartPage() {
  const { items, totalPrice, updateQuantity, removeItem } = useCart();

  const serviceCharge = items.length > 0 ? 1200 : 0;
  const totalBeforeTransport = totalPrice + serviceCharge;

  return (
    <>
      {/* TopAppBar Section */}
      <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <img alt="KIZ FARM" className="h-10 object-contain w-auto" data-alt="high-quality minimalist logo for a modern agriculture company featuring a stylized green leaf and modern clean typography" src="/logo.jpeg" />
            <h1 className="text-xl font-extrabold tracking-tight text-[#1B6D24]">KIZ FARM</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-gray-500 hover:bg-gray-50 p-2 rounded-full transition-colors" data-icon="notifications">notifications</button>
            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-xs">KF</div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-lg lg:grid lg:grid-cols-12 lg:gap-gutter">
        {/* Cart Items Section */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-md">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">My Cart</h2>
            <span className="text-label-sm font-label-sm text-secondary bg-secondary-container px-3 py-1 rounded-full">
              {items.length} {items.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">shopping_cart_off</span>
              <p className="text-lg font-semibold text-on-surface mb-2">Your cart is empty</p>
              <p className="text-sm text-secondary mb-6">Looks like you haven't added any fresh produce yet.</p>
              <Link href="/buyer/marketplace">
                <button className="px-6 py-3 bg-[#1B6D24] text-white rounded-lg font-bold hover:bg-primary transition-colors">
                  Go to Marketplace
                </button>
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="bg-white border border-[#E5E7EB] rounded-xl p-md mb-md flex flex-col sm:flex-row gap-md items-start sm:items-center hover:shadow-[0px_10px_30px_rgba(27,109,36,0.05)] transition-shadow">
                <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  <img 
                    className="w-full h-full object-cover" 
                    alt={item.name} 
                    src={item.image || "https://via.placeholder.com/150?text=No+Image"} 
                  />
                </div>
                <div className="flex-grow flex flex-col gap-1">
                  <h3 className="font-headline-md text-body-lg text-on-surface">{item.name}</h3>
                  {item.unit && <p className="text-label-sm font-label-sm text-secondary">Unit: {item.unit}</p>}
                  {item.farmerName && <p className="text-label-sm font-label-sm text-secondary">Farmer: {item.farmerName}</p>}
                  <p className="font-bold text-[#1B6D24] mt-2">₦ {item.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center border border-outline-variant rounded-lg">
                    <button 
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-2 text-primary hover:bg-green-50 transition-colors"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <span className="px-4 font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={!!item.maxQuantity && item.quantity >= item.maxQuantity}
                      className="p-2 text-primary hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => removeItem(item.productId)}
                    className="material-symbols-outlined text-error hover:bg-error-container/20 p-2 rounded-full transition-colors"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Section */}
        <aside className="lg:col-span-4 mt-lg lg:mt-0">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-md sticky top-24">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Order Summary</h3>
            <div className="space-y-4 mb-lg">
              <div className="flex justify-between text-body-md text-secondary">
                <span>Subtotal</span>
                <span className="text-on-surface">₦ {totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-body-md text-secondary">
                <span>Transport Fare</span>
                <span className="text-amber-700 font-semibold">Quoted after checkout</span>
              </div>
              <div className="flex justify-between text-body-md text-secondary">
                <span>Service Charge</span>
                <span className="text-on-surface">
                  {serviceCharge > 0 ? `₦ ${serviceCharge.toLocaleString()}` : "₦ 0"}
                </span>
              </div>
              <div className="pt-4 border-t border-outline-variant flex justify-between">
                <span className="font-bold text-lg text-on-surface">Total before transport</span>
                <span className="font-bold text-lg text-[#1B6D24]">₦ {totalBeforeTransport.toLocaleString()}</span>
              </div>
            </div>
            <div className="mb-lg rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              Admin will review your goods and address, contact you with the transport fare, then payment will become available.
            </div>
            <div className="mb-lg">
              <div className="relative">
                <input className="w-full bg-white border border-[#D1D5DB] rounded-lg h-12 px-4 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all" placeholder="Promo code" type="text" />
                <button className="absolute right-2 top-2 h-8 px-4 bg-secondary-container text-on-secondary-container rounded-md font-label-sm text-label-sm hover:bg-secondary transition-colors">Apply</button>
              </div>
            </div>
            {items.length > 0 ? (
              <Link href="/buyer/checkout" className="block w-full">
                <button className="w-full h-[48px] bg-[#1B6D24] text-white rounded-lg font-bold text-body-md flex items-center justify-center gap-2 hover:bg-primary transition-all active:scale-[0.98]">
                  Proceed to Checkout
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </Link>
            ) : (
              <button disabled className="w-full h-[48px] bg-gray-300 text-gray-500 rounded-lg font-bold text-body-md flex items-center justify-center gap-2 cursor-not-allowed">
                Proceed to Checkout
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            )}
            <div className="mt-md flex items-center gap-2 justify-center text-label-sm font-label-sm text-secondary">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              Secure Checkout by KIZ FARM
            </div>
          </div>

          {/* Ad/Promo Card */}
          <div className="mt-md rounded-xl overflow-hidden relative group aspect-[4/3]">
            <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" data-alt="expansive lush green farm fields under a clear blue sky at dawn representing agricultural growth" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCv2VPSDn50fNV0CQH3fxFuRoTtaYnfd2mkqgXX9k8RDayE5sgRjSOI5RQns130QHVzCWzcAnUaxyIw6xizGr54Wrx0sVJUhqijT_336ZTKrZ1tXjqDsj1sXS3l5przkBD2k5JbfRDVjRwhOm6__M0QTRvtGf9jXYfGqFVWftFBkDKeaGnahFHBXNcp2nj9egCYLG57tXjwb6q3nDyDiLz22nKAxOI3Ela0CzpZTEyA-dq-Q5QqVo49UjgOcIqrfOKMjzVzKut9Jqg" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
              <h4 className="text-white font-bold text-lg">Direct From Source</h4>
              <p className="text-white/80 text-sm">Save 10% more on bulk purchases over 500kg</p>
            </div>
          </div>
        </aside>
      </main>

      <div className="h-20 lg:hidden"></div>

      {/* BottomNavBar Section */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-2 bg-white/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-none md:hidden">
        <Link className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 px-4 py-1 hover:text-[#1B6D24] transition-all active:scale-90 duration-200" href="/buyer/marketplace">
          <span className="material-symbols-outlined">home</span>
          <span className="font-['Inter'] text-[12px] font-semibold">Home</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-[#1B6D24] bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-1 hover:text-[#1B6D24] transition-all active:scale-90 duration-200" href="/buyer/cart">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
          <span className="font-['Inter'] text-[12px] font-semibold">Cart</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 px-4 py-1 hover:text-[#1B6D24] transition-all active:scale-90 duration-200" href="/buyer/orders">
          <span className="material-symbols-outlined">receipt_long</span>
          <span className="font-['Inter'] text-[12px] font-semibold">Orders</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 px-4 py-1 hover:text-[#1B6D24] transition-all active:scale-90 duration-200" href="/buyer/profile">
          <span className="material-symbols-outlined">person</span>
          <span className="font-['Inter'] text-[12px] font-semibold">Profile</span>
        </Link>
      </nav>
    </>
  );
}
