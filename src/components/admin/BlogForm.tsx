"use client";

import { useEffect, useState } from "react";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import GalleryUploader from "@/components/admin/GalleryUploader";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import { isVideoFile, isYouTubeUrl } from "@/lib/media";
import type { BlogPostRow, CoverFit } from "@/lib/supabase/types";
import SubmitButton from "@/components/admin/SubmitButton";

/**
 * The cover's natural width ÷ height, so the site can reserve the right box
 * for a "Full" cover before the image loads. Measured here because the admin
 * is the one place the file is already in a browser.
 *
 * Results are kept per URL, seeded with what was saved last time, so swapping
 * covers never reports the previous image's shape. An address that will not
 * load stays unmeasured (0) and the site falls back to letting the cover size
 * itself.
 */
function useNaturalAspect(url: string, savedUrl: string, savedAspect: number) {
  const [measured, setMeasured] = useState<Record<string, number>>(() =>
    savedUrl && savedAspect > 0 ? { [savedUrl]: savedAspect } : {},
  );

  useEffect(() => {
    if (!url || isYouTubeUrl(url) || isVideoFile(url)) return;

    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (cancelled || !probe.naturalWidth || !probe.naturalHeight) return;
      const ratio = Math.round((probe.naturalWidth / probe.naturalHeight) * 1000) / 1000;
      setMeasured((prev) => (prev[url] === ratio ? prev : { ...prev, [url]: ratio }));
    };
    probe.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return 0;
  // A player is 16:9 whatever the source file says.
  if (isYouTubeUrl(url) || isVideoFile(url)) return 16 / 9;
  return measured[url] ?? 0;
}

export default function BlogForm({
  post,
  action,
}: {
  post?: BlogPostRow;
  action: (formData: FormData) => void;
}) {
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [coverImage, setCoverImage] = useState(post?.cover_image ?? "");
  const [coverFit, setCoverFit] = useState<CoverFit>(post?.cover_fit ?? "cover");
  const coverAspect = useNaturalAspect(coverImage, post?.cover_image ?? "", post?.cover_aspect ?? 0);
  const bodyText = (post?.body as string[] | undefined)?.join("\n\n") ?? "";

  // Only a still image can be cropped, and only a crop has anything to keep in
  // view — but the picker stays mounted whichever fit is selected so switching
  // back to Cover does not lose the point that was already set.
  const croppable = Boolean(coverImage) && !isYouTubeUrl(coverImage) && !isVideoFile(coverImage);

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

      <Field label="Body — separate paragraphs with a blank line. A paragraph that is only an image, video or YouTube address becomes a picture in the post; put a caption on the line under it.">
        <textarea
          name="body"
          rows={10}
          defaultValue={bodyText}
          className={`${fieldInputClasses} resize-none`}
        />
      </Field>

      <ImageUploader
        name="cover_image"
        label="Cover image"
        initialUrl={post?.cover_image}
        onUploaded={setCoverImage}
      />

      <Field label="Cover framing — how the cover sits on the blog card and at the top of the post">
        <select
          name="cover_fit"
          value={coverFit}
          onChange={(e) => setCoverFit(e.target.value as CoverFit)}
          className={fieldInputClasses}
        >
          <option value="cover">Cover — fill the frame, crop what spills out</option>
          <option value="contain">Fit — whole image inside the frame, nothing cropped</option>
          <option value="natural">Full — keep the image&rsquo;s own shape (portrait stays portrait)</option>
          <option value="stretch">Stretch — fill the frame, ignore the proportions</option>
        </select>
      </Field>

      {croppable && (
        <div className={coverFit === "cover" ? undefined : "hidden"}>
          <FocalPointPicker
            name="cover_focal_point"
            imageUrl={coverImage}
            initial={post?.cover_focal_point}
          />
        </div>
      )}
      <input type="hidden" name="cover_aspect" value={coverAspect} />

      <GalleryUploader
        name="gallery"
        label="Post media — extra images, video files and YouTube links, shown as a grid under the post; each one opens full-screen"
        initial={post?.gallery}
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Tags — comma separated">
          <input name="tags" defaultValue={post?.tags?.join(", ") ?? ""} className={fieldInputClasses} />
        </Field>
        <Field label="Read time">
          <input name="read_time" defaultValue={post?.read_time ?? ""} placeholder="6 min" className={fieldInputClasses} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-6 border-t border-line pt-6">
        <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
          Link preview — X, WhatsApp, LinkedIn
        </legend>
        <ImageUploader
          name="og_image"
          label="Share image — 1200 × 630. Leave empty to use the branded card built from the post title."
          initialUrl={post?.og_image}
        />
      </fieldset>

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

      {status === "published" && (
        <Field label="Published date & time — leave blank to use now">
          <input
            type="datetime-local"
            name="published_at"
            defaultValue={post?.published_at ? post.published_at.slice(0, 16) : ""}
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
