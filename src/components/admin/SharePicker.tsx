"use client";

import { useState } from "react";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";
import { shareHeadlineSize } from "@/lib/social-share";
import { cn } from "@/lib/cn";

type ShareMode = "auto" | "custom";

// The generated card is 1200×630, so every size below is expressed as a
// percentage of that width (cqw) and the preview stays pixel-faithful at any
// width. Keep these in sync with src/lib/og-card.tsx.
const cqw = (px: number) => `${(px / 1200) * 100}cqw`;

function CardPreview({
  eyebrow,
  headline,
  host,
  bgUrl,
  overlay,
}: {
  eyebrow: string;
  headline: string;
  host: string;
  bgUrl: string;
  overlay: number;
}) {
  return (
    <div
      className="relative aspect-[1200/630] w-full overflow-hidden"
      style={{ containerType: "inline-size", background: "#0c0b0d", color: "#f5f1e8" }}
    >
      {bgUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: `rgba(12, 11, 13, ${overlay / 100})` }}
          />
        </>
      )}

      <div
        className="relative flex h-full flex-col justify-between"
        style={{ padding: cqw(72) }}
      >
        <div
          style={{ width: cqw(64), height: cqw(10), background: "var(--color-accent)" }}
        />
        <div className="flex flex-col" style={{ gap: cqw(16) }}>
          {eyebrow && (
            <span
              className="uppercase"
              style={{
                fontSize: cqw(24),
                letterSpacing: cqw(4),
                color: "var(--color-accent)",
              }}
            >
              {eyebrow.slice(0, 70)}
            </span>
          )}
          <span
            className="font-bold uppercase"
            style={{ fontSize: cqw(shareHeadlineSize(headline)), lineHeight: 1.02 }}
          >
            {headline.slice(0, 110)}
          </span>
        </div>
        <span
          className="uppercase"
          style={{ fontSize: cqw(22), letterSpacing: cqw(2), color: "#9a9499" }}
        >
          {host}
        </span>
      </div>
    </div>
  );
}

export default function SharePicker({
  initialMode,
  initialImageUrl,
  initialTitle,
  initialDescription,
  initialEyebrow,
  initialHeadline,
  initialBgUrl,
  initialOverlay,
  initialHandle,
  fallbackTitle,
  fallbackDescription,
  fallbackEyebrow,
  fallbackHeadline,
  host,
}: {
  initialMode?: ShareMode;
  initialImageUrl?: string | null;
  initialTitle?: string;
  initialDescription?: string;
  initialEyebrow?: string;
  initialHeadline?: string;
  initialBgUrl?: string | null;
  initialOverlay?: number;
  initialHandle?: string;
  fallbackTitle: string;
  fallbackDescription: string;
  fallbackEyebrow: string;
  fallbackHeadline: string;
  host: string;
}) {
  const [mode, setMode] = useState<ShareMode>(initialMode ?? "auto");
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [eyebrow, setEyebrow] = useState(initialEyebrow ?? "");
  const [headline, setHeadline] = useState(initialHeadline ?? "");
  const [bgUrl, setBgUrl] = useState(initialBgUrl ?? "");
  const [overlay, setOverlay] = useState(initialOverlay ?? 55);

  // An empty custom slot still has to preview *something* — and it falls back to
  // the branded card in the metadata too, so show that.
  const showsCard = mode === "auto" || !imageUrl;

  const thumbnail = showsCard ? (
    <CardPreview
      eyebrow={eyebrow || fallbackEyebrow}
      headline={headline || fallbackHeadline}
      host={host}
      bgUrl={bgUrl}
      overlay={overlay}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt="" className="aspect-[1200/630] w-full bg-bg-raised-2 object-cover" />
  );

  return (
    <div className="flex flex-col gap-8">
      <Field label="Thumbnail">
        <select
          name="share_image_mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as ShareMode)}
          className={fieldInputClasses}
        >
          <option value="auto">Branded card — generated from the fields below</option>
          <option value="custom">Custom image — upload your own artwork</option>
        </select>
      </Field>

      {mode === "custom" ? (
        <>
          <ImageUploader
            name="share_image_url"
            label="Share image — 1200 × 630 px (anything wider than it is tall works; under 5 MB)"
            initialUrl={imageUrl}
            onUploaded={setImageUrl}
          />
          {/* Keep the branded-card settings on file while the custom image is in use. */}
          <input type="hidden" name="share_card_eyebrow" value={eyebrow} />
          <input type="hidden" name="share_card_headline" value={headline} />
          <input type="hidden" name="share_card_bg_url" value={bgUrl} />
          <input type="hidden" name="share_card_overlay_opacity" value={overlay} />
        </>
      ) : (
        <>
          <input type="hidden" name="share_image_url" value={imageUrl} />
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Card eyebrow — small line above the name">
              <input
                name="share_card_eyebrow"
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                placeholder={fallbackEyebrow}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Card headline — the big text">
              <input
                name="share_card_headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder={fallbackHeadline}
                className={fieldInputClasses}
              />
            </Field>
          </div>

          <ImageUploader
            name="share_card_bg_url"
            label="Card background image (optional)"
            initialUrl={bgUrl}
            onUploaded={setBgUrl}
          />

          {bgUrl ? (
            <Field label={`Dark overlay on the card background — ${overlay}% (higher = more readable text)`}>
              <input
                type="range"
                name="share_card_overlay_opacity"
                min={0}
                max={100}
                step={5}
                value={overlay}
                onChange={(e) => setOverlay(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </Field>
          ) : (
            <input type="hidden" name="share_card_overlay_opacity" value={overlay} />
          )}
        </>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Share title — blank uses the site title">
          <input
            name="share_title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={fallbackTitle}
            className={fieldInputClasses}
          />
        </Field>
        <Field label="X / Twitter handle (optional)">
          <input
            name="share_twitter_handle"
            defaultValue={initialHandle ?? ""}
            placeholder="@mjfird"
            className={fieldInputClasses}
          />
        </Field>
      </div>

      <Field label="Share description — blank uses the site description">
        <textarea
          name="share_description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={fallbackDescription}
          className={cn(fieldInputClasses, "resize-none")}
        />
      </Field>

      <div className="flex flex-col gap-4 border border-line bg-bg-raised p-4">
        <p className="font-mono text-label uppercase tracking-[0.15em] text-accent">
          Preview — how the link looks when pasted
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
              X · LinkedIn · Facebook · Slack
            </span>
            <div className="max-w-sm overflow-hidden border border-line">
              {thumbnail}
              <div className="flex flex-col gap-1 border-t border-line bg-bg px-4 py-3">
                <span className="font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
                  {host}
                </span>
                <span className="truncate text-body-sm text-ink">{title || fallbackTitle}</span>
                <span className="line-clamp-2 text-body-sm text-ink-muted">
                  {description || fallbackDescription}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
              WhatsApp · iMessage · Telegram
            </span>
            <div className="max-w-xs rounded-md border border-line bg-bg p-1.5">
              <div className="overflow-hidden rounded-sm">{thumbnail}</div>
              <div className="flex flex-col gap-0.5 px-2 py-2">
                <span className="truncate text-body-sm text-ink">{title || fallbackTitle}</span>
                <span className="line-clamp-2 text-label text-ink-muted">
                  {description || fallbackDescription}
                </span>
                <span className="font-mono text-label text-ink-faint">{host}</span>
              </div>
              <p className="px-2 pb-1 text-body-sm text-accent underline">https://{host}</p>
            </div>
          </div>
        </div>

        <p className="font-mono text-label text-ink-faint">
          Titles get cut around 60 characters, descriptions around 150. Saving changes the image
          address, so anything posted afterwards picks up the new thumbnail — for links already
          out there, re-scrape them with LinkedIn Post Inspector or the Facebook Sharing Debugger.
        </p>
      </div>
    </div>
  );
}
