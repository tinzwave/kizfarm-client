import TopNav from "@/components/top-nav";
import SiteFooter from "@/components/site-footer";

// Shared shell for the public legal pages (privacy policy, account
// deletion) -- readable column, linked headings.
export default function LegalPageLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="pt-16 min-h-screen bg-white">
        <article className="mx-auto max-w-3xl px-6 py-12 text-[15px] leading-7 text-slate-700 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 [&_p]:mb-3 [&_a]:text-[#1B6D24] [&_a]:font-semibold [&_a]:underline">
          <h1 className="text-3xl font-black text-slate-900 md:text-4xl">{title}</h1>
          <p className="mt-2 mb-8 text-sm text-slate-500">Last updated: {updated}</p>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
