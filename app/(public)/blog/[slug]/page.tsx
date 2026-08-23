"use client";

import { useParams, useRouter } from "next/navigation";
import TopNav from "@/components/top-nav";
import SiteFooter from "@/components/site-footer";
import BlogDetail from "@/components/blog-detail";

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  return (
    <>
      <TopNav />

      <main className="pt-16 min-h-screen bg-[#f9fafb]">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          <BlogDetail slug={slug} onBack={() => router.push("/blog")} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
