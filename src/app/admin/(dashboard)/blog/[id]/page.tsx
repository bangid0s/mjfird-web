import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlogForm from "@/components/admin/BlogForm";
import { updatePost } from "@/lib/admin/blog-actions";
import type { BlogPostRow } from "@/lib/supabase/types";
import PageHeader from "@/components/admin/PageHeader";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single<BlogPostRow>();

  if (!post) notFound();

  return (
    <div>
      <PageHeader title="Edit post" backHref="/admin/blog" backLabel="Blog" />
      <BlogForm post={post} action={updatePost.bind(null, id)} />
    </div>
  );
}
