import Link from "next/link";

const linkColumns = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Our Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { label: "Shop Produce", href: "/buyer/marketplace" },
      { label: "Become a Farmer", href: "/farmer/become" },
      { label: "Learning Hub", href: "/learning" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In", href: "/login" },
      { label: "Create Account", href: "/signup" },
    ],
  },
];

const socials = [
  { label: "Instagram", href: "#", icon: "photo_camera" },
  { label: "X / Twitter", href: "#", icon: "tag" },
  { label: "LinkedIn", href: "#", icon: "work" },
];

export default function SiteFooter() {
  return (
    <footer className="relative bg-[#0B2412] text-white/70">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a2f4b5]/30 to-transparent" />
      <div className="max-w-[1280px] mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_repeat(3,1fr)] gap-12 pb-12 border-b border-white/10">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex items-center bg-white rounded-xl px-4 py-2.5 shadow-sm"
            >
              <img
                src="/logo-mark.png"
                alt="KizFarm"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              Precision agriculture and fair-trade logistics connecting
              verified farmers directly to your table — fresher produce,
              faster delivery, better prices.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-white/15 text-white/60 hover:text-[#a2f4b5] hover:border-[#a2f4b5]/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {s.icon}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {linkColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-[#a2f4b5] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col-reverse md:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>
            © {new Date().getFullYear()} KizFarm Digital Agronomy. All rights
            reserved.
          </p>
          <div className="flex items-center gap-2 font-semibold text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a2f4b5]"></span>
            Farm to table, verified every step.
          </div>
        </div>
      </div>
    </footer>
  );
}
