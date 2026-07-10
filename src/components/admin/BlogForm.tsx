"use client";

import { useState } from "react";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import type { BlogPostRow } from "@/lib/supabase/types";
import SubmitButton from "@/components/admin/SubmitButton";

export default function BlogForm({
  post,
  action,
}: {
  post?: BlogPostRow;
  action: (formData: FormData) => void;
}) {
  const [status, setStatus] = useState(post?.status ?? "draft");
  const bodyText = (post?.body as string[] | undefined)?.join("\n\n") ?? "";

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Title">
          <input name="title" required defaultValue={post?.title ?? ""} className={fieldInputClasses} />
        </Field>
        <Field label="Slug">
          <input name="slug" required defaultValue={post?.slug ?? ""} className={fieldInputClasses} />
        </Field>
      </div>

      <Field label="Excerpt">
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={post?.excerpt ?? ""}
          className={`${fieldInputClasses} resize-none`}
        />
      </Field>

      <Field label="Body — separate paragraphs with a blank line">
        <textarea
          name="body"
          rows={10}
          defaultValue={bodyText}
          className={`${fieldInputClasses} resize-none`}
        />
      </Field>

      <ImageUploader name="cover_image" label="Cover image" initialUrl={post?.cover_image} />

      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Tags — comma separated">
          <input name="tags" defaultValue={post?.tags?.join(", ") ?? ""} className={fieldInputClasses} />
        </Field>
        <Field label="Read time">
          <input name="read_time" defaultValue={post?.read_time ?? ""} placeholder="6 min" className={fieldInputClasses} />
        </Field>
      </div>

      <Field label="Status">
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className={fieldInputClasses}
        >
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
      </Field>

      {status === "scheduled" && (
        <Field label="Publish at">
          <input
            type="datetime-local"
            name="scheduled_at"
            defaultValue={post?.scheduled_at ? post.scheduled_at.slice(0, 16) : ""}
            className={fieldInputClasses}
          />
        </Field>
      )}

      <div className="flex gap-4">
        <SubmitButton className="self-start">Save post</SubmitButton>
        {post && (
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ink px-6 py-3 font-mono text-label uppercase tracking-[0.15em] text-ink"
          >
            Preview →
          </a>
        )}
      </div>
    </form>
  );
}
