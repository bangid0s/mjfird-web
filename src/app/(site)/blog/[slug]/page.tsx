import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPosts, getPost } from "@/lib/data/blog";
import JsonLd from "@/components/seo/JsonLd";
import CoverMedia from "@/components/media/CoverMedia";
import ProjectGallery from "@/components/media/ProjectGallery";
import PostBody from "@/components/blog/PostBody";
import { SITE_URL } from "@/lib/site-url";

const BASE_URL = SITE_URL;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      // Only set when the post has its own share image — leaving the key off
      // lets the generated card in opengraph-image.tsx take over.
      ...(post.ogImage && { images: [{ url: post.ogImage, alt: post.title }] }),
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const gallery = post.gallery ?? [];

  return (
    <article className="py-[var(--space-section)]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          author: { "@type": "Person", name: "MJFIRD" },
          mainEntityOfPage: `${BASE_URL}/blog/${post.slug}`,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE_URL}/blog` },
            { "@type": "ListItem", position: 2, name: post.title, item: `${BASE_URL}/blog/${post.slug}` },
          ],
        }}
      />
      <div className="container-prose">
        <Link
          href="/blog"
          data-cursor="view"
          className="group mb-10 inline-flex items-center gap-2 text-body-sm font-medium text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-accent"
        >
          <span aria-hidden="true" className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:-translate-x-1">←</span>
          All notes
        </Link>
        <div className="mono-meta mb-6 flex flex-wrap items-center gap-x-3">
          <time dateTime={post.date}>{post.date}</time>
          <span aria-hidden="true" className="opacity-50">/</span>
          <span>{post.readTime} read</span>
        </div>
        <h1 className="display-lg mb-10">
          {post.title}
        </h1>
        {post.cover && (
          <div className="mb-12 overflow-hidden rounded-[var(--radius-lg)] border border-line">
            <CoverMedia
              src={post.cover}
              alt={post.title}
              fit={post.coverFit}
              focalPoint={post.coverFocalPoint}
              aspect={post.coverAspect}
              ratio="16 / 9"
              maxHeight="75svh"
              sizes="(min-width: 768px) 672px, 100vw"
              priority
              interactive
            />
          </div>
        )}
        <PostBody body={post.body} />
      </div>

      {gallery.length > 0 && (
        <section className="container-page mt-20 max-w-6xl">
          <h2 className="eyebrow mb-6 border-t border-line pt-8">
            More from this post
          </h2>
          <ProjectGallery images={gallery} />
        </section>
      )}
    </article>
  );
}
