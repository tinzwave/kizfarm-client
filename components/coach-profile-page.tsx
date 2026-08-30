"use client"

import React from 'react';

export default function CoachProfilePage() {
  return (
    <div className="bg-surface-container-lowest text-on-surface" style={{fontFamily: "'Inter', sans-serif", minHeight: 'max(884px, 100dvh)'}}>
      {/* TopAppBar */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="flex justify-between items-center w-full px-4 h-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <img alt="KIZ FARM Logo" className="h-10 w-auto object-contain" src="/logo.jpeg" />
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-6">
              <a className="text-green-800 font-bold font-inter text-sm antialiased" href="#">Hub</a>
              <a className="text-gray-500 font-inter text-sm antialiased hover:bg-gray-50 transition-all duration-150 rounded px-2 py-1" href="#">Marketplace</a>
              <a className="text-gray-500 font-inter text-sm antialiased hover:bg-gray-50 transition-all duration-150 rounded px-2 py-1" href="#">Profile</a>
            </nav>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
              <img alt="Nigerian farmer profile photo" className="w-full h-full object-cover" data-alt="A professional portrait of a Nigerian agricultural professional with a confident smile. The background is a blurred high-tech greenhouse environment with lush green plants. The lighting is warm and natural, suggesting an outdoor yet professional atmosphere. The image uses a clean, high-resolution aesthetic suitable for a modern SaaS platform profile photo." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgmoorqKfVCkEuuINhoItTlGeOUIqIBFnkLmD1SFaIX4xdGIFbvLk0wATShiY1vKiVFqQFAAglrACqVmmR-rylKXzUDMfYlobr8L78nJCiJ_Ckwas3OmnLY_6PlwGi6yqfja8gTzLRghd-okl2RN7tpuqrwFAEL2awKmX3-ZK4jgndLRCFQAczat9i65wbhCIFDIfwVRvPFtY8OyTfwcGSAhy9GAzpD384PM1MFh8SVPazESJmzGPuC973Gmbfv2dqmY9SLN8nJNY" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-xl md:py-margin mb-24">
        {/* Profile Header Section: Bento-ish Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Coach Identity Card */}
          <div className="lg:col-span-8 bg-white border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col md:flex-row gap-lg items-center md:items-start">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl overflow-hidden shrink-0 shadow-md">
              <img alt="Coach Adebayo okoro" className="w-full h-full object-cover" data-alt="A close-up high-quality photograph of a Nigerian agricultural expert in his early 40s standing in a thriving poultry farm. He is wearing a clean, branded forest green polo shirt and holding a digital tablet. The background shows rows of modern, sustainable poultry housing under a clear blue sky. The lighting is bright and optimistic, emphasizing a data-driven farming approach." src="https://lh3.googleusercontent.com/aida-public/AB6AXuChKR1OHjY1hmF5bDriIscdRRrvtfDuTmGjENhvpazQDY84TgkEeYDHfa_6tY_QjKMQQYA6BZZ2R7-Z2HVYuP1rXrMToZMGmUHNPHlUypg2yvXs_wJlGKPLuVjcWPfXx9gD51OMdJfeV_weks97gS1-fle2zc_doKiwkQtx4Im1ys6Xn-f7Hej-nlLDIXw1sE03HPSeTmvgoBEEoz3Exxld0x6nU-p2Dgd9TsOqloIRie7iQrKrge7s6qCF_eCHZgZ59SS-i0RlHSE" />
            </div>
            <div className="flex-grow text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-md">
                <div>
                  <h2 className="font-h1 text-h1 text-on-surface">Dr. Adebayo Okoro</h2>
                  <p className="font-body-md text-primary font-semibold">Specialization: Sustainable Poultry Systems</p>
                </div>
                <div className="bg-secondary-container px-md py-sm rounded-full flex items-center gap-xs">
                  <span className="material-symbols-outlined text-on-secondary-container text-sm" data-icon="workspace_premium">workspace_premium</span>
                  <span className="font-label-sm text-on-secondary-container">12+ Years Experience</span>
                </div>
              </div>
              <p className="font-body-md text-on-surface-variant leading-relaxed mb-lg">
                Leading expert in tropical poultry management and sustainable feedstock development. Dr. Okoro has helped over 500 Nigerian farms scale their production by 40% using precision agriculture and biosecurity protocols.
              </p>
              <div className="flex flex-wrap gap-sm justify-center md:justify-start">
                <span className="bg-surface-container-high text-on-tertiary-fixed-variant px-md py-xs rounded-full font-label-sm border border-outline-variant">Broiler Optimization</span>
                <span className="bg-surface-container-high text-on-tertiary-fixed-variant px-md py-xs rounded-full font-label-sm border border-outline-variant">Feed Formulation</span>
                <span className="bg-surface-container-high text-on-tertiary-fixed-variant px-md py-xs rounded-full font-label-sm border border-outline-variant">Vaccination Protocols</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="lg:col-span-4 grid grid-cols-1 gap-gutter">
            <div className="bg-primary-container text-on-primary border border-primary-container rounded-xl p-lg shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-4xl opacity-80" data-icon="groups">groups</span>
                <span className="font-label-sm bg-white/20 px-sm py-xs rounded">Top Rated</span>
              </div>
              <div>
                <h3 className="font-h2 text-h2 text-white">4.9/5.0</h3>
                <p className="font-body-sm text-on-primary-container">Average Student Rating</p>
              </div>
            </div>
            <div className="bg-white border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-primary text-4xl" data-icon="videocam">videocam</span>
                <span className="text-primary font-bold">Live</span>
              </div>
              <div>
                <h3 className="font-h2 text-h2 text-on-surface">Daily</h3>
                <p className="font-body-sm text-on-surface-variant">Consultation Availability</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="mt-xl grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Consultation Services Section */}
          <section className="lg:col-span-7">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="font-h2 text-h2">Consultation Services</h2>
              <span className="text-primary font-semibold flex items-center gap-1 cursor-pointer">
                View All <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span>
              </span>
            </div>
            <div className="space-y-md">
              {/* Service Row 1 */}
              <div className="group bg-white border border-outline-variant hover:border-primary p-md rounded-xl transition-all duration-300 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined" data-icon="chat">chat</span>
                  </div>
                  <div>
                    <h4 className="font-label-md text-on-surface">1-on-1 Q&amp;A Session</h4>
                    <p className="font-body-sm text-on-surface-variant">30 Minutes Video Call</p>
                  </div>
                </div>
                <div className="flex items-center gap-lg">
                  <div className="text-right">
                    <p className="font-h3 text-h3 text-on-surface">₦15,000</p>
                    <p className="font-label-sm text-primary">Limited Slots</p>
                  </div>
                  <button className="bg-primary-container text-on-primary px-lg py-sm rounded-lg font-label-md hover:opacity-90 transition-all active:scale-95">Book Now</button>
                </div>
              </div>
              {/* Service Row 2 */}
              <div className="group bg-white border border-outline-variant hover:border-primary p-md rounded-xl transition-all duration-300 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
                  </div>
                  <div>
                    <h4 className="font-label-md text-on-surface">Farm Audit &amp; Analysis</h4>
                    <p className="font-body-sm text-on-surface-variant">60 Minutes In-depth Review</p>
                  </div>
                </div>
                <div className="flex items-center gap-lg">
                  <div className="text-right">
                    <p className="font-h3 text-h3 text-on-surface">₦35,000</p>
                    <p className="font-label-sm text-on-surface-variant">Best Value</p>
                  </div>
                  <button className="bg-primary-container text-on-primary px-lg py-sm rounded-lg font-label-md hover:opacity-90 transition-all active:scale-95">Book Now</button>
                </div>
              </div>
              {/* Service Row 3 */}
              <div className="group bg-white border border-outline-variant hover:border-primary p-md rounded-xl transition-all duration-300 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined" data-icon="engineering">engineering</span>
                  </div>
                  <div>
                    <h4 className="font-label-md text-on-surface">Biosecurity Implementation</h4>
                    <p className="font-body-sm text-on-surface-variant">2 Sessions + PDF Roadmap</p>
                  </div>
                </div>
                <div className="flex items-center gap-lg">
                  <div className="text-right">
                    <p className="font-h3 text-h3 text-on-surface">₦65,000</p>
                    <p className="font-label-sm text-on-surface-variant">Intensive</p>
                  </div>
                  <button className="bg-primary-container text-on-primary px-lg py-sm rounded-lg font-label-md hover:opacity-90 transition-all active:scale-95">Book Now</button>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Courses Section */}
          <section className="lg:col-span-5">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="font-h2 text-h2">Recent Courses</h2>
              <button className="text-primary font-semibold text-label-md">Subscribe to All</button>
            </div>
            <div className="space-y-gutter">
              {/* Course Card 1 */}
              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm group">
                <div className="h-40 w-full relative">
                  <img alt="Poultry Mastery Course" className="w-full h-full object-cover" data-alt="An expansive bird's eye view of a clean, modern Nigerian poultry farm at sunrise. The architecture is sleek and sustainable, with solar panels on roofs and perfectly manicured pathways. The atmosphere is professional, clean, and technologically advanced, mirroring a high-end corporate agricultural facility." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI73RrUg2O_uAk3lLbQGVVLYR9aSADGSDL8AXUgSDYvEYMasEJFzp4nN3ClPDNCaEV_td5IshRhLZ9kne7sfLAFQus-_k7C9bDtPrELleT4tTJveW6eiGSCzKVILpp7UiEM9RFUTVnuY-zLHGqsqspHnvn5TAe9C5AATesOA8WFFnuaWAPHrvErFviwa2rMVcy76YG4fO51eOOVkTgjlq0VHqRHhP62jqo-_65YhFA4ZIr8O8Ilw2iioPs4cN-HG0_BHrtgk8JzGw" />
                  <div className="absolute top-sm right-sm bg-white/90 backdrop-blur px-sm py-xs rounded font-label-sm text-primary">8 Lessons</div>
                </div>
                <div className="p-md">
                  <h4 className="font-h3 text-on-surface group-hover:text-primary transition-colors">Sustainable Poultry Mastery</h4>
                  <p className="font-body-sm text-on-surface-variant mt-xs">Complete guide to bio-circular poultry farming.</p>
                  <div className="mt-md flex items-center justify-between">
                    <div className="flex items-center gap-xs">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant" data-icon="star" data-weight="fill" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="font-numeric text-on-surface">4.8</span>
                      <span className="font-label-sm text-on-surface-variant">(124)</span>
                    </div>
                    <span className="font-h3 text-primary">₦25,000</span>
                  </div>
                </div>
              </div>
              {/* Course Card 2 */}
              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm group">
                <div className="h-40 w-full relative">
                  <img alt="Feed Formulation Course" className="w-full h-full object-cover" data-alt="A detailed, macro photograph of high-quality organic chicken feed grains being held in dark-skinned hands. The background is a clean, well-lit agricultural laboratory. The scene conveys scientific precision, nutritional expertise, and high production standards within the modern Nigerian agricultural sector." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAkM4Pm6TGv1LFmggIaYEdIkswo7X9FkEFc6Kw-9o1nkkzT3Em9DmZT4lDD_r4X-qkSnOhz4r0VDLeio1iVztojAo6ZsSMlfwDb7C-PWsPBdnWdEcSX7aE7ZZ0lRLSy_5q9ba3On4yNmheeD2_GUy-H0Wu2rR50IdSjg1lH_UDXaCIdvjeBkEAac-ual39jPCItqcjDQqOYLsyiCRlNFFl9Q1FTVc1nwUwWrFj0nJ2KVW9VV6g6beAh0cbcrJr2WENXVqevibyH9k" />
                  <div className="absolute top-sm right-sm bg-white/90 backdrop-blur px-sm py-xs rounded font-label-sm text-primary">5 Lessons</div>
                </div>
                <div className="p-md">
                  <h4 className="font-h3 text-on-surface group-hover:text-primary transition-colors">Alternative Feed Formulation</h4>
                  <p className="font-body-sm text-on-surface-variant mt-xs">Reducing costs with local ingredients.</p>
                  <div className="mt-md flex items-center justify-between">
                    <div className="flex items-center gap-xs">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant" data-icon="star" data-weight="fill" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="font-numeric text-on-surface">5.0</span>
                      <span className="font-label-sm text-on-surface-variant">(86)</span>
                    </div>
                    <span className="font-h3 text-primary">₦18,500</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-2 pb-safe bg-white border-t border-gray-100 shadow-[0_-1px_3px_0_rgba(0,0,0,0.05)] z-50">
        <a className="flex flex-col items-center justify-center text-gray-500 px-4 py-1.5 hover:text-green-700 active:opacity-80 transition-all" href="#">
          <span className="material-symbols-outlined" data-icon="school">school</span>
          <span className="font-inter text-[11px] font-semibold">Hub</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-500 px-4 py-1.5 hover:text-green-700 active:opacity-80 transition-all" href="#">
          <span className="material-symbols-outlined" data-icon="storefront">storefront</span>
          <span className="font-inter text-[11px] font-semibold">Marketplace</span>
        </a>
        <a className="flex flex-col items-center justify-center text-green-800 bg-green-50 rounded-lg px-4 py-1.5 active:opacity-80 transition-all" href="#">
          <span className="material-symbols-outlined" data-icon="account_circle">account_circle</span>
          <span className="font-inter text-[11px] font-semibold">Profile</span>
        </a>
      </nav>
    </div>
  );
}
