import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-zinc-50 border-t border-zinc-200">
      <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
          <img
            src="/logo-mark.png"
            alt="KizFarm"
            className="h-10 w-auto object-contain"
          />
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} KizFarm Digital Agronomy. All rights reserved.
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm">
          <Link href="/public/home" className="text-zinc-500 hover:text-[#1B6D24] transition-colors">
            Home
          </Link>
          <Link href="/public/about" className="text-zinc-500 hover:text-[#1B6D24] transition-colors">
            About
          </Link>
          <Link href="/public/blog" className="text-zinc-500 hover:text-[#1B6D24] transition-colors">
            Blog
          </Link>
          <Link href="/public/contact" className="text-zinc-500 hover:text-[#1B6D24] transition-colors">
            Contact Us
          </Link>
        </nav>
      </div>
    </footer>
  );
}
