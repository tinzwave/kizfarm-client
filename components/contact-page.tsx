"use client";

import { useState } from "react";
import TopNav from "@/components/top-nav";
import SiteFooter from "@/components/site-footer";

const CONTACT_EMAIL = "hello@kizfarm.com";
const PHONE_DISPLAY = "+234 703 167 2282";
const PHONE_E164 = "+2347031672282";
const WHATSAPP_URL = "https://wa.me/2347031672282";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Opens the visitor's email app with the message ready to send to us --
  // no server endpoint for bots to spam, and replies go straight back to
  // their own address.
  function send(e: React.FormEvent) {
    e.preventDefault();
    const subject = `Message from ${name.trim() || "a KIZ FARM visitor"}`;
    const body = `${message.trim()}\n\n— ${name.trim()}${email.trim() ? ` (${email.trim()})` : ""}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <>
      <TopNav />

      <main className="pt-16 pb-xl bg-white">
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-white py-16 md:py-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#1B6D24]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative max-w-[1280px] mx-auto px-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 text-xs font-bold tracking-widest uppercase bg-[#a2f4b5] text-[#002108] rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B6D24]"></span>
              We&apos;d Love to Hear From You
            </span>
            <h1 className="font-display-xl text-display-xl text-primary mb-4">
              Cultivate a Connection
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Have questions about our sustainable farming practices or looking
              for precision agricultural systems? Our team is ready to assist
              you in the field.
            </p>
          </div>
        </section>

        <div className="max-w-[1280px] mx-auto px-6 mt-lg">


          {/* Bento Layout for Contact Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Contact Details Column */}
            <div className="lg:col-span-4 flex flex-col gap-gutter">
              {/* Address Card */}
              <div className="bg-white border border-outline-variant p-md rounded-xl soil-shadow">
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-lg mb-sm">
                  <span
                    className="material-symbols-outlined text-primary"
                    data-icon="location_on"
                  >
                    location_on
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
                  Our Office
                </h3>
                <p className="font-body-md text-on-surface-variant">
                  KIZ EMPIREX LTD
                  <br />
                  Ekwulobia, Anambra State
                  <br />
                  Nigeria
                </p>
              </div>

              {/* Communication Card */}
              <div className="bg-white border border-outline-variant p-md rounded-xl soil-shadow">
                <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-lg mb-sm">
                  <span
                    className="material-symbols-outlined text-primary"
                    data-icon="contact_emergency"
                  >
                    contact_emergency
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
                  Direct Line
                </h3>
                <div className="flex flex-col gap-2">
                  <a
                    className="font-body-md text-primary font-semibold hover:underline"
                    href={`tel:${PHONE_E164}`}
                  >
                    {PHONE_DISPLAY}
                  </a>
                  <a
                    className="font-body-md text-primary font-semibold hover:underline"
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Chat on WhatsApp
                  </a>
                  <a
                    className="font-body-md text-primary font-semibold hover:underline"
                    href="mailto:hello@kizfarm.com"
                  >
                    hello@kizfarm.com
                  </a>
                </div>
              </div>

              {/* Image Block (Fresh Produce) */}
              <div className="relative group overflow-hidden rounded-xl h-64 lg:flex-1 border border-outline-variant">
                <img
                  alt="fresh produce box"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  data-alt="Top-down view of a rustic wooden crate overflowing with vibrant red tomatoes, leafy greens, and organic root vegetables on a bright sunny day."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7gV3EId0Uf_Drc6xgbmTILw4hoMcE12vHGLxHk4OhrOnMEtN3rNSOMzWSVAa8lu9ceAUQ7t5tpi36tAKsgsK7QlHiF12xOeSDZYjeJ6tQezJ6aVvOk4WrEgSAXgsyth5UKLVr-33fe0oINonWuMrT22a-XT4LJbvefSkpfK4LJsjYQQvkCKuOwpwJJ0SHaObjZlkFeyvBQdnVq2-GUVxUCeCLg2D_uC2F_j4_wIR-iXGcEsfh9B7b4I_jtLJbNxGoXqLLOJEWBw8"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="font-label-md uppercase tracking-widest text-[10px]">
                    Harvest Ready
                  </p>
                  <p className="font-headline-md">Farm Fresh Every Day</p>
                </div>
              </div>
            </div>

            {/* Main Form & Big Visual */}
            <div className="lg:col-span-8 flex flex-col gap-gutter">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter bg-white border border-outline-variant rounded-xl overflow-hidden soil-shadow">
                {/* Contact Form */}
                <div className="p-lg">
                  <form className="flex flex-col gap-md" onSubmit={send}>
                    <div className="flex flex-col gap-xs">
                      <label className="font-label-md text-on-surface-variant">
                        FULL NAME
                      </label>
                      <input
                        className="w-full bg-white border border-outline-variant rounded-lg px-md py-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md"
                        placeholder="Your full name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-xs">
                      <label className="font-label-md text-on-surface-variant">
                        EMAIL ADDRESS
                      </label>
                      <input
                        className="w-full bg-white border border-outline-variant rounded-lg px-md py-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md"
                        placeholder="you@example.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-xs">
                      <label className="font-label-md text-on-surface-variant">
                        YOUR MESSAGE
                      </label>
                      <textarea
                        className="w-full bg-white border border-outline-variant rounded-lg px-md py-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md"
                        placeholder="How can we help your farm grow today?"
                        rows={4}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      ></textarea>
                    </div>
                    <button
                      className="bg-primary text-on-primary font-label-md py-md rounded-lg hover:opacity-90 transition-all active:scale-[0.98] mt-sm flex items-center justify-center gap-2"
                      type="submit"
                    >
                      <span
                        className="material-symbols-outlined"
                        data-icon="send"
                      >
                        send
                      </span>
                      SEND MESSAGE
                    </button>
                  </form>
                </div>

                {/* Side Environment Visual */}
                <div className="relative min-h-[400px]">
                  <img
                    alt="farm environment"
                    className="absolute inset-0 w-full h-full object-cover"
                    data-alt="Wide expansive view of a verdant green crop field stretching towards the horizon under a soft blue sky with rolling hills in distance."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlfeKeleVi4OdQhcT0lspOCN4SvZGSWaGZjuDsWOvYzwxb3WtrU5gDjBwe4nrzTmCP1r0nhe55_vEC0IDqIMC_syXEPV1-QmlB5UJ47gtPaY1dEY_iuEuTGOeMwf9q8ORj5ReDgWs1BB9jQSvC6DtDmOhpoqziwndkT56f5d5Yole7FHIjKh7iw_8Pue5ILNdxpwwgaoLlJ4OtFIrxGTYSudB8r0BTtEhYJjWY9VsP19IKiSKhPFouu44ngHXPymaTBeQEtbozoJk"
                  />
                  <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
                  <div className="absolute inset-0 flex items-center justify-center p-lg">
                    <div className="backdrop-blur-md bg-white/10 border border-white/20 p-md rounded-xl text-white text-center">
                      <span
                        className="material-symbols-outlined text-4xl mb-sm"
                        data-icon="energy_savings_leaf"
                      >
                        energy_savings_leaf
                      </span>
                      <p className="font-headline-md">Rooted in Precision</p>
                      <p className="font-caption opacity-80 uppercase tracking-widest mt-2">
                        Certified Sustainability
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map/Location Teaser */}
              <div className="h-64 rounded-xl overflow-hidden border border-outline-variant relative group">
                <img
                  alt="farm map location"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
                  data-alt="Abstract aerial topography map style view of organized farm plots and agricultural grids with distinct geometric patterns."
                  data-location="Kansas"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKXzawEyE_AnuNXjlCPjtsvV0meCuounsskb3wNF1IlFvgNPLgN7Zdu-l7cWASOmzjrO8DUHb2RZLtkEgXFZ8G0KGwD7lO9woIXRFYNB89n1LT3sgLgLt8PvrRs6pY-la7HFlTwJMxEwQnxiGBp8vVO1OvuD-02vZOBhZpxwq4xQ5FEEgMpxg7j_Pzod1hlNijQQheIwBoPnkggJWxhLwjfSzO6XUcJyhNTjnmjAHib-AjFjtnPVaSTsx4CaohlDVCB8hMejhB5XI"
                />
                <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-all"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white px-lg py-sm rounded-full border border-primary flex items-center gap-2 soil-shadow">
                    <span
                      className="material-symbols-outlined text-primary"
                      data-icon="near_me"
                    >
                      near_me
                    </span>
                    <span className="font-label-md text-primary">
                      FIND US ON THE MAP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
