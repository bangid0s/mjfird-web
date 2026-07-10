import BlogForm from "@/components/admin/BlogForm";
import { createPost } from "@/lib/admin/blog-actions";
import PageHeader from "@/components/admin/PageHeader";

export default function NewPostPage() {
  return (
    <div>
      <PageHeader title="New post" backHref="/admin/blog" backLabel="Blog" />
      <BlogForm action={createPost} />
    </div>
  );
}
