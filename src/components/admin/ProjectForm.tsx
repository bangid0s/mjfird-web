"use client";

import { useState } from "react";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import GalleryUploader from "@/components/admin/GalleryUploader";
import FocalPointPicker from "@/components/admin/FocalPointPicker";
import type { ProjectRow } from "@/lib/supabase/types";
import SubmitButton from "@/components/admin/SubmitButton";

export default function ProjectForm({
  project,
  action,
}: {
  project?: ProjectRow;
  action: (formData: FormData) => void;
}) {
  const [status, setStatus] = useState(project?.status ?? "draft");
  const [coverImage, setCoverImage] = useState(project?.cover_image ?? "");

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Title">
          <input name="title" required defaultValue={project?.title ?? ""} className={fieldInputClasses} />
        </Field>
        <Field label="Slug">
          <input name="slug" required defaultValue={project?.slug ?? ""} className={fieldInputClasses} />
        </Field>
      </div>

      <div className="grid gap-8 sm:grid-cols-3">
        <Field label="Client">
          <input name="client" defaultValue={project?.client ?? ""} className={fieldInputClasses} />
        </Field>
        <Field label="Year">
          <input name="year" defaultValue={project?.year ?? ""} className={fieldInputClasses} />
        </Field>
        <Field label="Role">
          <input name="role" defaultValue={project?.role ?? ""} className={fieldInputClasses} />
        </Field>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Category">
          <input name="category" defaultValue={project?.category ?? ""} className={fieldInputClasses} />
        </Field>
        <Field label="Layout">
          <select name="template" defaultValue={project?.template ?? "editorial"} className={fieldInputClasses}>
            <option value="editorial">Editorial — illustration &amp; artwork (centered story)</option>
            <option value="immersive">Showcase — full-bleed cover hero (graphic design)</option>
            <option value="systems">System — brand identity applications</option>
          </select>
        </Field>
      </div>

      <Field label="Hook — one-line summary">
        <input name="hook" defaultValue={project?.hook ?? ""} className={fieldInputClasses} />
      </Field>

      <ImageUploader
        name="cover_image"
        label="Cover image"
        initialUrl={project?.cover_image}
        onUploaded={setCoverImage}
      />
      {coverImage && (
        <FocalPointPicker
          name="cover_focal_point"
          imageUrl={coverImage}
          initial={project?.cover_focal_point}
        />
      )}

      <GalleryUploader
        name="gallery"
        label="Project gallery — shown as a masonry grid; each image opens full-screen on click (upload several at once)"
        initial={project?.gallery}
      />

      <fieldset className="flex flex-col gap-6 border-t border-line pt-6">
        <legend className="mb-2 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
          Story — leave any blank to hide it · paste a YouTube link in any section to embed the video
        </legend>
        <Field label="The brief — what the client asked for">
          <textarea
            name="narrative_context"
            rows={3}
            defaultValue={project?.narrative?.context ?? ""}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>
        <Field label="The idea — your concept / direction">
          <textarea
            name="narrative_move"
            rows={3}
            defaultValue={project?.narrative?.move ?? ""}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>
        <Field label="The execution — how you made it">
          <textarea
            name="narrative_build"
            rows={3}
            defaultValue={project?.narrative?.build ?? ""}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>
        <Field label="The result — outcome / reception">
          <textarea
            name="narrative_result"
            rows={3}
            defaultValue={project?.narrative?.result ?? ""}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>
      </fieldset>

      <label className="flex items-center gap-3">
        <input type="checkbox" name="featured" defaultChecked={project?.featured} className="h-4 w-4 accent-accent" />
        <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">
          Feature on homepage
        </span>
      </label>

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
            defaultValue={project?.scheduled_at ? project.scheduled_at.slice(0, 16) : ""}
            className={fieldInputClasses}
          />
        </Field>
      )}

      <div className="flex gap-4">
        <SubmitButton className="self-start">Save project</SubmitButton>
        {project && (
          <a
            href={`/work/${project.slug}`}
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
