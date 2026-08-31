"use client"

import React from 'react';

export default function SearchResultsPage() {
  return (
    <>
      {/* TopAppBar */}
      <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <img alt="KIZ FARM" className="h-10 w-auto object-contain" src="/logo.jpeg" />
          </div>
          {/* Desktop Search Bar Integrated into Header */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-label-sm" type="text" defaultValue="Tomatoes" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors active:scale-95 duration-150">
              <span className="material-symbols-outlined text-[#1B6D24]">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-secondary-container"></div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-lg">
        {/* Subheader & Filters */}
        <section className="mb-md">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Search Results</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">12 results found for <span className="font-semibold text-primary">&quot;Tomatoes&quot;</span></p>
            </div>
            <div className="flex gap-sm items-center overflow-x-auto pb-2 md:pb-0">
              <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-full font-label-sm whitespace-nowrap hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                Filters
              </button>
              <div className="h-6 w-[1px] bg-outline-variant"></div>
              <span className="px-4 py-1 bg-primary text-white rounded-full font-label-xs">Organic</span>
              <span className="px-4 py-1 bg-surface-container-highest text-on-surface-variant rounded-full font-label-xs">In Season</span>
              <span className="px-4 py-1 bg-surface-container-highest text-on-surface-variant rounded-full font-label-xs">Price: Low to High</span>
            </div>
          </div>
        </section>

        {/* Results Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
          {/* Result Card 1 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden organic-elevation group cursor-pointer transition-all">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="vibrant cluster of fresh organic roma tomatoes on the vine in a sunlit rustic wooden crate with soft natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzQxIsfAV3TkEFci95ThTJvPGXy85MSqRMvNscTaR2h9dasmQn-4vh-nOvPX4REyOMXoFiUesn8kWBEqgqMJENNpB46GiRIXGETJhXR1JTlWNWEgXSTSIc_iJ88jrrLKW68haSDfGJPz9c6YMald2Sv3kwOE1_rzwnLp4AQOMx1tpCiWr3t9JH2CfzHEledqVq3InNmMgsLaLKbH39LgFaJsh6Ohsptrf5mbLjwxBiABCku4cPYwMVo7EcA1Ei9bz6IFBAsOeiuPY" />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-primary font-label-xs rounded-full shadow-sm">Organic</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-headline-md text-[18px] text-on-surface">Organic Roma Tomatoes</h3>
                <span className="font-headline-md text-primary">$4.50</span>
              </div>
              <p className="font-label-xs text-on-surface-variant mb-4">Greenway Farms • 1kg</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#F6BE3B]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-xs text-on-surface">4.8</span>
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-sm active:scale-95 transition-transform">Add to Cart</button>
              </div>
            </div>
          </div>

          {/* Result Card 2 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden organic-elevation group cursor-pointer transition-all">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="macro close-up of shiny red cherry tomatoes in a minimalist white bowl with bright clean studio lighting and soft shadows" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCd9jsq8MKjjMwIQDecvYFsL_BRXC-5ctTbqSkKQU1zVTgUS0JmAdItHGPeE0GX_Uyp7KePbrOo6Kuoy-EhWR_heNSqHwIUnC820HaWyfzFQtERgrxyhxCstE_KH2hxPoF8-vPwSr_dZMESbdFZFQFtFcERbKJGiSrM3Dwh7LdEtmJIQMX8GdDeEb6zHXV-e0luwSQdoMsJLhUXoRSTCK48eUQLRCADMlRi33kX6nHl_rpZUqdsGU2jhXgiiu5yKlYBe1Xy00mL71M" />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-primary font-label-xs rounded-full shadow-sm">Bestseller</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-headline-md text-[18px] text-on-surface">Sweet Cherry Tomatoes</h3>
                <span className="font-headline-md text-primary">$3.25</span>
              </div>
              <p className="font-label-xs text-on-surface-variant mb-4">Sun-Kissed Acres • 500g</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#F6BE3B]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-xs text-on-surface">4.9</span>
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-sm active:scale-95 transition-transform">Add to Cart</button>
              </div>
            </div>
          </div>

          {/* Result Card 3 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden organic-elevation group cursor-pointer transition-all">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="assorted heirloom tomatoes in various colors like purple, yellow, and orange on a dark slate background with professional food photography lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDz8iz9O0ZWVUbmlnVa26mNLZuqf6-ctu62W7NNzhwNhDB2EsKrkrZ-A6Dz22-hz-aFZKSmXShLSfyKcLQ8ZeicSzx_j9b8VoxIaaNXMd2KJkoRwjlSN20Fjh4TgUjLMi_3MCGs1uNpJ7Tol_uu5EYDMDwDCcF1WhUZ2zedhDQLFAvqWzFza4sagznE5WniKLKq3bXd8E_NfzQhDKzjs9V4iRmdVcPDEtCcFv52OV4dM7S-MlnY8tadhwEpp_iEh34vH_w32Oen7-o" />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-headline-md text-[18px] text-on-surface">Heirloom Variety Pack</h3>
                <span className="font-headline-md text-primary">$6.80</span>
              </div>
              <p className="font-label-xs text-on-surface-variant mb-4">Heritage Harvest • 800g</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#F6BE3B]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-xs text-on-surface">4.7</span>
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-sm active:scale-95 transition-transform">Add to Cart</button>
              </div>
            </div>
          </div>

          {/* Result Card 4 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden organic-elevation group cursor-pointer transition-all">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="large ripe beefsteak tomatoes sliced on a wooden cutting board in a farmhouse kitchen setting with warm afternoon sunlight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHvvjdnGVd9-Kf3yZqPvmjycJW3s_asq4R7i7clyq4rWc5w9y9E86N3fvyB4HCRhCGAdiguECmnHWmOsEtOQL9OCmp8K5ugyfbvqGY7NTCmw_KRvpZnZJMWES9n1kkGaZHwN7HArAkJm6AAA5p_S8INV47mRQSGqG0zw5eDoUAJncSz80E4p8ciUh69P95B_s_m9i2_UuwD4V_qJzKrKfIG8496bLq6gohia0Qenpifm1f5GRDS0pP42YvVMS7XKADvwR_I7b3KYI" />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-headline-md text-[18px] text-on-surface">Beefsteak Tomatoes</h3>
                <span className="font-headline-md text-primary">$5.10</span>
              </div>
              <p className="font-label-xs text-on-surface-variant mb-4">Valley View Growers • 1.5kg</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#F6BE3B]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-xs text-on-surface">4.5</span>
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-sm active:scale-95 transition-transform">Add to Cart</button>
              </div>
            </div>
          </div>

          {/* Result Card 5 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden organic-elevation group cursor-pointer transition-all">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="bright yellow pear-shaped cherry tomatoes in a woven basket sitting on green grass with soft morning dew and natural light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-WG6S-V4gODSNrwNhsIbvXdrCoUs4rjeDesc_aYxrVZJxwF_BvgoAKEZxVcAgeMIISjmeMH6ri8lc0vgonYLQXhGrjcM3NphyebOptAiFp8zjhqX_wYoBkz75IYBnr9SAtdIIXjTM8rNUi6RYSSBg8PXISEyEzWm5jPfa1ybAoeVfDOgIAtn3ClZeTXTFiPRGqQMw3hCD6UIv2x4T4aCs7elpTn2cXx-KuUf3ifn6asFBb7BzzL54sRlVh7jp4Hp374YqUIGQ9HE" />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-headline-md text-[18px] text-on-surface">Yellow Pear Tomatoes</h3>
                <span className="font-headline-md text-primary">$3.90</span>
              </div>
              <p className="font-label-xs text-on-surface-variant mb-4">Sunny Fields • 400g</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#F6BE3B]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-xs text-on-surface">4.6</span>
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-sm active:scale-95 transition-transform">Add to Cart</button>
              </div>
            </div>
          </div>

          {/* Result Card 6 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden organic-elevation group cursor-pointer transition-all">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="professional glass jars of artisan sun-dried tomatoes in olive oil with herbs and garlic with elegant lighting and dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA48aHt82esO9-vy_pdibn1T8GIq1YgMt2xfKVyzQAwfxlYX-1T8p8K-Xml_NM91bvqnTNeY4-MABRnOQOd5KH8uibkpgr1-WHb9EZ39yYF_sXOu72NeYiOMZHPWkO6EfGb1CODNqfJxVo-VPvbUshfBVKU-vO1KGs0EFrJKtqJq99c9sShDGuEyqrK7L07tO7Xze4a0-CAMUHhSWqc3S-I3YL46KnNSGdh-dl2vXgIoniFu6w6VuOPONlGHwb68IZvCrZG0PNGwtI" />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-[#5C4300] text-white font-label-xs rounded-full shadow-sm">Preserved</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-headline-md text-[18px] text-on-surface">Sun-Dried Tomatoes</h3>
                <span className="font-headline-md text-primary">$7.50</span>
              </div>
              <p className="font-label-xs text-on-surface-variant mb-4">Artisan Pantry • 250g</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#F6BE3B]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-xs text-on-surface">5.0</span>
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-sm active:scale-95 transition-transform">Add to Cart</button>
              </div>
            </div>
          </div>

          {/* Result Card 7 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden organic-elevation group cursor-pointer transition-all">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="close-up of vine-ripened campari tomatoes on a minimalist white countertop with clean bright high-key lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuANj83aEv6BgBUjc39Yg45zcGdxDxkSuvi9tuzGcwqIdGcYUUCeXV0giG7hZu_PTkELeY5lnTILFzniDPL5CrYGXPOhqA-M8g8g2YVzRgMc7BCCG38sZVXwHzj_bvhRREo5DZPD2rkliFTK5rl--JjMYVjTB3kkQLwOhmGf8QcHypNqJ_zB96MvfuZQqISad5YBgAAVD0Ok7nC4yRsr6UKJ_Rkwl5jEZsGX2AssjQNUew0ojwxNQjZKWffAAF_3qHlNHrctKoSBIhg" />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-headline-md text-[18px] text-on-surface">Campari Tomatoes</h3>
                <span className="font-headline-md text-primary">$4.20</span>
              </div>
              <p className="font-label-xs text-on-surface-variant mb-4">Hydro Green • 450g</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#F6BE3B]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-xs text-on-surface">4.8</span>
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-sm active:scale-95 transition-transform">Add to Cart</button>
              </div>
            </div>
          </div>

          {/* Result Card 8 */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden organic-elevation group cursor-pointer transition-all">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="dark purple indigo rose tomatoes on a vine with dramatic lighting and deep shadows showcasing unique color textures" src="https://lh3.googleusercontent.com/aida-public/AB6AXuACZGci-0T9jakLGe1zvYHIjM2Dh5Yd2pBA1b801hKHPZUxsmWK1RNa88iVBCckQL-mOkc8-QcthzWpl0UV2dqKYESzXp28VjPyE8Y56CYjWu6cKP9SLjrA3C6riHSwi8cqkHnnY10j-gJgT8NLBGrGs2wbfl82KnClE8LpZ0CN2RLiKkiPPFHNLeizV_KguUYs6AmdYwRrLFWW8m_cpOdwxy6iiuP0LZftfjb8ox9vq-1qBs1QvGwK8a8QeLXnJFlmv_bF-uC4ie0" />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-primary font-label-xs rounded-full shadow-sm">Rare</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-headline-md text-[18px] text-on-surface">Indigo Rose Tomatoes</h3>
                <span className="font-headline-md text-primary">$8.00</span>
              </div>
              <p className="font-label-xs text-on-surface-variant mb-4">Exotic Botany • 300g</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#F6BE3B]">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-xs text-on-surface">4.4</span>
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-sm active:scale-95 transition-transform">Add to Cart</button>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-xl flex justify-center items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-white font-label-sm">1</button>
          <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors font-label-sm">2</button>
          <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </main>
    </>
  );
}
