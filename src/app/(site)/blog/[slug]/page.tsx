import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPosts, getPost } from "@/lib/data/blog";
import JsonLd from "@/components/seo/JsonLd";
import { isYouTubeUrl, isVideoFile } from "@/lib/media";
import VideoEmbed from "@/components/media/VideoEmbed";
import SmartImage from "@/components/media/SmartImage";
import Linkify from "@/components/ui/Linkify";
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
  return { title: post.title, description: post.excerpt };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 py-20 sm:px-10">
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
      <Link
        href="/blog"
        data-cursor="view"
        className="mb-8 inline-block font-mono text-label uppercase tracking-[0.15em] text-ink-muted hover:text-accent"
      >
        ← All notes
      </Link>
      <div className="mb-8 flex gap-4 font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
        <time dateTime={post.date}>{post.date}</time>
        <span>{post.readTime} read</span>
      </div>
      <h1 className="mb-10 font-display text-display-lg uppercase leading-[0.9] text-ink">
        {post.title}
      </h1>
      {post.cover && (
        <div className="relative mb-10 aspect-video w-full overflow-hidden bg-bg-raised">
          {isYouTubeUrl(post.cover) || isVideoFile(post.cover) ? (
            <VideoEmbed url={post.cover} title={post.title} />
          ) : (
            <SmartImage src={post.cover} alt={post.title} sizes="(min-width: 768px) 672px, 100vw" />
          )}
        </div>
      )}
      <div className="flex flex-col gap-6">
        {post.body.map((paragraph, i) => (
          <p key={i} className="font-body text-body-lg leading-relaxed text-ink-muted">
            <Linkify text={paragraph} />
          </p>
        ))}
      </div>
    </article>
  );
}
