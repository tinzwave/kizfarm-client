"use client";

import Link from "next/link";
import TopNav from "@/components/top-nav";
import SiteFooter from "@/components/site-footer";

export default function AboutPage() {
  return (
    <>
    <main className="pt-20">
      <TopNav />
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <img
          alt="Vibrant green rolling hills of a precision-managed farm during a soft sunrise"
          className="absolute inset-0 w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJm-FBiMKnONp_mdHXM5qAVYtTrwj1ucZJkG2zWtWDa38UyyEDgxlYub93nVMuUwcR_TgG1-NeMh8pIVoiXwKg0nHrWIRDEEM_5yRmQkCcCISGJwCNV1s3gx7Uyr_8Jf2OXHQUrBcAu7JfvkIVfm7JdKWQdnRYlm0hS0fStFC934PoNOMmAXuTLqZHuUAeuMronijMjn8lWhYXoVoc_gIHpB9R1F4ossvBURrAC3DIL19KicUbuLyry0pVo-a7ALAeBPEO-G0HiXE"
        />
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <h1 className="text-display-xl font-display-xl text-white mb-6">
            Cultivating Direct Connections
          </h1>
          <p className="text-body-lg font-body-lg text-white/90 max-w-2xl mx-auto">
            KIZ FARM bridges the gap between fertile soil and the modern market,
            ensuring farmers thrive through precision logistics and fair trade.
          </p>
        </div>
      </section>

      {/* Our Story Section - Asymmetric Layout */}
      <section className="max-w-[1280px] mx-auto py-xl px-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7">
            <span className="text-label-md font-label-md text-primary uppercase tracking-widest mb-4 block">
              Our Roots
            </span>
            <h2 className="text-headline-lg font-headline-lg text-on-surface mb-8">
              The Story of KIZ FARM
            </h2>
            <div className="space-y-6 text-body-md font-body-md text-on-surface-variant">
              <p>
                Born in the heart of rural landscapes, KIZ FARM began with a
                simple observation: the world&apos;s most vital producers were
                the furthest from the rewards of their labor. We saw
                high-quality produce languishing in local markets while urban
                demand for fresh, sustainable food reached an all-time high.
              </p>
              <p>
                We didn&apos;t just build a marketplace; we built an ecosystem.
                By integrating precision agricultural software with a robust
                physical distribution network, we empower farmers to predict
                yields, manage soil health, and access global buyers with the
                tap of a screen.
              </p>
              <p>
                Today, KIZ FARM serves as a digital-soil bridge. We provide the
                tools for sustainable growth and the logistics for rapid
                harvest-to-home delivery, ensuring that &quot;farm fresh&quot;
                isn&apos;t just a label—it&apos;s a standard of living for our
                community.
              </p>
            </div>
          </div>
          <div className="md:col-span-5 relative">
            <div className="aspect-[4/5] rounded-xl overflow-hidden soil-shadow">
              <img
                alt="A farmer standing beside sacks of freshly harvested grain in an open field"
                className="w-full h-full object-cover"
                src="/about-images/farmer-portrait.jpg"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 p-6 bg-white rounded-lg soil-shadow hidden lg:block border border-outline-variant/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-primary"
                    data-icon="groups"
                  >
                    groups
                  </span>
                </div>
                <div>
                  <div className="text-headline-md font-headline-md text-primary">
                    5,000+
                  </div>
                  <div className="text-caption font-caption text-on-surface-variant uppercase">
                    Partner Farmers
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Bento Grid */}
      <section className="bg-surface-container-low py-xl">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-headline-lg font-headline-lg text-on-surface">
              Built on Earth, Optimized by Tech
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Value 1 */}
            <div className="bg-white p-8 rounded-xl border border-outline-variant/20 soil-shadow flex flex-col justify-between">
              <div>
                <span
                  className="material-symbols-outlined text-primary text-4xl mb-6"
                  data-icon="eco"
                >
                  eco
                </span>
                <h3 className="text-headline-md font-headline-md mb-4">
                  Precision Ecology
                </h3>
                <p className="text-body-md font-body-md text-on-surface-variant">
                  We use satellite imagery and soil sensors to help farmers
                  minimize water waste and maximize nutrient efficiency.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-100">
                <span className="text-caption font-caption text-primary uppercase">
                  Sustainability First
                </span>
              </div>
            </div>

            {/* Value 2 (Large Middle) */}
            <div className="bg-primary p-8 rounded-xl text-white md:col-span-1 flex flex-col justify-center items-center text-center">
              <span
                className="material-symbols-outlined text-6xl mb-6 text-white"
                data-icon="handshake"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                handshake
              </span>
              <h3 className="text-headline-md font-headline-md mb-4">
                Fair Trade Logic
              </h3>
              <p className="text-body-md font-body-md opacity-90">
                By removing unnecessary middlemen, we return 30% more value
                directly to the farmers&apos; pockets.
              </p>
            </div>

            {/* Value 3 */}
            <div className="bg-white p-8 rounded-xl border border-outline-variant/20 soil-shadow flex flex-col justify-between">
              <div>
                <span
                  className="material-symbols-outlined text-primary text-4xl mb-6"
                  data-icon="local_shipping"
                >
                  local_shipping
                </span>
                <h3 className="text-headline-md font-headline-md mb-4">
                  Rapid Harvest
                </h3>
                <p className="text-body-md font-body-md text-on-surface-variant">
                  Our cold-chain logistics ensure crops reach urban markets
                  within 24 hours of being picked from the soil.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-100">
                <span className="text-caption font-caption text-primary uppercase">
                  Zero Waste Goal
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visuals Section */}
      <section className="bg-white">
        <div className="max-w-[1280px] mx-auto py-xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="aspect-video rounded-xl overflow-hidden">
                <img
                  alt="Close-up of healthy young crops growing in straight lines in rich dark soil"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvqxsKTuWp2A_0uBERPRUPBY__Z7WPdu0ZM7DOs77D4uU_8EIbMf39jRgxTtA8ThxGSrusBzn98xQcI8sFb3dS4pNL6JldH4An6TDPGimYckcubUEVASIivhfzfGUsbQpTLKbHPlERTtEu9510j7f5n2Be7_8PYlXrB3tE9WMFzbFoZxh3stf57MBPfV22ckejy5-OZ3k0lrF2tI3b0WEGdtiZN_iFbulDYxdVJ60g1Z0b_5Psbafc0LXozS5tB9-jWSB9GZgNqfg"
                />
              </div>
              <div className="bg-surface-container-high p-8 rounded-xl">
                <h3 className="text-headline-md font-headline-md text-primary mb-4">
                  Empowering Generations
                </h3>
                <p className="text-body-md font-body-md text-on-surface-variant">
                  Our mission is to make farming a prestigious and profitable
                  career once again, attracting the next generation of
                  agricultural innovators.
                </p>
              </div>
            </div>
            <div className="aspect-[4/5] rounded-xl overflow-hidden soil-shadow">
              <img
                alt="A farmer winnowing freshly harvested grain by hand in an open field"
                className="w-full h-full object-cover"
                src="/about-images/farmer-harvest.jpg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-xl text-center px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-headline-lg font-headline-lg text-white mb-6">
            Join the Agricultural Revolution
          </h2>
          <p className="text-body-lg font-body-lg text-white/80 mb-10">
            Whether you are a farmer looking for better markets or a stakeholder
            in food security, there is a place for you at KIZ FARM.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/farmer/become"
              className="px-8 py-4 rounded-lg bg-white text-primary font-bold text-lg hover:bg-slate-50 transition-all active:scale-95 inline-block"
            >
              Become a Farmer
            </Link>
            <Link
              href="/buyer/marketplace"
              className="px-8 py-4 rounded-lg border-2 border-white text-white font-bold text-lg hover:bg-white/10 transition-all active:scale-95 inline-block"
            >
              View Products
            </Link>
          </div>
        </div>
      </section>
    </main>
      <SiteFooter />
    </>
  );
}
