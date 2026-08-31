"use client"

import React from 'react';

export default function AccessContactPage() {
  return (
    <div className="bg-white text-on-surface antialiased" style={{fontFamily: "'Inter', sans-serif", minHeight: 'max(884px, 100dvh)'}}>
      {/* TopAppBar */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-4 h-16 max-w-7xl mx-auto">
          <div className="flex items-center">
            <img alt="KIZ FARM Official Logo" className="h-12 w-auto object-contain" src="/logo.jpeg" />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-6 items-center">
              <a className="font-inter antialiased text-sm font-medium text-gray-500 hover:text-green-800 duration-150" href="#">Hub</a>
              <a className="font-inter antialiased text-sm font-medium text-gray-500 hover:text-green-800 duration-150" href="#">Marketplace</a>
              <a className="font-inter antialiased text-sm font-medium text-green-800 font-bold" href="#">Profile</a>
            </div>
            <img alt="Nigerian farmer profile photo" className="w-8 h-8 rounded-full border border-gray-200 object-cover" data-alt="A professional close-up portrait of a Nigerian agricultural expert in a modern office setting. He is wearing a clean, professional button-down shirt and has a warm, confident expression. The lighting is bright and natural, reflecting a clean SaaS brand aesthetic with soft shadows and high-key tones. The background is a blurred office interior with hints of green foliage." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCtLuPLknfTb22NHzPcQYkRunGVkxkXZKXtzeg5klOJVQrMcrSfjDEZyL_PprDGOmL_UQmXkGQa527MLbdbV7M15QpRLptkv4L7n-l04P_RiaNtipMZ8yFw1eWJVrU4fgn5-5rC0a6AqZEfExzrMt0n6iscUr8GeTfRpxYKdXDSpc8drwNBF4ip_NlX1eDTBMXIcFIe-Dv25RmupP51rCNPoxQKdtkvWUDSoniTg9VbgJZnBbI4PtDhZAyTNzJX86L8OeMOZo7FY8" />
          </div>
        </div>
      </header>

      <main className="max-w-container-max mx-auto px-4 md:px-32 py-12 md:py-16">
        {/* Success State Section */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-fixed rounded-full mb-6">
            <span className="material-symbols-outlined text-primary text-[48px]" data-icon="check_circle" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
          </div>
          <h2 className="font-h1 text-h1 text-on-surface mb-2">Subscription Confirmed!</h2>
          <p className="font-body-md text-text-body-md text-on-surface-variant">Your journey to professional farming excellence starts now. We&apos;ve notified your coach about your enrollment.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter max-w-5xl mx-auto">
          {/* Coach Contact Information Card */}
          <div className="md:col-span-7 bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-lg border-b border-outline-variant bg-surface-container-lowest">
              <h3 className="font-h3 text-h3 text-on-surface">Your Coach&apos;s Contact Information</h3>
            </div>
            <div className="p-lg space-y-6">
              <div className="flex items-center gap-4">
                <img alt="Coach profile photo" className="w-16 h-16 rounded-lg object-cover" data-alt="A professional headshot of an experienced agricultural coach with a friendly and knowledgeable expression. He is dressed in business casual attire suitable for an agrotech consultancy role. The photography uses high-quality studio lighting that creates a professional, trustworthy atmosphere consistent with a modern SaaS platform. The background is neutral and clean." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNfciFfGwSVJ7ZCQeTtkj0gBc0b7MqUZlhP-LRcq3EMat2Xi7ISN2ZxnrC4OAZJ4XxtiTWbq7V2fdQXiobWl9SQUq6w4F0aS6qE3SR7aYMFxw8VO-asW1iZscvpeM3U78c6Qg7WhIs3R24PVgVNVe26-vJwMtidb_8XmS2-MeWvvWb09qhIlAeGhd7fdQTWXoiYEYdO6KSSswWAABYvXLykD1pXsLMIkeqy5vKpmR2c1FJiyjvW0xMkR1M_alqu-duOQCWrY5iI3o" />
                <div>
                  <p className="font-label-sm text-text-label-sm text-outline uppercase tracking-wider">Lead Instructor</p>
                  <p className="font-h2 text-h2 text-on-surface">Dr. Olumide Adeleke</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-md rounded-lg bg-surface-container-low border border-outline-variant">
                  <span className="material-symbols-outlined text-primary" data-icon="chat">chat</span>
                  <div>
                    <p className="font-label-sm text-text-label-sm text-on-surface-variant">WhatsApp Number</p>
                    <p className="font-numeric text-text-numeric font-semibold text-on-surface">+234 801 234 5678</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-md rounded-lg bg-surface-container-low border border-outline-variant">
                  <span className="material-symbols-outlined text-primary" data-icon="mail">mail</span>
                  <div>
                    <p className="font-label-sm text-text-label-sm text-on-surface-variant">Official Email</p>
                    <p className="font-numeric text-text-numeric font-semibold text-on-surface">adeleke.o@kizfarm.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps Card */}
          <div className="md:col-span-5 bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col">
            <div className="p-lg border-b border-outline-variant bg-surface-container-lowest">
              <h3 className="font-h3 text-h3 text-on-surface">Next Steps</h3>
            </div>
            <div className="p-lg flex-grow flex flex-col justify-center space-y-4">
              <button className="w-full bg-primary-container text-white py-4 px-6 rounded-lg font-label-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all">
                <span className="material-symbols-outlined" data-icon="menu_book">menu_book</span>
                Access Course Materials
              </button>
              <button className="w-full bg-white text-primary-container border-2 border-primary-container py-4 px-6 rounded-lg font-label-md flex items-center justify-center gap-2 hover:bg-green-50 active:scale-95 transition-all">
                <span className="material-symbols-outlined" data-icon="send">send</span>
                Message Coach
              </button>
              <div className="pt-4 text-center">
                <p className="font-body-sm text-text-body-sm text-on-surface-variant">
                  Course content is now available in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Course Summary Bento-ish Section */}
        <div className="mt-xl grid grid-cols-1 md:grid-cols-3 gap-gutter max-w-5xl mx-auto">
          <div className="p-lg bg-surface-container rounded-xl border border-outline-variant">
            <span className="material-symbols-outlined text-primary mb-2" data-icon="calendar_today">calendar_today</span>
            <p className="font-label-sm text-text-label-sm text-on-surface-variant uppercase">Duration</p>
            <p className="font-h3 text-h3 text-on-surface">12 Weeks</p>
          </div>
          <div className="p-lg bg-surface-container rounded-xl border border-outline-variant">
            <span className="material-symbols-outlined text-primary mb-2" data-icon="videocam">videocam</span>
            <p className="font-label-sm text-text-label-sm text-on-surface-variant uppercase">Format</p>
            <p className="font-h3 text-h3 text-on-surface">Live &amp; Recorded</p>
          </div>
          <div className="p-lg bg-surface-container rounded-xl border border-outline-variant">
            <span className="material-symbols-outlined text-primary mb-2" data-icon="workspace_premium">workspace_premium</span>
            <p className="font-label-sm text-text-label-sm text-on-surface-variant uppercase">Benefit</p>
            <p className="font-h3 text-h3 text-on-surface">Global Certificate</p>
          </div>
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around items-center px-4 py-2 pb-safe z-50 shadow-[0_-1px_3px_0_rgba(0,0,0,0.05)]">
        <a className="flex flex-col items-center justify-center text-gray-500 px-4 py-1.5 hover:text-green-700 active:opacity-80 transition-opacity" href="#">
          <span className="material-symbols-outlined" data-icon="school">school</span>
          <span className="font-inter text-[11px] font-semibold">Hub</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-500 px-4 py-1.5 hover:text-green-700 active:opacity-80 transition-opacity" href="#">
          <span className="material-symbols-outlined" data-icon="storefront">storefront</span>
          <span className="font-inter text-[11px] font-semibold">Marketplace</span>
        </a>
        <a className="flex flex-col items-center justify-center text-green-800 bg-green-50 rounded-lg px-4 py-1.5 active:opacity-80 transition-opacity" href="#">
          <span className="material-symbols-outlined" data-icon="account_circle" style={{fontVariationSettings: "'FILL' 1"}}>account_circle</span>
          <span className="font-inter text-[11px] font-semibold">Profile</span>
        </a>
      </nav>

      {/* Spacer for Mobile Nav */}
      <div className="h-20 md:hidden"></div>
    </div>
  );
}
