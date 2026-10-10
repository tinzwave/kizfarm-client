import type { Metadata } from "next";
import PublicBlogPostPage from "@/components/public-blog-post-page";

type Props = { params: Promise<{ slug: string }> };

const SITE_URL = "https://www.kizfarm.com";

// Server-rendered link-preview tags (Open Graph / Twitter card), so a post
// shared on WhatsApp, Facebook, X or LinkedIn shows its own title, summary
// and cover image instead of the generic site card.
async function getPostForPreview(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/blog_posts?select=title,summary,cover_image,author,created_at&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 600 } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostForPreview(slug);
  if (!post) return { title: "Blog | KIZ FARM" };
  const pageUrl = `${SITE_URL}/blog/${encodeURIComponent(slug)}`;
  const description = post.summary || "Read this article on KIZ FARM.";
  const images = post.cover_image ? [{ url: post.cover_image, alt: post.title }] : undefined;
  return {
    title: `${post.title} | KIZ FARM`,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: "article",
      url: pageUrl,
      siteName: "KIZ FARM",
      title: post.title,
      description,
      images,
      publishedTime: post.created_at,
      authors: post.author ? [post.author] : undefined,
    },
    twitter: { card: images ? "summary_large_image" : "summary", title: post.title, description, images: images?.map((i) => i.url) },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <PublicBlogPostPage slug={slug} />;
}
