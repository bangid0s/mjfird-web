import type { Metadata } from "next";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
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
            <Link href={`/blog/${post.slug}`} data-cursor="view" className="group flex flex-col gap-3">
              <div className="flex gap-4 font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
                <time dateTime={post.date}>{post.date}</time>
                <span>{post.readTime} read</span>
              </div>
              <h2 className="font-display text-display-sm uppercase leading-[0.95] text-ink transition-colors duration-[var(--duration-fast)] group-hover:text-accent">
                {post.title}
              </h2>
              <p className="font-body text-body-sm text-ink-muted">{post.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
