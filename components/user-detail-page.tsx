"use client"

import React from 'react';

export default function UserDetailPage() {
  return (
    <div className="font-body-md text-on-surface antialiased" style={{backgroundColor: '#f9f9ff', minHeight: 'max(884px, 100dvh)'}}>
      {/* NavigationDrawer */}
      <aside className="fixed left-0 top-0 h-full w-[280px] border-r border-gray-200 bg-white flex flex-col py-6 px-4 gap-2 z-50">
        <div className="mb-8 px-4">
          <div className="flex items-center gap-3">
            <img alt="KizFarm Logo" className="h-10 w-auto" src="/logo.jpeg" />
            <span className="text-xl font-black tracking-tight text-emerald-900">KizFarm</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <a className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span className="font-label-md text-label-md">Dashboard</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-emerald-700 font-semibold bg-emerald-50/50 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="group">group</span>
            <span className="font-label-md text-label-md">Users</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="agriculture">agriculture</span>
            <span className="font-label-md text-label-md">Farmers</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
            <span className="font-label-md text-label-md">Products</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="shopping_cart">shopping_cart</span>
            <span className="font-label-md text-label-md">Orders</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="local_shipping">local_shipping</span>
            <span className="font-label-md text-label-md">Drivers</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="payments">payments</span>
            <span className="font-label-md text-label-md">Payments</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="assessment">assessment</span>
            <span className="font-label-md text-label-md">Reports</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
            <span className="font-label-md text-label-md">Notifications</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined" data-icon="settings">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </a>
        </nav>
      </aside>

      {/* TopAppBar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm flex justify-between items-center h-16 px-8 ml-[280px] max-w-[calc(100%-280px)]">
        <div className="flex items-center gap-4">
          <button className="hover:bg-gray-100 rounded-full p-2 transition-all duration-200">
            <span className="material-symbols-outlined" data-icon="menu">menu</span>
          </button>
          <h1 className="text-lg font-bold text-emerald-900 font-h2">KizFarm Profile</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input className="bg-gray-50 border border-outline-variant rounded-lg px-4 py-1.5 text-body-sm focus:ring-primary focus:border-primary w-64" placeholder="Search user data..." type="text" />
          </div>
          <button className="hover:bg-gray-100 rounded-full p-2 transition-all duration-200">
            <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
          </button>
          <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-200">
            <img className="h-full w-full object-cover" data-alt="professional headshot of an administrative manager in a clean studio setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXw7Uywc9Wz43Jj9C3HvCZc87lPYfjmu9NQaz95TPN9y0ArPuDQGWR3RLt9JR-2MBoGiojnCXIFMEKfJsAq3LkeKJJlYQzvufRnmWFEyqZVtnuCEF5c1eS8OsehIaDGPHzyp4z7cmdzbEeMbbG77m0j-HLHLzL62GWBTj528YJJCDyRwl_jquZJpJeqcFMI4-DrotgqPFlVMUf068nuI4WLlW-tfW3oJ1AsxPpsHKUQ7CkqU419jEIS_alERJYval9TPqHSaGD9XI" />
          </div>
        </div>
      </header>

      <main className="ml-[280px] p-8 max-w-[1440px] mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex mb-6 text-label-sm font-label-sm text-gray-500 gap-2 items-center">
          <a className="hover:text-primary" href="#">Dashboard</a>
          <span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
          <a className="hover:text-primary" href="#">Users</a>
          <span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
          <span className="text-on-surface">User Details</span>
        </nav>

        <div className="grid grid-cols-12 gap-gutter">
          {/* Left Column: Profile Card */}
          <div className="col-span-12 lg:col-span-4 space-y-gutter">
            <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="h-32 bg-primary-container relative">
                <div className="absolute -bottom-12 left-6">
                  <img className="h-24 w-24 rounded-xl border-4 border-white object-cover shadow-md" data-alt="Close-up portrait of a friendly man with a warm smile, wearing a casual shirt against a natural background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiMtRVM_uDh9yJyI-oUaQ1ovczJHaP_iwQaP4ukMZE6KvookefvQPXZp42oo2F2gh7rsE5NFuHW6dxFpDEq5Fbx36RuQs9Okl_4WeDP-5DJJXzerZVVoSsZlMh2rz744LaYY5Ua17jQetOOZ07cBhL6psam-blBtFlDizBzR6qKKKWIDlu8gKaZk_gUSoGKFPiWRsUYgfv-4WYFlYRY4vYB3wintGLUrzGWjLSP7-QWambN_uKuQvQK8b9D3zfOSaJ0RQUFwQ9Eqg" />
                </div>
              </div>
              <div className="pt-16 pb-6 px-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-h2 text-h2 text-on-surface">Jonathan Miller</h2>
                    <p className="font-body-sm text-body-sm text-gray-500">Premium Farmer Member</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-label-sm font-label-sm px-2.5 py-0.5 rounded-full">Active</span>
                </div>
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-3 text-body-sm">
                    <span className="material-symbols-outlined text-gray-400" data-icon="mail">mail</span>
                    <span className="text-on-surface">j.miller@kizfarm.co</span>
                  </div>
                  <div className="flex items-center gap-3 text-body-sm">
                    <span className="material-symbols-outlined text-gray-400" data-icon="call">call</span>
                    <span className="text-on-surface">+1 (555) 012-3456</span>
                  </div>
                  <div className="flex items-center gap-3 text-body-sm">
                    <span className="material-symbols-outlined text-gray-400" data-icon="location_on">location_on</span>
                    <span className="text-on-surface">Green Valley, CA</span>
                  </div>
                  <div className="flex items-center gap-3 text-body-sm">
                    <span className="material-symbols-outlined text-gray-400" data-icon="calendar_today">calendar_today</span>
                    <span className="text-on-surface">Member since: Oct 12, 2022</span>
                  </div>
                </div>
                <div className="mt-8 flex flex-col gap-2">
                  <button className="w-full bg-primary-container text-white py-2.5 rounded-lg font-label-md flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                    <span className="material-symbols-outlined" data-icon="send">send</span>
                    Send Message
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="border border-red-200 text-red-600 bg-red-50 py-2.5 rounded-lg font-label-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                      <span className="material-symbols-outlined text-[18px]" data-icon="block">block</span>
                      Suspend
                    </button>
                    <button className="border border-gray-200 text-gray-600 bg-white py-2.5 rounded-lg font-label-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                      <span className="material-symbols-outlined text-[18px]" data-icon="history">history</span>
                      Reactivate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <h3 className="font-h3 text-h3 mb-4 text-on-surface">Transaction Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-label-sm text-gray-500 mb-1">Total Spent</p>
                  <p className="text-h3 font-h3 text-emerald-800">$12,450.00</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-label-sm text-gray-500 mb-1">Total Orders</p>
                  <p className="text-h3 font-h3 text-emerald-800">48</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tables and Activity */}
          <div className="col-span-12 lg:col-span-8 space-y-gutter">
            {/* Order History */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-h3 text-h3 text-on-surface">Order History</h3>
                <button className="text-emerald-700 text-label-sm hover:underline font-semibold">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-label-sm text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 font-bold">Order ID</th>
                      <th className="px-6 py-3 font-bold">Date</th>
                      <th className="px-6 py-3 font-bold">Amount</th>
                      <th className="px-6 py-3 font-bold">Status</th>
                      <th className="px-6 py-3 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-numeric text-body-sm text-emerald-800">#ORD-90210</td>
                      <td className="px-6 py-4 text-body-sm">Jan 24, 2024</td>
                      <td className="px-6 py-4 text-body-sm font-semibold">$1,240.50</td>
                      <td className="px-6 py-4">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-emerald-600"><span className="material-symbols-outlined" data-icon="visibility">visibility</span></button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-numeric text-body-sm text-emerald-800">#ORD-89421</td>
                      <td className="px-6 py-4 text-body-sm">Jan 18, 2024</td>
                      <td className="px-6 py-4 text-body-sm font-semibold">$890.00</td>
                      <td className="px-6 py-4">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-emerald-600"><span className="material-symbols-outlined" data-icon="visibility">visibility</span></button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-numeric text-body-sm text-emerald-800">#ORD-87312</td>
                      <td className="px-6 py-4 text-body-sm">Dec 28, 2023</td>
                      <td className="px-6 py-4 text-body-sm font-semibold">$2,450.10</td>
                      <td className="px-6 py-4">
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-emerald-600"><span className="material-symbols-outlined" data-icon="visibility">visibility</span></button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-numeric text-body-sm text-emerald-800">#ORD-86500</td>
                      <td className="px-6 py-4 text-body-sm">Dec 15, 2023</td>
                      <td className="px-6 py-4 text-body-sm font-semibold">$540.25</td>
                      <td className="px-6 py-4">
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Cancelled</span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-emerald-600"><span className="material-symbols-outlined" data-icon="visibility">visibility</span></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity Logs */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-h3 text-h3 text-on-surface">Activity Logs</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                      <span className="material-symbols-outlined text-[18px]" data-icon="shopping_bag">shopping_bag</span>
                    </div>
                    <div className="w-0.5 h-full bg-gray-100 mt-1"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start">
                      <p className="text-body-md font-semibold text-on-surface">Order #ORD-90210 placed</p>
                      <span className="text-label-sm text-gray-400">2 hours ago</span>
                    </div>
                    <p className="text-body-sm text-gray-500 mt-1">User purchased Organic Soil (50kg) and Seed Starter Kits. Payment confirmed via Credit Card.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800">
                      <span className="material-symbols-outlined text-[18px]" data-icon="login">login</span>
                    </div>
                    <div className="w-0.5 h-full bg-gray-100 mt-1"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start">
                      <p className="text-body-md font-semibold text-on-surface">Login Success</p>
                      <span className="text-label-sm text-gray-400">Jan 24, 2024 09:12 AM</span>
                    </div>
                    <p className="text-body-sm text-gray-500 mt-1">IP: 192.168.1.45 | Browser: Chrome on macOS</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-800">
                      <span className="material-symbols-outlined text-[18px]" data-icon="rate_review">rate_review</span>
                    </div>
                    <div className="w-0.5 h-full bg-gray-100 mt-1"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start">
                      <p className="text-body-md font-semibold text-on-surface">Product Review Submitted</p>
                      <span className="text-label-sm text-gray-400">Jan 22, 2024</span>
                    </div>
                    <p className="text-body-sm text-gray-500 mt-1">User rated &quot;Natural Fertilizer B&quot; with 5 stars: &quot;Great results for my tomatoes!&quot;</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-800">
                      <span className="material-symbols-outlined text-[18px]" data-icon="settings">settings</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-body-md font-semibold text-on-surface">Profile Updated</p>
                      <span className="text-label-sm text-gray-400">Jan 15, 2024</span>
                    </div>
                    <p className="text-body-sm text-gray-500 mt-1">Updated phone number and primary shipping address.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
