import type { Metadata } from "next";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import CoverMedia from "@/components/media/CoverMedia";
import Reveal from "@/components/motion/Reveal";
import { getPosts } from "@/lib/data/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on design, motion, and breaking from MJFIRD.",
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
      <SectionHeader
        index={1}
        eyebrow="Blog"
        title="Notes"
        action={
          <p className="mono-meta">
            {posts.length} {posts.length === 1 ? "note" : "notes"}
          </p>
        }
      />

      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2">
        {posts.map((post, i) => (
          <Reveal as="li" key={post.slug} delay={(i % 2) * 70}>
            <Link
              href={`/blog/${post.slug}`}
              data-cursor="view"
              className="group flex flex-col gap-5"
            >
              {/* No fixed aspect is forced here: a "natural" cover brings its
                  own, which is the whole point of the setting. */}
              <div className="overflow-hidden border border-line bg-bg-raised-2">
                {post.cover ? (
                  <CoverMedia
                    src={post.cover}
                    alt={post.title}
                    fit={post.coverFit}
                    focalPoint={post.coverFocalPoint}
                    aspect={post.coverAspect}
                    ratio="16 / 10"
                    maxHeight="24rem"
                    sizes="(min-width: 640px) 46vw, 100vw"
                    mediaClassName="transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-bg-raised to-bg-raised-2">
                    <span className="eyebrow">Notes</span>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <div className="mono-meta flex flex-wrap items-center gap-x-3">
                  <time dateTime={post.date}>{post.date.slice(0, 10)}</time>
                  {post.readTime && (
                    <>
                      <span aria-hidden="true" className="opacity-50">
                        /
                      </span>
                      <span>{post.readTime} read</span>
                    </>
                  )}
                </div>
                <h2 className="display-sm transition-colors duration-[var(--duration-fast)] group-hover:text-accent">
                  {post.title}
                </h2>
                <p className="text-body-sm text-pretty text-ink-muted">{post.excerpt}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
