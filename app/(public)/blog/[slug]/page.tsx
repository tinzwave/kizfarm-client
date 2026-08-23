"use client";

import { useParams, useRouter } from "next/navigation";
import BlogDetail from "@/components/blog-detail";

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  return (
    <>
      {/* TopAppBar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
            <img alt="KizFarm Logo" className="h-12 w-auto" src="/logo.jpeg" />
            <span className="text-xl font-extrabold text-[#1B6D24] tracking-tight">KizFarm</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-zinc-500 hover:text-[#1B6D24] font-semibold text-sm transition-colors" href="/public/home">Home</a>
            <a className="text-zinc-500 hover:text-[#1B6D24] font-semibold text-sm transition-colors" href="/buyer/marketplace">Marketplace</a>
            <a className="text-[#1B6D24] font-bold text-sm transition-colors" href="/public/blog">Blog</a>
            <div className="h-6 w-[1px] bg-zinc-200"></div>
            <button
              onClick={() => router.push("/public/login")}
              className="bg-[#1B6D24] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto min-h-screen bg-[#f9fafb] pb-20 px-6 pt-8">
        <BlogDetail slug={slug} onBack={() => router.push("/public/blog")} />
      </main>

      {/* Footer */}
      <footer className="bg-zinc-50 border-t border-zinc-200 py-12 px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <span className="text-lg font-bold text-[#1B6D24]">KIZ FARM</span>
            <p className="text-zinc-600 text-sm">© 2026 KizFarm Digital Agronomy. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm">
            <a className="text-zinc-500 hover:text-[#1B6D24] transition-all" href="#">Privacy Policy</a>
            <a className="text-zinc-500 hover:text-[#1B6D24] transition-all" href="#">Terms of Service</a>
            <a className="text-zinc-500 hover:text-[#1B6D24] transition-all" href="#">Contact Us</a>
          </div>
        </div>
      </footer>
    </>
  );
}
