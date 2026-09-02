import type { Metadata } from "next";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import CoverMedia from "@/components/media/CoverMedia";
import { getPosts } from "@/lib/data/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on design, motion, and breaking from MJFIRD.",
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
      <SectionHeader eyebrow="Blog" title="Notes" />
      <ul className="flex flex-col">
        {posts.map((post) => (
          <li key={post.slug} className="border-t border-line py-8 last:border-b">
            <Link
              href={`/blog/${post.slug}`}
              data-cursor="view"
              className="group flex flex-col gap-5 sm:flex-row sm:items-center"
            >
              {/* No fixed aspect here: a "natural" cover brings its own, which
                  is the whole point of the setting. */}
              <div className="w-full shrink-0 overflow-hidden sm:w-44">
                {post.cover ? (
                  <CoverMedia
                    src={post.cover}
                    alt={post.title}
                    fit={post.coverFit}
                    focalPoint={post.coverFocalPoint}
                    aspect={post.coverAspect}
                    ratio="16 / 10"
                    maxHeight="18rem"
                    sizes="(min-width: 640px) 176px, 100vw"
                    mediaClassName="transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-105"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-bg-raised to-bg-raised-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                    Notes
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex gap-4 font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
                  <time dateTime={post.date}>{post.date.slice(0, 10)}</time>
                  {post.readTime && <span>{post.readTime} read</span>}
                </div>
                <h2 className="font-display text-display-sm uppercase leading-[0.95] text-ink transition-colors duration-[var(--duration-fast)] group-hover:text-accent">
                  {post.title}
                </h2>
                <p className="font-body text-body-sm text-ink-muted">{post.excerpt}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
