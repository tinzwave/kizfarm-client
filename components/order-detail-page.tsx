"use client"

import React from 'react';

export default function OrderDetailPage() {
  return (
    <>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center w-full px-6 py-3 h-16">
        <div className="flex items-center gap-3">
          <img alt="KIZ FARM Logo" className="h-8 w-auto object-contain" src="/logo.jpeg" />
        </div>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-gray-500 dark:text-zinc-400 hover:opacity-80 transition-opacity active:scale-95 duration-150">notifications</button>
          <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant">
            <img alt="User Profile" className="h-full w-full object-cover" data-alt="Professional headshot of a smiling man in a business casual outfit with a neutral studio background and soft lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBBQTDYPVqlEFIiaUNU93CBi3qRh76HOdyjJPyUFoltM457AswyjN5M_h4CdvmkQT9urretCVZUdKmZdmZf0OILuZibpvq-G-EjGLPMn7iuny03aBQDo3epuzz0ArCjv02EQWR_1vBHHQkc6OyuSeQOtep2HrloI8q6217px-j1ZDfW-S_o9sBaUT59jyylRU9zhEciHwPbrNz5iHkWxcmnaV-RCbMzM9UCl8f8MsQv8IkR4exzr8uXdn-jt8r151e9FDAxze0xhk" />
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-margin py-lg lg:grid lg:grid-cols-12 lg:gap-gutter">
        {/* Main Content (8 Columns) */}
        <div className="lg:col-span-8 space-y-md">
          {/* Order Header & Progress Tracker */}
          <section className="bg-white border border-gray-200 p-md rounded-xl custom-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm mb-md">
              <div>
                <h1 className="font-headline-md text-headline-md text-on-surface">Order #KF-9284-A</h1>
                <p className="font-body-md text-label-sm text-on-surface-variant">Placed on October 12, 2023 • 09:42 AM</p>
              </div>
              <div className="bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full font-label-xs self-start md:self-center">
                IN TRANSIT
              </div>
            </div>

            {/* Progress Tracker */}
            <div className="relative pt-sm">
              <div className="flex justify-between mb-2">
                <div className="flex flex-col items-center flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white z-10">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <span className="font-label-xs mt-2 text-primary">Placed</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white z-10">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <span className="font-label-xs mt-2 text-primary">Harvested</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary-fixed-dim border-2 border-primary flex items-center justify-center text-primary z-10">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                  </div>
                  <span className="font-label-xs mt-2 text-primary">Shipped</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-400 z-10">
                    <span className="material-symbols-outlined text-sm">home_pin</span>
                  </div>
                  <span className="font-label-xs mt-2 text-gray-400">Delivered</span>
                </div>
              </div>
              <div className="absolute top-12 left-0 w-full h-1 bg-gray-100 -z-0 translate-y-[-1px]">
                <div className="h-full bg-primary w-2/3"></div>
              </div>
            </div>
          </section>

          {/* Item List (Bento-style layout) */}
          <section className="space-y-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface px-xs">Items in your harvest</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
              {/* Item 1 */}
              <div className="bg-white border border-gray-200 p-sm rounded-xl flex gap-md hover:border-primary-container transition-all group custom-shadow">
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img alt="Fresh Tomatoes" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" data-alt="Close-up of vibrant red organic vine tomatoes with green stalks on a rustic wooden farm table with soft natural light." src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0AHqxNPldyi5DkkEoLrkV7SNlsSgFEq-rOcr5t10W_T9F1JOQisQLmkqjFe-KGkn5mQNDOw1rjOF0xR3PnGl6rGIpGRU5_ObS_iblze8He7E8iiln8yDnBdVjkAVw5NRt3wbU-_phbfpgA7HQyhNBjOOpzWi2GAwbT_eZ_Ivz1TFP3iSC0OsXHUzZ5xXkqXXzatOh9DGjIfhVP3CuCIvO461jZh-JbFj5zomIP_TnrCq6n17VlKAa7vzQ6aZafzod5DDirs7tjkU" />
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-headline-md text-body-lg font-bold">Organic Roma Tomatoes</h3>
                    <span className="font-label-sm text-primary">₦4,200</span>
                  </div>
                  <p className="font-body-md text-on-surface-variant text-label-sm">Quantity: 2 kg</p>
                  <div className="mt-base flex gap-xs">
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">IRRIGATED</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">PEST-FREE</span>
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="bg-white border border-gray-200 p-sm rounded-xl flex gap-md hover:border-primary-container transition-all group custom-shadow">
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img alt="Fresh Potatoes" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" data-alt="A heap of earthy unwashed organic potatoes freshly harvested from the soil, captured in high-detail documentary style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB48BhCbGONmNIpX7ZMf9_7mtlZ0gGJE3WezKbZGoNpTZYm8ZYZpFid2rQ5CCb3jGI7DEkledBfIQjlgX-qwWLOFr0Sm7olCrO2tJ2WlP-6IQJCV4rNJ_rZYxEjeS_6ihpPDlRPZwSTySa-L67k-N3Om-LbI7T5gmOLHTKKSTH8fD15o1XpNL96yjZrKn4Vu0TVuioZChCvNqJRT5UR1gSOf4SIDYtrQhN8EGkCbp5JSs2BEYDmF2IDJP3G8iCqKTSnzpIqFvG81W8" />
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-headline-md text-body-lg font-bold">Irish Potatoes</h3>
                    <span className="font-label-sm text-primary">₦7,500</span>
                  </div>
                  <p className="font-body-md text-on-surface-variant text-label-sm">Quantity: 5 kg</p>
                  <div className="mt-base flex gap-xs">
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">RAIN-FED</span>
                  </div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="bg-white border border-gray-200 p-sm rounded-xl flex gap-md hover:border-primary-container transition-all group custom-shadow">
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img alt="Fresh Carrots" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" data-alt="Bunch of bright orange carrots with green leafy tops on a neutral textured background with dramatic side lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAT7WjLija1W5gEXl73YijFdVVNt7k3LdtIfeVbiMuLRhDqUtxf3RtXzaeof6cZmq80fU6mt-SGdu-L2bom5jiHrpWzUbmBDt1NRAzmqwkWTrpOxs-pJWOxZ2hZln2-Rf3VevC86PnwLIDPETYDZeVz8KvsiICHId7uFR8_KI5b-tUcfmLaaQ1x85T2Od1vzljHqS5gI0Vk_vIYAmy_dt-ZAUIG7jRYgpi9Bqdhbfnt76qnTFmuvmzKO_TPULcCyiCuyUckPIScAY4" />
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-headline-md text-body-lg font-bold">Nantes Carrots</h3>
                    <span className="font-label-sm text-primary">₦2,800</span>
                  </div>
                  <p className="font-body-md text-on-surface-variant text-label-sm">Quantity: 1.5 kg</p>
                  <div className="mt-base flex gap-xs">
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">ORGANIC</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Support Footer (Mobile only) */}
          <div className="lg:hidden flex flex-col items-center py-md space-y-md">
            <p className="font-body-md text-on-surface-variant text-center">Need help with this order?</p>
            <button className="w-full h-12 bg-white border border-[#1B6D24] text-[#1B6D24] rounded-lg font-label-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
              <span className="material-symbols-outlined">support_agent</span>
              Contact Support
            </button>
          </div>
        </div>

        {/* Sidebar (4 Columns) */}
        <aside className="lg:col-span-4 space-y-md">
          {/* Order Summary Card */}
          <section className="bg-white border border-gray-200 rounded-xl p-md custom-shadow">
            <h3 className="font-headline-md text-body-lg font-bold mb-md">Order Summary</h3>
            <div className="space-y-sm">
              <div className="flex justify-between font-body-md text-on-surface-variant">
                <span>Subtotal</span>
                <span>₦14,500.00</span>
              </div>
              <div className="flex justify-between font-body-md text-on-surface-variant">
                <span>Tax (VAT 7.5%)</span>
                <span>₦1,087.50</span>
              </div>
              <div className="flex justify-between font-body-md text-on-surface-variant">
                <span>Delivery Fee</span>
                <span>₦1,200.00</span>
              </div>
              <div className="pt-sm border-t border-gray-100 flex justify-between items-center">
                <span className="font-headline-md text-body-lg font-bold">Total</span>
                <span className="font-headline-lg text-headline-md text-primary">₦16,787.50</span>
              </div>
            </div>
            <div className="mt-md p-sm bg-green-50 border border-green-100 rounded-lg flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <div>
                <p className="font-label-xs text-primary uppercase">Payment Status</p>
                <p className="font-body-md text-on-surface font-semibold">Paid via Paystack</p>
              </div>
            </div>
          </section>

          {/* Farmer & Delivery Info */}
          <section className="bg-white border border-gray-200 rounded-xl p-md custom-shadow">
            <div className="space-y-md">
              {/* Farmer Info */}
              <div>
                <h4 className="font-label-xs text-on-surface-variant uppercase tracking-widest mb-sm">Farmer Information</h4>
                <div className="flex items-center gap-sm">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img alt="Farmer Musa" className="w-full h-full object-cover" data-alt="A portrait of an elderly African farmer with a warm smile, wearing a traditional hat, standing in a sun-drenched field." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTO3etGwJCmTNFzJfjpusD0VZyI9yTX-13wjL7YzUEKlFg7G75xJ6Vdbp0tDPNPTgV9UuQ84UKk1-I4Bc0JmutL2aWd0U01cvviLZnyklgka-G-ouPdMYZxau5kU_xYEneDEnZyZB9J30HzTAUZvP5nha7g_dw6hD13qy8H40TjaAZrEW92ikskktfgdYXslKe0CAhwoHT1L3MG_3V8_nJTIwTEbQCNZLMZlzeq-2ipgTHWHw9TUuBPqfnHyI0AARapzEb5wFxqJE" />
                  </div>
                  <div>
                    <p className="font-body-md font-bold text-on-surface">Musa Abubakar</p>
                    <p className="font-label-xs text-on-surface-variant">Green Horizon Estate, Kaduna</p>
                  </div>
                  <button className="ml-auto w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-primary hover:bg-green-50 active:scale-90 transition-all">
                    <span className="material-symbols-outlined text-sm">chat</span>
                  </button>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="pt-md border-t border-gray-100">
                <h4 className="font-label-xs text-on-surface-variant uppercase tracking-widest mb-sm">Delivery Address</h4>
                <div className="flex gap-sm">
                  <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
                  <div>
                    <p className="font-body-md font-semibold text-on-surface">Home - Sarah Okafor</p>
                    <p className="font-body-md text-on-surface-variant text-sm">Block 4, Flat 12, Ocean View Estate<br />Victoria Island, Lagos</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Desktop Support Button */}
          <button className="hidden lg:flex w-full h-12 bg-white border border-[#1B6D24] text-[#1B6D24] rounded-lg font-label-sm items-center justify-center gap-2 hover:bg-green-50 active:scale-95 transition-all">
            <span className="material-symbols-outlined">support_agent</span>
            Contact Support
          </button>
        </aside>
      </main>

      {/* Bottom Navigation Bar (Mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-white dark:bg-zinc-950 h-20 pb-safe border-t border-gray-100 dark:border-zinc-800 shadow-[0_-10px_30px_rgba(27,109,36,0.05)]">
        <a className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 p-2 hover:text-[#1B6D24] transition-colors active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined" data-icon="home">home</span>
          <span className="font-inter text-[10px] font-semibold uppercase tracking-wider">Home</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 p-2 hover:text-[#1B6D24] transition-colors active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined" data-icon="storefront">storefront</span>
          <span className="font-inter text-[10px] font-semibold uppercase tracking-wider">Market</span>
        </a>
        <a className="flex flex-col items-center justify-center text-[#1B6D24] dark:text-green-500 p-2 active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined" data-icon="shopping_bag" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
          <span className="font-inter text-[10px] font-semibold uppercase tracking-wider">Orders</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 p-2 hover:text-[#1B6D24] transition-colors active:scale-90 duration-200" href="#">
          <span className="material-symbols-outlined" data-icon="person">person</span>
          <span className="font-inter text-[10px] font-semibold uppercase tracking-wider">Profile</span>
        </a>
      </nav>
    </>
  );
}
