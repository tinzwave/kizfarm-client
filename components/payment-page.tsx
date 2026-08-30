"use client"

import React from 'react';

export default function PaymentPage() {
  return (
    <>
      {/* TopAppBar */}
      <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 shadow-none sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-6 py-3 h-16 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:opacity-80 transition-opacity active:scale-95 duration-150">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <img alt="KIZ FARM logo" className="h-8 w-8 object-contain" data-alt="Official KIZ FARM logo" src="/logo.jpeg" />
              <span className="text-xl font-extrabold tracking-tight text-[#1B6D24] dark:text-green-500 font-inter antialiased">KIZ FARM</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[#1B6D24] dark:text-green-500 hover:opacity-80 transition-opacity active:scale-95 duration-150">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-margin py-lg lg:py-xl">
        <div className="max-w-3xl mx-auto">
          {/* Header Section */}
          <div className="mb-lg">
            <h1 className="font-headline-lg text-headline-lg text-primary mb-xs">Payment Methods</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Manage your saved cards and payment preferences for secure agricultural transactions.</p>
          </div>

          {/* Bento Layout for Payment Methods */}
          <div className="grid grid-cols-1 gap-gutter">
            {/* Saved Cards List */}
            <div className="space-y-md">
              <h2 className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Saved Cards</h2>

              {/* Card 1: Primary */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-md flex items-center justify-between hover:border-primary transition-colors group">
                <div className="flex items-center gap-md">
                  <div className="w-16 h-10 bg-surface-container-low rounded flex items-center justify-center p-2">
                    <span className="material-symbols-outlined text-primary text-3xl">credit_card</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-label-sm text-body-md text-on-surface">Visa ending in 4242</p>
                      <span className="px-2 py-0.5 bg-primary-fixed text-on-primary-fixed rounded-full text-[10px] font-bold uppercase tracking-tighter">Primary</span>
                    </div>
                    <p className="font-label-xs text-label-xs text-on-surface-variant mt-0.5">Expires 12/26</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <button className="p-2 text-outline hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button className="p-2 text-outline hover:text-error transition-colors">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-md flex items-center justify-between hover:border-primary transition-colors">
                <div className="flex items-center gap-md">
                  <div className="w-16 h-10 bg-surface-container-low rounded flex items-center justify-center p-2">
                    <span className="material-symbols-outlined text-primary text-3xl">payments</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-body-md text-on-surface">Mastercard ending in 8801</p>
                    <p className="font-label-xs text-label-xs text-on-surface-variant mt-0.5">Expires 09/25</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <button className="p-2 text-outline hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button className="p-2 text-outline hover:text-error transition-colors">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:opacity-90 active:scale-[0.98] transition-all">
              <span className="material-symbols-outlined">add</span>
              Add New Method
            </button>

            {/* Trust Indicators (Asymmetric Layout/Bento Element) */}
            <div className="mt-lg grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div className="bg-surface-container-low rounded-xl p-md border border-transparent">
                <div className="flex items-center gap-base mb-sm">
                  <span className="material-symbols-outlined text-primary">verified_user</span>
                  <h3 className="font-label-sm text-label-sm text-on-surface">Secure Transactions</h3>
                </div>
                <p className="font-body-md text-label-xs text-on-surface-variant">Your payment information is encrypted and protected by industry-leading security protocols.</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-md border border-transparent">
                <div className="flex items-center gap-base mb-sm">
                  <span className="material-symbols-outlined text-primary">history</span>
                  <h3 className="font-label-sm text-label-sm text-on-surface">Payment History</h3>
                </div>
                <p className="font-body-md text-label-xs text-on-surface-variant">Access complete records of your farm equipment purchases and supply subscriptions in your orders.</p>
              </div>
            </div>

            {/* Aesthetic Image Card */}
            <div className="relative overflow-hidden rounded-xl h-48 group mt-md">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
              <div className="absolute bottom-4 left-6 z-20">
                <p className="text-white font-headline-md text-headline-md">Sustainably Managed</p>
                <p className="text-white/80 font-label-xs text-label-xs uppercase">Powering the Future of Farming</p>
              </div>
              <img alt="Farm landscape" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" data-alt="expansive lush green crop field under a clear blue sky at sunset with warm golden hour light reflecting on the soil" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCt5eBcr8ZP79C3IUFfDT3un3VB6FSPISgWDF7sfgPIGK75ddvY7wk3p0_iBgs31VyTCjEAPcvjz20-02pN9d6IjgPR4PFylY0EOJfeIr0LqnWT2lYV06sLyl9MYMnMCPAApL5ltUScFhz7_-LlP_yWgj7M123N-GQknSgc-nNML-ZdYTVofIiDIUjJrIHV1g-3WYqeS0EqCItTXTPxGR6b4oLcMLObK5Gk_5RtPKvNSCECWQPROCx6q6jP39-2Kvla3_tHyjiF0Gs" />
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-white dark:bg-zinc-950 h-20 pb-safe border-t border-gray-100 dark:border-zinc-800 shadow-[0_-10px_30px_rgba(27,109,36,0.05)]">
        <a className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 p-2 hover:text-[#1B6D24] dark:hover:text-green-400 transition-colors active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined" data-icon="home">home</span>
          <span className="font-inter text-[10px] font-semibold uppercase tracking-wider">Home</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 p-2 hover:text-[#1B6D24] dark:hover:text-green-400 transition-colors active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined" data-icon="storefront">storefront</span>
          <span className="font-inter text-[10px] font-semibold uppercase tracking-wider">Market</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 p-2 hover:text-[#1B6D24] dark:hover:text-green-400 transition-colors active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined" data-icon="shopping_bag">shopping_bag</span>
          <span className="font-inter text-[10px] font-semibold uppercase tracking-wider">Orders</span>
        </a>
        <a className="flex flex-col items-center justify-center text-[#1B6D24] dark:text-green-500 p-2 hover:text-[#1B6D24] dark:hover:text-green-400 transition-colors active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined" data-icon="person">person</span>
          <span className="font-inter text-[10px] font-semibold uppercase tracking-wider">Profile</span>
        </a>
      </nav>
    </>
  );
}
