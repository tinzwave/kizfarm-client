"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export default function BecomeAFarmerPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("kizfarm_token")
          : null;
      if (!token) {
        router.replace("/public/login");
        return;
      }
      try {
        const rawUser = localStorage.getItem("kizfarm_user");
        const user = rawUser ? JSON.parse(rawUser) : null;
        setFullName(user?.name || "");
      } catch {
        setFullName("");
      }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/farmer/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data?.farmer) {
          // already started registration -> go to verification
          router.push("/farmer/verify");
          return;
        }
      } catch (err) {
        // ignore
      }
      setLoading(false);
    };
    check();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("kizfarm_token")
        : null;
    if (!token) {
      // redirect to login
      router.push("/public/login");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const farmName = String(formData.get("farm_name") || "").trim();
    const contact = phone.trim();
    const location = String(formData.get("location") || "");
    const farmType = String(formData.get("farm_type") || "");

    if (!fullName.trim()) {
      alert("Your registered full name could not be found. Please log in again.");
      setSubmitting(false);
      return;
    }

    if (!farmName || !location || !farmType || !contact) {
      alert("Please complete all required fields.");
      setSubmitting(false);
      return;
    }

    if (!/^\d+$/.test(contact)) {
      setPhoneError("Phone number must contain numbers only.");
      alert("Phone number must contain numbers only.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/farmer/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          farmName,
          phone: contact,
          location,
          farmType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      // redirect to verification
      router.push("/farmer/verify");
    } catch (err) {
      alert(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return <div className="pt-32 text-center">Checking registration...</div>;
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-4 h-16 w-full flex items-center justify-between">
        <div className="flex items-center gap-base">
          <img
            alt="KIZ FARM logo"
            className="h-8 w-auto object-contain"
            data-alt="minimalist professional logo for an agricultural technology company with modern typography and leaf motifs in deep green"
            src="/logo.jpeg"
          />
          <span className="text-lg font-black tracking-tighter text-[#1B6D24] uppercase font-headline-md">
            KIZ FARM
          </span>
        </div>
        <a
          className="text-primary font-label-sm hover:underline decoration-2 underline-offset-4"
          href="/public/login"
        >
          Sign In
        </a>
      </header>

      <main className="flex-grow flex items-center justify-center py-xl px-gutter">
        <div className="max-w-[1100px] w-full grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
          {/* Branding/Value Prop Section */}
          <div className="hidden lg:flex flex-col space-y-md">
            <div className="relative rounded-xl overflow-hidden aspect-[4/5] shadow-2xl">
              <img
                alt="Farm Landscape"
                className="absolute inset-0 w-full h-full object-cover"
                data-alt="dramatic aerial view of rolling green hills and geometric crop fields during morning mist with golden sunlight"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkJ5di6_z4mMdCMAfGHKgBtk46NAv2eT2HLqypI8tR38DzEi8XqG313rBSFnV_fSCH16S9-Jpm3blcnU5LCBy34wO7ghQlazGIrwNBeo67Gtu-QeGs63ROeKiiwwBe8Ch2RMwHkSksli_J9el7puGpRctGrUCnl_3hVELEGBKMK7lVPZMIIVpnmLLyJfMM1d0BnmadMcEsfXAUNyEK3GG_qFOy6kqhPCmb7Br4bWpd01M1Qze67YibCj-haI2F8_nJKVGo44OpQes"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-margin">
                <span className="text-white/80 font-label-sm uppercase tracking-widest mb-xs">
                  Join the movement
                </span>
                <h1 className="text-white font-headline-xl mb-base">
                  Empowering Digital Agronomy
                </h1>
                <p className="text-white/90 font-body-lg max-w-md">
                  Connect your farm to the future of high-precision software and
                  sustainable growth.
                </p>
              </div>
            </div>
          </div>

          {/* Registration Form Canvas */}
          <div className="bg-white p-margin rounded-xl border border-zinc-200 shadow-sm">
            <div className="mb-lg">
              <h2 className="text-on-surface font-headline-lg mb-xs">
                Create Farmer Account
              </h2>
              <p className="text-secondary font-body-md">
                Join the KIZ FARM ecosystem and start managing your production
                with precision.
              </p>
            </div>
            <form className="space-y-md" onSubmit={handleSubmit}>
              {/* Name & Farm Name Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="flex flex-col gap-xs">
                  <label
                    className="text-on-surface font-label-sm"
                    htmlFor="full_name"
                  >
                    Full name
                  </label>
                  <input
                    className="h-12 px-4 rounded-lg border border-zinc-300 bg-zinc-100 font-body-md text-zinc-600 form-input-focus transition-all"
                    id="full_name"
                    name="full_name"
                    placeholder="Registered full name"
                    readOnly
                    disabled
                    value={fullName}
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label
                    className="text-on-surface font-label-sm"
                    htmlFor="farm_name"
                  >
                    Farm name
                  </label>
                  <input
                    className="h-12 px-4 rounded-lg border border-zinc-300 bg-white font-body-md text-on-surface form-input-focus transition-all"
                    id="farm_name"
                    name="farm_name"
                    placeholder="Official farm name"
                    required
                    type="text"
                  />
                </div>
              </div>

              {/* Email/Phone */}
              <div className="flex flex-col gap-xs">
                <label
                  className="text-on-surface font-label-sm"
                  htmlFor="contact"
                >
                  Phone
                </label>
                <div className="relative">
                  <span
                    className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                    data-icon="call"
                  >
                    call
                  </span>
                  <input
                    className={`w-full h-12 pl-12 pr-4 rounded-lg border bg-white font-body-md text-on-surface form-input-focus transition-all ${
                      phoneError ? "border-red-500" : "border-zinc-300"
                    }`}
                    id="contact"
                    name="contact"
                    placeholder="Phone number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPhone(value);
                      setPhoneError(
                        value && !/^\d*$/.test(value)
                          ? "Phone number must contain numbers only."
                          : "",
                      );
                    }}
                  />
                </div>
                {phoneError && (
                  <p className="text-sm font-medium text-red-600">
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Location & Farm Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="flex flex-col gap-xs">
                  <label
                    className="text-on-surface font-label-sm"
                    htmlFor="location"
                  >
                    Farm location
                  </label>
                  <div className="relative">
                    <select
                      className="w-full h-12 px-4 rounded-lg border border-zinc-300 bg-white font-body-md text-on-surface appearance-none form-input-focus transition-all"
                      id="location"
                      name="location"
                      defaultValue=""
                      required
                    >
                      <option disabled value="">
                        Select Nigerian state
                      </option>
                      {NIGERIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    <span
                      className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                      data-icon="expand_more"
                    >
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-xs">
                  <label
                    className="text-on-surface font-label-sm"
                    htmlFor="farm_type"
                  >
                    Farm type
                  </label>
                  <div className="relative">
                    <select
                      className="w-full h-12 px-4 rounded-lg border border-zinc-300 bg-white font-body-md text-on-surface appearance-none form-input-focus transition-all"
                      id="farm_type"
                      name="farm_type"
                      defaultValue=""
                      required
                    >
                      <option disabled value="">
                        Select type
                      </option>
                      <option value="crops">Crops</option>
                      <option value="livestock">Livestock</option>
                      <option value="mixed">Mixed Farming</option>
                    </select>
                    <span
                      className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                      data-icon="agriculture"
                    >
                      agriculture
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              <div className="pt-base flex flex-col gap-md">
                <button
                  disabled={submitting}
                  className="w-full h-12 bg-[#1B6D24] hover:bg-primary-container text-white font-headline-md rounded-lg shadow-sm active:scale-[0.98] transition-all duration-150"
                  type="submit"
                >
                  {submitting ? "Submitting…" : "Join KIZ FARM"}
                </button>
                <p className="text-center text-secondary font-label-sm">
                  By joining, you agree to our{" "}
                  <a
                    className="text-[#1B6D24] font-semibold hover:underline"
                    href="#"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    className="text-[#1B6D24] font-semibold hover:underline"
                    href="#"
                  >
                    Privacy Policy
                  </a>
                </p>
              </div>
            </form>

            {/* Support/Quick Links */}
            <div className="mt-lg pt-lg border-t border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-xs text-zinc-500">
                <span
                  className="material-symbols-outlined text-[18px]"
                  data-icon="help_outline"
                >
                  help_outline
                </span>
                <span className="font-label-sm">Need assistance?</span>
              </div>
              <a
                className="text-[#1B6D24] font-label-sm font-semibold flex items-center gap-xs"
                href="#"
              >
                Contact Support
                <span
                  className="material-symbols-outlined text-[18px]"
                  data-icon="arrow_forward"
                >
                  arrow_forward
                </span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-lg px-gutter border-t border-zinc-200 bg-white">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-md text-secondary">
          <p className="font-label-sm">
            © 2024 KIZ FARM DIGITAL AGRONOMY. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-lg font-label-sm">
            <a className="hover:text-primary transition-colors" href="#">
              Twitter
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              LinkedIn
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
