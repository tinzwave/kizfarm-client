"use client";

import { useRouter } from "next/navigation";
import TopNav from "@/components/top-nav";
import SiteFooter from "@/components/site-footer";
import BlogDetail from "@/components/blog-detail";
import OpenInAppBanner from "@/components/open-in-app-banner";

export default function PublicBlogPostPage({ slug }: { slug: string }) {
  const router = useRouter();
  return (
    <>
      <TopNav />

      <main className="pt-16 min-h-screen bg-[#f9fafb]">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          <OpenInAppBanner path={`/blog/${encodeURIComponent(slug)}`} />
          <BlogDetail slug={slug} onBack={() => router.push("/blog")} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
