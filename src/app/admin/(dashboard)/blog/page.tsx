import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deletePost } from "@/lib/admin/blog-actions";
import DeleteButton from "@/components/admin/DeleteButton";
import StatusBadge from "@/components/admin/StatusBadge";
import PageHeader, { HeaderAction } from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import { mediaThumbnail } from "@/lib/media";
import type { BlogPostRow } from "@/lib/supabase/types";

export default async function AdminBlogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  const posts = (data as BlogPostRow[]) ?? [];

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Notes and writing, newest first. Scheduled posts go live automatically."
        action={<HeaderAction href="/admin/blog/new">New post</HeaderAction>}
      />

      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Write about process, motion, or the scene — posts feed the blog and the RSS feed."
          ctaHref="/admin/blog/new"
          ctaLabel="Write your first post"
        />
      ) : (
        <div className="flex flex-col">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between gap-4 border-t border-line px-2 py-4 transition-colors last:border-b hover:bg-bg-raised/40"
            >
              {post.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaThumbnail(post.cover_image)}
                  alt=""
                  className="h-12 w-16 shrink-0 border border-line object-cover"
                />
              ) : (
                <div className="flex h-12 w-16 shrink-0 items-center justify-center border border-line bg-bg-raised font-mono text-[9px] uppercase text-ink-faint">
                  No cover
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="truncate font-body text-body text-ink transition-colors hover:text-accent"
                  >
                    {post.title}
                  </Link>
                  <StatusBadge status={post.status} />
                </div>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                  {new Date(post.published_at ?? post.created_at).toLocaleDateString()}
                  {post.read_time ? ` · ${post.read_time}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <a
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden font-mono text-label uppercase tracking-[0.1em] text-ink-faint hover:text-ink sm:inline"
                >
                  View
                </a>
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="font-mono text-label uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
                >
                  Edit
                </Link>
                <DeleteButton action={deletePost.bind(null, post.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
