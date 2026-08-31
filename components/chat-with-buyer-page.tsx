"use client";

import React from "react";

export default function ChatWithBuyerPage() {
  return (
    <div
      className="font-body-md text-on-surface h-full flex flex-col"
      style={{ backgroundColor: "#fbf9f8" }}
    >
      {/* Main Content Area - Flexible for embedded use */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Chat Container */}
        <div className="flex-1 flex flex-col w-full bg-white">
          {/* Safety Banner */}
          <div className="bg-primary/5 px-6 py-3 flex items-center justify-center gap-2 border-b border-primary/10">
            <span
              className="material-symbols-outlined text-primary text-sm"
              data-icon="gpp_maybe"
            >
              gpp_maybe
            </span>
            <p className="font-label-sm text-primary">
              Keep all transactions inside{" "}
              <span className="font-bold">KIZ FARM</span> for safety
            </p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-8 space-y-6 overflow-y-auto bg-surface-bright">
            {/* Date Separator */}
            <div className="flex justify-center">
              <span className="px-4 py-1 bg-surface-container-low rounded-full font-label-xs text-on-surface-variant">
                Today
              </span>
            </div>

            {/* Left Message (Buyer) */}
            <div className="flex gap-4 max-w-[80%]">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex-shrink-0 overflow-hidden">
                <img
                  alt="Buyer"
                  className="w-full h-full object-cover"
                  data-alt="Portrait of James Wilson, verified buyer"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgi7tjxh9BgxyXKo6bXQnzEAIKy8DiFzZYtPMbi-sP557kGiEnBNeezof3FuYqNwUVahNfmx5JzJjfSH5qQsslUdg-erQS-rxoreV0fNULD3bwvC-7HoprbLM9F5M7s6nY9Uytoc6eCix7stH8aK5_UFnN5F8a2JCqjpBmi5AlOtypI8uruAeuh5rJtHHoh6vLQVj8ks6y5XuLLnv9uRvo7dVhl_lsYhe7PEaL4IOgz-245gC_hc7lpoqJbi7mu41gMD8IXaTKfq0"
                />
              </div>
              <div className="space-y-1">
                <div className="bg-white border border-outline-variant p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <p className="font-body-md text-on-surface">
                    Hello! I saw your listing for the Organic Gala Apples. Are
                    they still available for bulk purchase this week?
                  </p>
                </div>
                <p className="font-label-xs text-on-surface-variant ml-1">
                  09:15 AM
                </p>
              </div>
            </div>

            {/* Right Message (Farmer) */}
            <div className="flex flex-row-reverse gap-4 ml-auto max-w-[80%]">
              <div className="w-10 h-10 rounded-full bg-primary-container flex-shrink-0 overflow-hidden">
                <img
                  alt="Farmer"
                  className="w-full h-full object-cover"
                  data-alt="Smiling experienced farmer wearing a plaid shirt and a wide-brimmed hat in a sun-drenched orchard"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9cyxvbx4rZB3ubJAijEKlMYe_QOBMGfm-kUUfu6yBTFRPWEZ2KocBZgiX8XJzQmcMejnKqWiysbYqncxJPxFpQxODpTyT-_QiAfQHQ-NMAUxTGm5iIn6jRtlUnJz0GLdUr36mLCwuagDKtf2BYwS6qD211aQC2rwZHhBzYxdHgKKHFlIS3Ss3VZ8nZPD573i_ThDXF4YkNQi1mKz9xyhbRjqkXJ3bSkajgb-hN5VeSzHjIa3thEPBbI2U8sykghZexn46QuD7Qqc"
                />
              </div>
              <div className="space-y-1 items-end flex flex-col">
                <div className="bg-[#1B6D24] p-4 rounded-2xl rounded-tr-none text-white shadow-md">
                  <p className="font-body-md">
                    Good morning James! Yes, we just finished the harvest
                    yesterday. They are in peak condition right now. How many
                    crates are you looking for?
                  </p>
                </div>
                <p className="font-label-xs text-on-surface-variant mr-1">
                  09:18 AM
                </p>
              </div>
            </div>

            {/* Left Message (Buyer) */}
            <div className="flex gap-4 max-w-[80%]">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex-shrink-0 overflow-hidden">
                <img
                  alt="Buyer"
                  className="w-full h-full object-cover"
                  data-alt="Portrait of James Wilson"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjO2wtCzReDVfq_RDsBvgj51VgCPNGkubkH29LER4FCEmchMI3vmI_g8yfiA69HzBr9XvCe7LMtu7-XprA58AhFwmYQiLmySRZYrwZOycMr8UPZNIXQZgutRW53jzeM0O3z2emQ0zkR7SY1cb6BcWC8Y0oy8JTv0JnaV8ksmYZOERnIR9D_Fqkec2OT0LpnhLvYZUYfahCFW372ScVPpeNyfB-ZWN5MbXsX90t6NprCCFTl78jU5T7GNOdnMgUAf1yeUmvfd3v9xA"
                />
              </div>
              <div className="space-y-1">
                <div className="bg-white border border-outline-variant p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <p className="font-body-md">
                    I&apos;d like about 50 crates if possible. Could you send over a
                    couple of photos of the current batch? Just want to check
                    the sizing.
                  </p>
                </div>
                <p className="font-label-xs text-on-surface-variant ml-1">
                  09:20 AM
                </p>
              </div>
            </div>

            {/* Right Message (Farmer - Image Share) */}
            <div className="flex flex-row-reverse gap-4 ml-auto max-w-[80%]">
              <div className="w-10 h-10 rounded-full bg-primary-container flex-shrink-0 overflow-hidden">
                <img
                  alt="Farmer"
                  className="w-full h-full object-cover"
                  data-alt="Smiling farmer in orchard"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1dN9qfpI7A6-xRgUrSfz0fIjmBfCrZ2cZbThiSxW5smcIpDDuoF2jI1bLhqDehSgrLqIR0ITdHi6GEP5jhLimkcWc0nJvVrhP7tnLzwQApx5FycwofO9tLqm4YYbiNXYm0HfjW1r6ni_nyNiCGbDlnULAP_C9eggsi3JauJojUKHgt-HhLSYNjIt0mSjS0Vmr_VRzQvELf149IEgSgDN9w0AZ4Wtm6mIHMYuPAoKMPONhQ99hHwXs-8CTfJXO5R6t85ddLR3lUiM"
                />
              </div>
              <div className="space-y-1 items-end flex flex-col">
                <div className="bg-[#1B6D24] p-2 rounded-2xl rounded-tr-none text-white shadow-md">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="rounded-xl overflow-hidden aspect-square">
                      <img
                        alt="Fresh Apples"
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        data-alt="Close-up of vibrant red Gala apples in a wooden harvest crate with natural morning light and visible water droplets"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkrj4ijr1P7QGM2m9XUIs-GfmA04jd96PLiEeblv98fN-mss1_0_6pX5P2N7TSppIYK8hTjZWGYPJmZyREUb-q-hZNyt-1qh5dZZ2WIRngmu9dog8QXMNKgXJm7StoYfxvf82Ven3Z3GK1k4C_KHpd-W0H6Vd2xlUPLs4crdcWX6IBYNzDBYT2BwJ58IJN4Yr5mAICOcB8RSOEJVG7IrOsTmYRYPsAWyivlFoVUkVxEVAglP8cSNw2gWTJgBwhlSzhiWcQyJ51RoY"
                      />
                    </div>
                    <div className="rounded-xl overflow-hidden aspect-square">
                      <img
                        alt="Apple Quality Check"
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        data-alt="A crate full of shiny organic apples being inspected by a hand in the sunlight, showing uniform size and deep color"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEXCtixNuhPa9jkolmcDY1k01A48NKCnBJjuG00U-wbEZOMLRhSmbRAigN1cpHBQKk3cPiT3Xa8y4ArO8luCid9Oy92K31qOr_9VWtiQMXXrYGcNDMj23Hi2baKaZfMB9mkbJBb0Gp1APMG8qoWTK0a6huIl4WdVIYoXZArsrtC_aNwZAkAdGPi-cjg8SpjwhczoAWKR3Ck-Vb7HXHMcZIBQfnmp0HLRdk53c8gsTUh2fgqExJLiiCt4PKwWpYEFRv2Y8huakdz3U"
                      />
                    </div>
                  </div>
                  <div className="px-2 pb-2">
                    <p className="font-body-md">
                      Absolutely! Here are some shots from the packing shed. The
                      sizing is very consistent this year, mostly 70-80mm.
                    </p>
                  </div>
                </div>
                <p className="font-label-xs text-on-surface-variant mr-1">
                  09:22 AM
                </p>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-gray-100">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3 bg-surface-container-low rounded-3xl p-3 border border-outline-variant focus-within:border-primary-container focus-within:ring-2 focus-within:ring-primary/5 transition-all">
                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                  <span
                    className="material-symbols-outlined"
                    data-icon="add_circle"
                  >
                    add_circle
                  </span>
                </button>
                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                  <span className="material-symbols-outlined" data-icon="image">
                    image
                  </span>
                </button>
                <textarea
                  className="flex-1 bg-transparent border-none focus:ring-0 font-body-md resize-none py-2 px-1 text-on-surface placeholder:text-on-surface-variant/50"
                  placeholder="Type your message to James..."
                  rows={1}
                ></textarea>
                <button className="bg-[#1B6D24] text-white p-3 rounded-full hover:shadow-lg active:scale-95 transition-all flex items-center justify-center">
                  <span
                    className="material-symbols-outlined"
                    data-icon="send"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    send
                  </span>
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between px-2">
                <div className="flex gap-4">
                  <button className="flex items-center gap-1 font-label-xs text-on-surface-variant hover:text-primary">
                    <span
                      className="material-symbols-outlined text-base"
                      data-icon="description"
                    >
                      description
                    </span>
                    Send Quote
                  </button>
                  <button className="flex items-center gap-1 font-label-xs text-on-surface-variant hover:text-primary">
                    <span
                      className="material-symbols-outlined text-base"
                      data-icon="location_on"
                    >
                      location_on
                    </span>
                    Farm Location
                  </button>
                </div>
                <p className="font-label-xs text-on-surface-variant/60 italic">
                  James is typing...
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
