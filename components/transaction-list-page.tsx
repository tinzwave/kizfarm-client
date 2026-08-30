"use client"

import React from 'react';

export default function TransactionListPage() {
  return (
    <div className="bg-surface text-on-surface" style={{fontFamily: "'Inter', sans-serif"}}>
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-screen w-[280px] z-50 bg-white border-r border-gray-100 shadow-[1px_0_3px_0_rgba(0,0,0,0.05)] flex flex-col py-6 px-4">
        <div className="mb-10 px-2 flex items-center gap-3">
          <img alt="KizFarm Logo" className="w-10 h-10 object-contain rounded-lg" src="/logo.jpeg" />
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#1B6D24]">KizFarm</h1>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-widest">Admin Console</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 text-gray-500 hover:bg-gray-50 hover:text-[#1B6D24]" href="#">
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span className="font-label-md text-label-md">Dashboard</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 bg-green-50 text-[#1B6D24] border-r-4 border-[#1B6D24]" href="#">
            <span className="material-symbols-outlined" data-icon="payments">payments</span>
            <span className="font-label-md text-label-md">Financials</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 text-gray-500 hover:bg-gray-50 hover:text-[#1B6D24]" href="#">
            <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
            <span className="font-label-md text-label-md">Inventory</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 text-gray-500 hover:bg-gray-50 hover:text-[#1B6D24]" href="#">
            <span className="material-symbols-outlined" data-icon="agriculture">agriculture</span>
            <span className="font-label-md text-label-md">Livestock</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 text-gray-500 hover:bg-gray-50 hover:text-[#1B6D24]" href="#">
            <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
            <span className="font-label-md text-label-md">Reports</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 text-gray-500 hover:bg-gray-50 hover:text-[#1B6D24]" href="#">
            <span className="material-symbols-outlined" data-icon="settings">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </a>
        </nav>
        <div className="mt-auto pt-6 border-t border-gray-100 space-y-1">
          <button className="w-full mb-4 bg-primary text-white py-2.5 rounded-lg font-label-md text-label-md shadow-sm active:scale-[0.98] transition-transform">
            New Transaction
          </button>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50" href="#">
            <span className="material-symbols-outlined" data-icon="help">help</span>
            <span className="font-label-md text-label-md">Support</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50" href="#">
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
            <span className="font-label-md text-label-md">Logout</span>
          </a>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="ml-[280px] min-h-screen flex flex-col">
        {/* Top Navigation */}
        <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm flex justify-between items-center h-16 px-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
              </span>
              <input className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 w-64" placeholder="Search transactions..." type="text" />
            </div>
            <nav className="hidden md:flex gap-6 items-center">
              <a className="text-[#1B6D24] font-bold border-b-2 border-[#1B6D24] pb-4 mt-4 font-body-sm text-body-sm" href="#">Overview</a>
              <a className="text-gray-500 hover:text-gray-900 font-body-sm text-body-sm" href="#">History</a>
              <a className="text-gray-500 hover:text-gray-900 font-body-sm text-body-sm" href="#">Analytics</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <span className="material-symbols-outlined" data-icon="chat_bubble">chat_bubble</span>
            </button>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium text-on-surface">Admin Profile</span>
              <img className="w-8 h-8 rounded-full border border-gray-200" data-alt="Portrait of a professional farm administrator in a clean office setting, soft natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBELaLFOIX4Gl881ukXOEf5YsAlPUBpoZBVv3XSEFPFzLtDG9D097F1EjwftUwNmrmuTEXkWuxkjHeTTQc1MD72NuYw1gMvs8uXF0ZSwJ1_D6VVgc-S-h4jggsZSK2hEtL8KxRw2WSLjc42H-sAoz1vi8I8W0iuuNECzOBdP5eJQV-c6NEfIJQNO9uI9fI7utmUtTnE5TRLVChBdDX2ao4w4CI0totmK6_SHw7aAF2K3DCFVJ5tUek4vxP8kJqKA9agPfp9tKC5Dvo" />
            </div>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="p-margin flex-1">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <nav className="flex items-center gap-2 text-on-surface-variant mb-2">
                <span className="font-label-sm text-label-sm">Financials</span>
                <span className="material-symbols-outlined text-xs" data-icon="chevron_right">chevron_right</span>
                <span className="font-label-sm text-label-sm text-primary font-bold">Transactions</span>
              </nav>
              <h2 className="font-h1 text-h1 text-on-surface">Admin Transactions</h2>
              <p className="text-on-surface-variant font-body-sm text-body-sm mt-1">Manage and monitor all financial activities across KizFarm ecosystem.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant bg-white text-on-surface rounded-lg font-label-md text-label-md hover:bg-gray-50 transition-all">
                <span className="material-symbols-outlined" data-icon="file_download">file_download</span>
                Export CSV
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-label-md text-label-md shadow-sm hover:opacity-90 active:scale-[0.98] transition-all">
                <span className="material-symbols-outlined" data-icon="add">add</span>
                Create Transaction
              </button>
            </div>
          </div>

          {/* Dashboard Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-8">
            <div className="bg-white p-lg rounded-xl border border-[#EAECF0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-green-50 text-primary rounded-lg">
                  <span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
                </div>
                <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px] mr-1" data-icon="trending_up">trending_up</span>
                  12.5%
                </span>
              </div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Total Revenue</p>
              <h3 className="text-h2 font-h2 mt-1">$428,500.00</h3>
            </div>
            <div className="bg-white p-lg rounded-xl border border-[#EAECF0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <span className="material-symbols-outlined" data-icon="receipt_long">receipt_long</span>
                </div>
                <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px] mr-1" data-icon="trending_up">trending_up</span>
                  8.2%
                </span>
              </div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Active Invoices</p>
              <h3 className="text-h2 font-h2 mt-1">1,284</h3>
            </div>
            <div className="bg-white p-lg rounded-xl border border-[#EAECF0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                  <span className="material-symbols-outlined" data-icon="pending_actions">pending_actions</span>
                </div>
                <span className="flex items-center text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px] mr-1" data-icon="trending_down">trending_down</span>
                  3.1%
                </span>
              </div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Pending Payments</p>
              <h3 className="text-h2 font-h2 mt-1">$24,105.00</h3>
            </div>
            <div className="bg-white p-lg rounded-xl border border-[#EAECF0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <span className="material-symbols-outlined" data-icon="group">group</span>
                </div>
                <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px] mr-1" data-icon="trending_up">trending_up</span>
                  24%
                </span>
              </div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Transacting Users</p>
              <h3 className="text-h2 font-h2 mt-1">852</h3>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border border-[#EAECF0] rounded-xl p-md mb-gutter flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-48">
                <select className="w-full pl-3 pr-10 py-2 border border-outline-variant rounded-lg text-sm bg-white appearance-none focus:ring-2 focus:ring-primary/20">
                  <option>All Types</option>
                  <option>Livestock Sale</option>
                  <option>Supply Purchase</option>
                  <option>Service Fee</option>
                </select>
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <span className="material-symbols-outlined text-[18px]" data-icon="expand_more">expand_more</span>
                </span>
              </div>
              <div className="relative w-full md:w-48">
                <select className="w-full pl-3 pr-10 py-2 border border-outline-variant rounded-lg text-sm bg-white appearance-none focus:ring-2 focus:ring-primary/20">
                  <option>Last 30 Days</option>
                  <option>This Quarter</option>
                  <option>This Year</option>
                  <option>Custom Range</option>
                </select>
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <span className="material-symbols-outlined text-[18px]" data-icon="calendar_today">calendar_today</span>
                </span>
              </div>
              <button className="flex items-center gap-2 text-sm font-semibold text-[#1B6D24] hover:underline px-2">
                Clear all filters
              </button>
            </div>
            <div className="text-on-surface-variant text-sm font-medium">
              Showing <span className="text-on-surface">1,284</span> results
            </div>
          </div>

          {/* Transaction Table Card */}
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAECF0]">
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        Transaction ID
                        <span className="material-symbols-outlined text-xs" data-icon="arrow_downward">arrow_downward</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {/* Row 1 */}
                  <tr className="hover:bg-[#F9FAFB] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-numeric text-numeric font-medium text-primary">#TRX-82910</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img className="w-8 h-8 rounded-full" data-alt="Portrait of a male farmer with a friendly expression, outdoor natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDWeSnA4QoTD234h75GP9uAc3ZcUsqElFk3_IQZokY4QIb3uJ1zl-N5JZHji1uinenQUEZPvg33LyWdpOWTRT_gc0pWWdoykgHtgKmMQPSb83nxVZJtpgOWL9chlErxDNWLKUjjL-guQoXVX9Ldu-bnx8sXBJXP33xagm3JxxWakoGgQmg-ApjLE0D3OblPeqwC9rcMNmbnxKuToyrh3Mhtdut9D2hkwyOP6Yf4Kcl48f2EITMwsAfu_TYdW94waTEShsULMxlFcY" />
                        <div>
                          <div className="text-sm font-semibold text-on-surface">Marcus Thorne</div>
                          <div className="text-xs text-on-surface-variant">m.thorne@agri.com</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">Livestock Sale</td>
                    <td className="px-6 py-4 text-sm font-bold text-on-surface">$12,450.00</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Paid</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 24, 2023</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined" data-icon="more_vert">more_vert</span>
                      </button>
                    </td>
                  </tr>
                  {/* Row 2 */}
                  <tr className="hover:bg-[#F9FAFB] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-numeric text-numeric font-medium text-primary">#TRX-82911</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img className="w-8 h-8 rounded-full" data-alt="Close up portrait of a female agriculturist, thoughtful gaze, soft afternoon light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJrqc_U_uZaPNrkQM8WyFaUEQayhcQklVqYhfDM19q1x_wHXjpHv2RIo2UxhL839YteBQlJYCxWxo0QOPCPzjWgLSBANwjsBC6jsYoQK13ZEb_ABOmZVCAs66oyGJ4lLnk21BBTN9XDW2qcZJ-N45aheW8x_NGfa5Dnw_yQbn26VNOpXyp0b1Ym-zlljQDoK_InP4i8jH-8EeJ8ZG5G3Ix6vqmjKKZZdaNaI7VUsjugCkysSEQ9wobQCVYdx0-eMkx8PoLqpG9wFM" />
                        <div>
                          <div className="text-sm font-semibold text-on-surface">Sarah Jenkins</div>
                          <div className="text-xs text-on-surface-variant">s.jenkins@farm.net</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">Supply Purchase</td>
                    <td className="px-6 py-4 text-sm font-bold text-on-surface">$3,120.50</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Pending</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 23, 2023</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined" data-icon="more_vert">more_vert</span>
                      </button>
                    </td>
                  </tr>
                  {/* Row 3 */}
                  <tr className="hover:bg-[#F9FAFB] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-numeric text-numeric font-medium text-primary">#TRX-82912</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img className="w-8 h-8 rounded-full" data-alt="Profile of an older male farmer with weathered features, gentle smile, sunlit background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH1EUW8FlcQKMgK7h1D3H_kSagt-6DWVznpLVjqwDumJUryYap2fqY2HDjLB0TZm5bnb4U5W7T4OuUZzq1iayYDKLIt_Bz8HfANgD8AgxfgHstDqcrC2BbYEbymd9QTlXGWY3gnGDWGd-OSEk_3ftBBDePUIJPfrp_Uk7U0Be5jZf1Rzl8rLN9qDfZdDca_GSxQgRTNjX4ZCtTiglXStaXjNxuopaySt4oncb066NJyFiwt6Dusy3_DQneJdugBktoFYMm9naP-DQ" />
                        <div>
                          <div className="text-sm font-semibold text-on-surface">Robert Millon</div>
                          <div className="text-xs text-on-surface-variant">rob.m@millonfarms.org</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">Service Fee</td>
                    <td className="px-6 py-4 text-sm font-bold text-on-surface">$450.00</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Failed</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 23, 2023</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined" data-icon="more_vert">more_vert</span>
                      </button>
                    </td>
                  </tr>
                  {/* Row 4 */}
                  <tr className="hover:bg-[#F9FAFB] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-numeric text-numeric font-medium text-primary">#TRX-82913</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img className="w-8 h-8 rounded-full" data-alt="Portrait of a young female agribusiness professional in a bright greenhouse, vibrant green surroundings" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_tNMij4nEL3GfkgUrxQyHS6SphsJ4_iIbliBcpFRoZaaxr5PlGpoxKBEtUTsUytegbZfJYgH7NsSHdkxcYnCelnTZvb_SR-wqdYiahgch04tb2eDOT2nuVtijYtqgy-8s92WqDPUWQvRou1pnqGOMkpPacZm9noTKUn7WEPrXNDFL62BMra45swPXoZFDjtzquZhdsd6ArIjz8kOWLr1jGiaF2rLDp_nEXKIiUrS7bfz99oGFLTTf6k_EoqNn_KQp5IU7rzmyoMs" />
                        <div>
                          <div className="text-sm font-semibold text-on-surface">Elena Rodriguez</div>
                          <div className="text-xs text-on-surface-variant">elena.r@kiz-ops.com</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">Livestock Sale</td>
                    <td className="px-6 py-4 text-sm font-bold text-on-surface">$22,800.00</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Paid</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 22, 2023</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined" data-icon="more_vert">more_vert</span>
                      </button>
                    </td>
                  </tr>
                  {/* Row 5 */}
                  <tr className="hover:bg-[#F9FAFB] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-numeric text-numeric font-medium text-primary">#TRX-82914</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img className="w-8 h-8 rounded-full" data-alt="Portrait of a male technical specialist in a modern farm office, high-key lighting, professional vibe" src="https://lh3.googleusercontent.com/aida-public/AB6AXuADdMWH1exchDtCBpRBP5Qu6Hev0qABh3eO5_G66gPCGfd1oOuJ6WZmXl6UoBzaaqUDFkRDcouHOSRItncy46Yql1qJOrEp-zgIEt1p54hv-zEco7OkvAX7v7dH4h59GyEyJbMON8DnzYjpaEBRKbkUJKHiBvejA0JUGC6nJyg4jb-vyii-LTge30In3RlcFtCxbpCeHzK9BEWRVBPoLjdYJAZNCDLsRM5SC3o6ocFzllsG9uUgjO4qdJ-wDuGyNbZzcDU_ij2jjLw" />
                        <div>
                          <div className="text-sm font-semibold text-on-surface">Liam Watson</div>
                          <div className="text-xs text-on-surface-variant">l.watson@agrotech.io</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">Service Fee</td>
                    <td className="px-6 py-4 text-sm font-bold text-on-surface">$1,200.00</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Paid</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 22, 2023</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined" data-icon="more_vert">more_vert</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-[#EAECF0] bg-gray-50">
              <button className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-on-surface-variant hover:bg-white transition-all disabled:opacity-50">
                Previous
              </button>
              <div className="flex gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white text-sm font-medium">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-on-surface-variant text-sm font-medium">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-on-surface-variant text-sm font-medium">3</button>
                <span className="px-2 text-on-surface-variant">...</span>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-on-surface-variant text-sm font-medium">12</button>
              </div>
              <button className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-on-surface-variant hover:bg-white transition-all">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <footer className="mt-auto px-margin py-lg bg-white border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-xs text-on-surface-variant gap-4">
          <div className="flex items-center gap-6">
            <span>© 2023 KizFarm. All rights reserved.</span>
            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>System Status: Healthy</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
