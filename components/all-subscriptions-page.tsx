"use client"

import React from 'react';

export default function AllSubscriptionsPage() {
  return (
    <div className="bg-background font-body-md text-on-background" style={{fontFamily: "'Inter', sans-serif", minHeight: 'max(884px, 100dvh)'}}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* TopNavBar */}
      <nav className="flex justify-between items-center w-[calc(100%-280px)] ml-[280px] px-8 h-16 sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm hidden md:flex">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md focus-within:ring-2 focus-within:ring-green-800 rounded-lg">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-body-sm focus:ring-0" placeholder="Search subscriptions..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="material-symbols-outlined text-slate-500 hover:text-green-800 cursor-pointer">notifications</span>
          <span className="material-symbols-outlined text-slate-500 hover:text-green-800 cursor-pointer">help</span>
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <img alt="Admin User Profile" className="w-8 h-8 rounded-full border border-gray-200" data-alt="A professional headshot of a senior agricultural manager with a friendly expression. He is wearing a clean white shirt against a soft-focus background of a modern greenhouse facility. The lighting is natural and bright, conveying a sense of competence, authority, and agricultural innovation consistent with a high-end SaaS platform." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcH14DB_js6iMsSyd3zDyDSabdAEUZVbkzh46YeuIq2YMiQShzEGWp92Y07Hmb9EoE2al1KDI_ucYN817kJ7zV8mtn6NDCDu8hNHMDKJLcpx0TZ_-IBMUtg0vU0bDM_RkhPAWNlaerwjda56mgnhiUd57d1THqOak_88r4hAn6OXCCluwCxT2krq6gTeUbXa9yMHyS8iwEv6uYVNSo6TFSyn0sYQDsDMuJ0Mi4bC4CSv6ZjI8fkfV80wAaisMPLUlsebedt-oU7WA" />
            <span className="text-label-md font-bold text-green-800">AgriMarket Admin</span>
          </div>
        </div>
      </nav>

      {/* SideNavBar */}
      <aside className="flex flex-col w-[280px] h-screen fixed left-0 top-0 z-40 pt-6 px-4 bg-white border-r border-gray-200 hidden md:flex">
        <div className="flex items-center gap-3 px-4 mb-10">
          <img alt="AgriMarket Admin Logo" className="h-10 w-10 object-contain" data-alt="The official Kiz Farm logo featuring a stylized green leaf integrated with a modern circuit board pattern, symbolizing the intersection of agriculture and technology. The logo uses a deep forest green color scheme and is presented on a clean, white minimalist background. The design is sharp, professional, and reflects high-tech farming solutions." src="/logo.jpeg" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-green-900 leading-tight">KizFarm</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Admin Management</p>
          </div>
        </div>
        <nav className="space-y-1">
          <a className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-green-800 transition-all duration-200 rounded-lg group" href="#">
            <span className="material-symbols-outlined group-active:scale-90 transition-transform">dashboard</span>
            <span className="font-['Inter'] text-sm font-medium leading-tight">Dashboard</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-green-800 bg-green-50 border-r-4 border-green-800 font-semibold rounded-l-lg group" href="#">
            <span className="material-symbols-outlined group-active:scale-90 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>shopping_cart</span>
            <span className="font-['Inter'] text-sm font-medium leading-tight">Orders</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-green-800 transition-all duration-200 rounded-lg group" href="#">
            <span className="material-symbols-outlined group-active:scale-90 transition-transform">local_shipping</span>
            <span className="font-['Inter'] text-sm font-medium leading-tight">Logistics</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-green-800 transition-all duration-200 rounded-lg group" href="#">
            <span className="material-symbols-outlined group-active:scale-90 transition-transform">inventory_2</span>
            <span className="font-['Inter'] text-sm font-medium leading-tight">Inventory</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-green-800 transition-all duration-200 rounded-lg group" href="#">
            <span className="material-symbols-outlined group-active:scale-90 transition-transform">groups</span>
            <span className="font-['Inter'] text-sm font-medium leading-tight">Sellers</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-green-800 transition-all duration-200 rounded-lg group mt-auto" href="#">
            <span className="material-symbols-outlined group-active:scale-90 transition-transform">settings</span>
            <span className="font-['Inter'] text-sm font-medium leading-tight">Settings</span>
          </a>
        </nav>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 h-16 bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img alt="Kiz Farm Logo" className="h-8 w-8" data-alt="A professional Kiz Farm logo with forest green accents and high-tech agricultural symbolism, set against a clean white background for maximum visibility and brand clarity." src="/logo.jpeg" />
          <span className="text-h3 font-h3 text-primary">KizFarm</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      {/* Main Content Canvas */}
      <main className="md:ml-[280px] p-6 md:p-margin bg-background min-h-screen pb-24 md:pb-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-6">
          <a className="text-label-sm text-slate-400 hover:text-primary" href="#">Admin</a>
          <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
          <span className="text-label-sm text-primary font-bold">Subscriptions</span>
        </nav>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-h1 font-h1 text-on-surface mb-2">All Subscriptions</h2>
            <p className="text-body-sm text-on-surface-variant">Manage and monitor student course enrollments and subscription lifecycles.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant text-primary rounded-lg text-label-md font-bold hover:shadow-md transition-all">
              <span className="material-symbols-outlined text-[20px]">download</span>
              Export CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-lg text-label-md font-bold hover:opacity-90 shadow-sm transition-all">
              <span className="material-symbols-outlined text-[20px]">add</span>
              New Subscription
            </button>
          </div>
        </div>

        {/* Filter & Search Bento Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-8">
          <div className="md:col-span-2 bg-white p-lg rounded-xl border border-gray-100 shadow-sm">
            <label className="text-label-sm text-slate-500 uppercase tracking-wider mb-2 block">Search Subscribers</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary">search</span>
              <input className="w-full pl-10 pr-4 py-3 bg-slate-50 border-gray-100 rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="Name, Course Title or Tutor..." type="text" />
            </div>
          </div>
          <div className="bg-white p-lg rounded-xl border border-gray-100 shadow-sm">
            <label className="text-label-sm text-slate-500 uppercase tracking-wider mb-2 block">Status Filter</label>
            <select className="w-full py-3 px-4 bg-slate-50 border-gray-100 rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-transparent">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Expired</option>
              <option>Pending</option>
            </select>
          </div>
          <div className="bg-white p-lg rounded-xl border border-gray-100 shadow-sm">
            <label className="text-label-sm text-slate-500 uppercase tracking-wider mb-2 block">Date Range</label>
            <div className="flex items-center gap-2 py-3 px-4 bg-slate-50 border-gray-100 rounded-lg text-body-sm cursor-pointer hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-slate-400">calendar_today</span>
              <span className="text-on-surface">Last 30 Days</span>
            </div>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-label-sm font-bold text-slate-500 uppercase tracking-wider">User Name</th>
                  <th className="px-6 py-4 text-label-sm font-bold text-slate-500 uppercase tracking-wider">Course Title</th>
                  <th className="px-6 py-4 text-label-sm font-bold text-slate-500 uppercase tracking-wider">Tutor Assigned</th>
                  <th className="px-6 py-4 text-label-sm font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-label-sm font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-label-sm font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">JD</div>
                      <div>
                        <div className="text-body-sm font-bold text-on-surface">John Doe</div>
                        <div className="text-[12px] text-slate-500">john.doe@agri.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-body-sm font-medium text-on-surface">Hydroponic Masterclass</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img alt="Tutor" className="w-6 h-6 rounded-full" data-alt="A portrait of an expert agricultural tutor in their 40s, with a warm and approachable look, wearing a green polo shirt. The background shows a modern hydroponic farm with vibrant green plants and precise lighting, suggesting expertise in advanced farming techniques. Professional and trustworthy visual style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBntjoxnNEJwNclzUqJsiyz6KbLYtbsreIY4J-Qtx6pbco8cBTmzpmxOHVUq49-gRMfF8DzQezjrIXRhGWkIfcLOsSGdp_KN98-iRcYEc42FV5IPj6UxjOInN7BONIys_ErXOiDWBVl8prW5Du7Jncg8N_6vfHCPwdQlS6c80g22P2SgWQfIHjtiteXkr71O4KDX6ZUlaa-VQBtLv1Gh3swtgW1_uqUpp8S2KN__GKgljJScmKuFF1V-MJsCe0aTAu5cJirBb4LT7A" />
                      <span className="text-body-sm text-on-surface-variant">Dr. Sarah Miller</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-numeric text-slate-600">Oct 24, 2023</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-2"></span>
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-all">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold">AS</div>
                      <div>
                        <div className="text-body-sm font-bold text-on-surface">Alice Smith</div>
                        <div className="text-[12px] text-slate-500">alice.s@farmnet.io</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-body-sm font-medium text-on-surface">Precision Soil Analytics</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img alt="Tutor" className="w-6 h-6 rounded-full" data-alt="A close-up portrait of a professional female agricultural analyst with a confident expression. She is in a well-lit laboratory environment with clean, modern equipment in the background. The aesthetic is bright and clinical, emphasizing scientific precision and reliability in modern farming education." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCesey78PbkIPGOQ4YJ7AeJ-y9FPCjolUCaL2-mazkya2yga8SiocRVpNCWnmgUO2ssUjZhPIyciBo7Up2J-pYHDEHJ5x3RuVBXWFwrBGugm-53Vmx44eAgrBY15ncnKb6wnaDaJ2uQTZP2YlcnLhVCJO3H-oVN3vd9gC0eEq1HgT6Fuwuz3Af4gV-mhtSRhdC-qzY2CWxfaKh9yV58cH10MtsM3_--53Jx39zIGqK_N9G-Qd_vRBoe6Q6rkEo7q163fMaWh4xgwJc" />
                      <span className="text-body-sm text-on-surface-variant">Prof. Robert Chen</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-numeric text-slate-600">Sept 12, 2023</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold bg-red-100 text-red-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-2"></span>
                      Expired
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-all">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold">MK</div>
                      <div>
                        <div className="text-body-sm font-bold text-on-surface">Michael King</div>
                        <div className="text-[12px] text-slate-500">m.king@greenhouse.org</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-body-sm font-medium text-on-surface">Vertical Farming 101</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img alt="Tutor" className="w-6 h-6 rounded-full" data-alt="A portrait of a young, innovative agricultural entrepreneur with a creative and energetic look. The background is a vibrant indoor vertical farm with rows of glowing LEDs and lush greens. The photo style is modern, high-contrast, and dynamic, reflecting the future of sustainable food production." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYPMQoZV82rJnDS_l6sB1mwE5LL1gL9PAXbz3Udx7T2QfbqbQPaGyUBFWptEywSVVC5Z878ARerqvnLG-TCwbjUxIfsJ8HOb7Kjp4DWJZr5xh-T2V0oIYfUfgqZVkzgiOVbiNlo6Y6HCG0vNbvjAe1gkgxFkMK60IQufZXXgI81gmUawBW6lhEd8lVqwk2CYMv4U8fXHSfperZs3fn6I1J-mO3KOzUwBMmcOTJmQXPrSfsZmFp9PX7-jR-NWnEyFjW5Dicpegc-JI" />
                      <span className="text-body-sm text-on-surface-variant">Elena Rodriguez</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-numeric text-slate-600">Oct 05, 2023</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-2"></span>
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-all">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-800 font-bold">LW</div>
                      <div>
                        <div className="text-body-sm font-bold text-on-surface">Linda White</div>
                        <div className="text-[12px] text-slate-500">linda.w@agri.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-body-sm font-medium text-on-surface">Drip Irrigation Design</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img alt="Tutor" className="w-6 h-6 rounded-full" data-alt="A portrait of an experienced field engineer with a rugged but professional demeanor. He is standing in an open field with irrigation systems visible in the background under a clear, warm sunset light. The image captures a sense of practical wisdom and field-tested expertise in agriculture." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpaDCngf_XkokyzGCaGI98h9zz-W5qG4Emlf3w5-oGFN4oQWp_TMKcS6Dh-6TtpTisG11DvwQtK5X-QLY6OwqHsbV_VBNREpQ8mI6WodQVqh1psa3_VOjKCSFjNbuSRhQj_lB9TOb-sXw0K4NUkEfP4hwA3qjWEJ1zxJxUrLXsgjlT72QpzXNZL-gMa6t9zBKP7Fjp3R9RmNychheqCLCuuF49W4dazD0nO8aJUabu-5jMsM8K3nxwaRonXExn4tqrik37sE-v1Fk" />
                      <span className="text-body-sm text-on-surface-variant">Marcus Aurelio</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-numeric text-slate-600">Aug 28, 2023</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold bg-red-100 text-red-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-2"></span>
                      Expired
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-all">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-label-sm text-slate-500">Showing 1 to 4 of 48 entries</span>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-slate-400 hover:border-primary hover:text-primary transition-all disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-white text-label-sm font-bold">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-slate-600 hover:border-primary hover:text-primary text-label-sm">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-slate-600 hover:border-primary hover:text-primary text-label-sm">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-slate-400 hover:border-primary hover:text-primary transition-all">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <span className="material-symbols-outlined text-[24px]">dashboard</span>
          <span className="text-[10px] font-bold">Home</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-primary">
          <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>shopping_cart</span>
          <span className="text-[10px] font-bold">Orders</span>
        </div>
        <div className="relative -top-8">
          <button className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center border-4 border-white">
            <span className="material-symbols-outlined text-[28px]">add</span>
          </button>
        </div>
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <span className="material-symbols-outlined text-[24px]">inventory_2</span>
          <span className="text-[10px] font-bold">Stock</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <span className="material-symbols-outlined text-[24px]">account_circle</span>
          <span className="text-[10px] font-bold">Profile</span>
        </div>
      </nav>
    </div>
  );
}
