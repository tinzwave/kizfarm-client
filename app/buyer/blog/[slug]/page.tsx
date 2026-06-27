import BlogDetail from "@/components/blog-detail";

interface PageProps {
  params: {
    slug: string;
  };
}

export default function Page({ params }: PageProps) {
  return <BlogDetail slug={params.slug} />;
}
