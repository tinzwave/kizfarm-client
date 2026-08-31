"use client"

import React from 'react';

export default function AgriCatalogPage() {
  return (
    <>
      {/* TopAppBar */}
      <header className="flex justify-between items-center w-full h-14 px-4 sticky top-0 z-50 bg-white dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-green-800 dark:text-green-400 active:scale-95 transition-transform duration-150 cursor-pointer" data-icon="menu">menu</span>
          <div className="flex items-center gap-2">
            <img alt="KIZ FARM" className="h-8 w-auto object-contain" src="/logo.jpeg" />
            <span className="text-lg font-extrabold tracking-tighter text-green-900 dark:text-white uppercase font-headline-md">AgriCatalog</span>
          </div>
        </div>
        <span className="material-symbols-outlined text-green-800 dark:text-green-400 active:scale-95 transition-transform duration-150 cursor-pointer" data-icon="search">search</span>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 pt-6 pb-24">
        {/* Search Bar Section */}
        <div className="mb-gutter">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-4 text-outline" data-icon="search">search</span>
            <input className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-surface-tint focus:border-surface-tint outline-none transition-all font-body-md text-on-surface" placeholder="Search fresh produce..." type="text" />
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-gutter overflow-x-auto no-scrollbar flex gap-sm pb-2">
          <button className="px-6 py-2 rounded-full bg-primary text-on-primary font-label-sm whitespace-nowrap active:scale-95 transition-all" style={{ backgroundColor: "#1B6D24" }}>All</button>
          <button className="px-6 py-2 rounded-full bg-surface-container text-on-surface-variant font-label-sm whitespace-nowrap hover:bg-surface-variant active:scale-95 transition-all">Vegetables</button>
          <button className="px-6 py-2 rounded-full bg-surface-container text-on-surface-variant font-label-sm whitespace-nowrap hover:bg-surface-variant active:scale-95 transition-all">Fruits</button>
          <button className="px-6 py-2 rounded-full bg-surface-container text-on-surface-variant font-label-sm whitespace-nowrap hover:bg-surface-variant active:scale-95 transition-all">Grains</button>
          <button className="px-6 py-2 rounded-full bg-surface-container text-on-surface-variant font-label-sm whitespace-nowrap hover:bg-surface-variant active:scale-95 transition-all">Organic</button>
        </div>

        {/* Hero Section - Promo */}
        <div className="mb-gutter rounded-3xl overflow-hidden relative h-48 bg-primary-container group">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" data-alt="panoramic high-resolution shot of a lush green farm field with rolling hills at sunrise, warm golden light filtering through morning mist" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDAli1kYWSnpG83UMrNnZniqwYdWt7PlW3cKWqPeN7jBwGul0Qs0eWwNs73Dou0IrFtRM_7nmFdEqskBMUtLQ-rmUE9DTvNnNxKxMGSFnUKdCUG8Sbjn1uakwHoqRozT41QPHJ9A5592hQuDvZQUNwG_QAu0XzgRysYkpoCRD0Gbp9sffUHFtd4V7q1wHYWVvvCI8MC_l5S2FbpT7s0-v-J3cGgOaCcOXFAZZFAM_HastjvfYUtqSFq0dHQBVK3xWPH_32RsWhhF_I')" }} ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-8">
            <span className="text-on-primary-container bg-primary-fixed/20 backdrop-blur-sm self-start px-3 py-1 rounded-full text-label-xs mb-2">Harvest Season</span>
            <h2 className="text-white font-headline-lg mb-2">Fresh from the Soil</h2>
            <p className="text-white/80 font-body-md max-w-xs">Directly sourced premium organic crops delivered to your doorstep.</p>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-gutter md:grid-cols-4">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-[0_10px_30px_rgba(27,109,36,0.05)] transition-all flex flex-col">
            <div className="relative aspect-square overflow-hidden">
              <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="close-up of vibrant red organic vine tomatoes with dew drops, natural greenhouse lighting, professional food photography" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCq2HoapuHa4T55a5-Mnwh7QH7RgDthHQrR3eJeFh5jmvniNl3i5hYjrqM4nc5vqXkfSwUK3ubz9yHGvdmL6-PfGV7LqTCafK4c2ptSfpdFaVleOo3CuR0PciS7_3k-l4NAsQBjuBavZMTQI_NOtRsNtuaXi-Nog4tUp2uJMKhx7EbvRfHp9zZ6_rLMiiBOhdbdiQlSwzMAKVZiHdm0a39PNoPqgqze2tFmlWDgCrqQfT2CJhqLZ_b-DymIYeNlQbm_7I-2Yp8DaDU" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-tertiary-container" data-icon="star" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="text-label-xs text-on-surface">4.8</span>
              </div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-headline-md text-[16px] mb-1 text-on-surface">Organic Tomatoes</h3>
              <p className="text-on-secondary-container font-label-xs mb-3">500g Pack</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-primary font-bold text-lg">₦4,500</span>
                <button className="bg-surface-tint text-white p-2 rounded-xl active:scale-90 transition-transform duration-100 flex items-center justify-center" style={{ backgroundColor: "#1B6D24" }}>
                  <span className="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-[0_10px_30px_rgba(27,109,36,0.05)] transition-all flex flex-col">
            <div className="relative aspect-square overflow-hidden">
              <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="fresh curly kale leaves in a rustic wooden crate, natural outdoor lighting, documentary style agricultural photography" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1dHTcxVKiE8xhmeIltbvb931r6G1MHN5iAGh56kL3UA8VoqR7Pc4g9U6x580O_G9UjIgQbrVvkfoNIU5al3iIc43J8jgxwlYucg0ejXcLPJjTW7QoomSaEog0SSz6LhiOhIlrdONngrFfVU4T2O15ohYPVtwDzR7DYOg1xg8XDcxcLqiSLRo3m48aNRR55qbeYcIxmex2YDKGaqXhF2tA3byB5EUyWVee7hPhakvSYpdSZlYFe9C7d3ZP0xtkOENry-vrLI4h6bo" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-tertiary-container" data-icon="star" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="text-label-xs text-on-surface">4.9</span>
              </div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-headline-md text-[16px] mb-1 text-on-surface">Fresh Kale</h3>
              <p className="text-on-secondary-container font-label-xs mb-3">Large Bunch</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-primary font-bold text-lg">₦3,200</span>
                <button className="bg-surface-tint text-white p-2 rounded-xl active:scale-90 transition-transform duration-100 flex items-center justify-center" style={{ backgroundColor: "#1B6D24" }}>
                  <span className="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-[0_10px_30px_rgba(27,109,36,0.05)] transition-all flex flex-col">
            <div className="relative aspect-square overflow-hidden">
              <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="bundle of earthy carrots with green tops still attached on a burlap sack, cinematic low-angle lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxNIDW92th9kvzxQ8yL4lud1rEwJq1WM7oiK7BPrD68SFghw93TGJw9spvZWyHcvoOaLKExac8rs0dIYiXMpOvArqeUPENQkgREfHaggsqfhnRuOrI_5EMq__w9FIsTx9gTsA_vPi0J_7Sd4wzTUTCwc3RLda3mHnflaEd_ZZu-YYNdmFZk2xmCHH1S5X9o0kVM0TZWM02MXj8H1T6-JOyTbkkWw0l7bd3MPY97pTKs7yF4NxNmwjeGBBKjAIWgMvSiEw_COvXBj8" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-tertiary-container" data-icon="star" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="text-label-xs text-on-surface">4.7</span>
              </div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-headline-md text-[16px] mb-1 text-on-surface">Heirloom Carrots</h3>
              <p className="text-on-secondary-container font-label-xs mb-3">1kg Bag</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-primary font-bold text-lg">₦2,900</span>
                <button className="bg-surface-tint text-white p-2 rounded-xl active:scale-90 transition-transform duration-100 flex items-center justify-center" style={{ backgroundColor: "#1B6D24" }}>
                  <span className="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-[0_10px_30px_rgba(27,109,36,0.05)] transition-all flex flex-col">
            <div className="relative aspect-square overflow-hidden">
              <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="assorted bell peppers in yellow, red, and green colors arranged neatly on a dark farm table, soft daylight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3kedeudZawkVMD4H5tlmWU9LMoE2VZEQQzxzwxl_7bk1jPOFBlFM3BRtl4unC6Zx8RRbAOUDA4b2kk7S2DVAMyUUAImeIsV6S69NR4I6EmkwNUXyPwhGbgS7mOAuq_Yf-4KAb2PkVqoFgLdOs-ATH-QuKHcSKvB1IwtYz0qdg3TQz0NkD1BarZpkAg_DMZm8ZtzdYSmoijei1TQrlQ3M1JjgrIknEVQg9s4qVv9HTOWm0LIjjRmYjgZ8r8wJVzJOGiUpOdNK-i1Y" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-tertiary-container" data-icon="star" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="text-label-xs text-on-surface">4.9</span>
              </div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-headline-md text-[16px] mb-1 text-on-surface">Bell Peppers</h3>
              <p className="text-on-secondary-container font-label-xs mb-3">Mixed Pack (3pcs)</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-primary font-bold text-lg">₦5,100</span>
                <button className="bg-surface-tint text-white p-2 rounded-xl active:scale-90 transition-transform duration-100 flex items-center justify-center" style={{ backgroundColor: "#1B6D24" }}>
                  <span className="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Banner - Bento Style */}
        <div className="mt-gutter grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div className="bg-tertiary-container rounded-3xl p-gutter flex items-center gap-gutter border border-tertiary/10">
            <div className="flex-1">
              <h4 className="text-on-tertiary font-headline-md mb-2">Sustainable Grains</h4>
              <p className="text-on-tertiary/80 text-sm mb-4">Discover our new collection of locally farmed wheat and barley.</p>
              <button className="text-tertiary-fixed bg-on-tertiary-fixed px-4 py-2 rounded-xl text-label-sm">Explore Collection</button>
            </div>
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg rotate-3">
              <img className="w-full h-full object-cover" data-alt="close-up of golden wheat stalks blowing in the wind against a clear blue sky" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2AgkuIKT56bK-lk5E7AuwRI5zkvZrjDijgJc8a3B8WxlYJrd5KeLgdfiWSGsv6pCql3WmhmdNML8oU9DYShgcvSRRPVXhpVQYaoezKx6veJxWOTlMF6XzZ_yEPpYImgG-YlOu9u7Ymp8uDDAg9QP7pttzYtDBq7NEKhN7gWYkKOtLNHZWhjTYqttoXC1QNL8nM4ARFbqr8UnxG8gDkOHUGfI9yFixul55ChSJTtnbXYSp6um30INNcDIcPeh-WENE5LdbkQv6Bms" />
            </div>
          </div>

          <div className="bg-secondary-container rounded-3xl p-gutter flex items-center gap-gutter border border-outline-variant">
            <div className="flex-1">
              <h4 className="text-on-secondary-container font-headline-md mb-2">Soil-to-Door</h4>
              <p className="text-on-secondary-container/80 text-sm mb-4">Track your order from the moment it&apos;s harvested until delivery.</p>
              <button className="text-on-secondary-fixed bg-secondary-fixed-dim px-4 py-2 rounded-xl text-label-sm">Track Now</button>
            </div>
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg -rotate-3">
              <img className="w-full h-full object-cover" data-alt="farmers hands holding rich dark soil with a small sprout growing, symbolizing growth and fertility" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYZQnXzTX-kY32I_9nmnLXwW1F6zBASOlSHqs-G1OQdEczaK-4pYLtocy-qRaKGzHkx00J3DJ3HRDTBztX4EqxIo08sG8r5NvkjQmjN2RzmfMElMHHVIRUfGw8PDcP85PY4OaD08ds-91VV5zbokyU8tYhAgrCDy_mFpK2LJa9IHjch6O55ARR0y_NVWkcZTIuRm9mTZZfdI-0Pc9HhO8Ds0XOOh1-aD8boe6MflHq2V8WYmuPVZajmOLTWueZDZUa4DI60NMDmac" />
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 right-0 w-full flex justify-around items-center h-16 px-2 pb-safe z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800">
        <a className="flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-xl px-3 py-1.5 transition-transform duration-100 active:scale-90" href="#">
          <span className="material-symbols-outlined" data-icon="storefront" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
          <span className="font-['Inter'] text-[10px] font-medium">Market</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 px-3 py-1.5 hover:text-green-700 dark:hover:text-green-400 transition-transform duration-100 active:scale-90" href="#">
          <span className="material-symbols-outlined" data-icon="shopping_bag">shopping_bag</span>
          <span className="font-['Inter'] text-[10px] font-medium">Orders</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 px-3 py-1.5 hover:text-green-700 dark:hover:text-green-400 transition-transform duration-100 active:scale-90" href="#">
          <span className="material-symbols-outlined" data-icon="potted_plant">potted_plant</span>
          <span className="font-['Inter'] text-[10px] font-medium">My Crops</span>
        </a>
        <a className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 px-3 py-1.5 hover:text-green-700 dark:hover:text-green-400 transition-transform duration-100 active:scale-90" href="#">
          <span className="material-symbols-outlined" data-icon="account_circle">account_circle</span>
          <span className="font-['Inter'] text-[10px] font-medium">Profile</span>
        </a>
      </nav>

      {/* FAB */}
      <div className="fixed bottom-20 right-6 z-40">
        <button className="w-14 h-14 rounded-2xl bg-surface-tint text-white shadow-xl flex items-center justify-center active:scale-90 transition-all" style={{ backgroundColor: "#1B6D24" }}>
          <span className="material-symbols-outlined text-3xl" data-icon="shopping_cart">shopping_cart</span>
          <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">3</span>
        </button>
      </div>
    </>
  );
}
