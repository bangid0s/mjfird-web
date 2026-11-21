"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Stars from "@/components/reviews/Stars";
import VerifiedBadge from "@/components/reviews/VerifiedBadge";
import { isVideoFile, isYouTubeUrl, mediaThumbnail } from "@/lib/media";
import { getYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";
import type { GalleryItem } from "@/lib/data/gallery";
import FlowImage from "@/components/media/FlowImage";
import { cardLabel, fullDate, isClientWork, monthYear } from "@/lib/gallery-view";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

/**
 * Full-screen viewer for a gallery image: the artwork on the left, its story on
 * the right (who it was for, their review, how to order the same, tags), and
 * stacked on a phone. Escape closes, arrows step, the
 * backdrop is a click target, and the page behind is locked from scrolling
 * while it is open — the same contract the case-study gallery uses.
 *
 * Rendered through a portal to `document.body`: the standalone window wrapping
 * the gallery carries a backdrop-filter, which makes it the containing block
 * for `position: fixed` children, and clips them with its own overflow. Left in
 * place the viewer would centre on that frame rather than on the screen.
 */
export default function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
  showServices = true,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
  /** Off on a service page, where "commission this" would link to itself. */
  showServices?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const next = useCallback(
    () => onIndexChange((index + 1) % items.length),
    [index, items.length, onIndexChange],
  );
  const prev = useCallback(
    () => onIndexChange((index - 1 + items.length) % items.length),
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, next, prev]);

  // Move focus into the dialog so the keyboard bindings have somewhere to land
  // and a screen reader announces the change.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const item = items[index];
  // Only ever rendered after a click, so `document` is always there.
  if (!item) return null;

  const services = showServices ? item.services : [];
  const title = cardLabel(item, showServices);
  const published = fullDate(item.publishedAt);
  const reviewDate = monthYear(item.review?.date);
  const youTubeId = isYouTubeUrl(item.imageUrl) ? getYouTubeId(item.imageUrl) : null;

  const arrow =
    "fixed top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-bg/70 font-mono text-2xl text-ink-muted backdrop-blur-sm transition-colors hover:text-accent";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Image viewer"}
      onClick={onClose}
      // Solid, not blurred: a backdrop-filter here would become the containing
      // block for the fixed close/arrow buttons and scroll them away on a phone.
      className="fixed inset-0 z-[var(--z-modal)] overflow-y-auto bg-bg"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed right-3 top-3 z-10 flex h-11 w-11 items-center justify-center bg-bg/70 font-mono text-lg text-ink-muted backdrop-blur-sm transition-colors hover:text-accent sm:right-5 sm:top-5"
      >
        ✕
      </button>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous image"
            className={`${arrow} left-1 sm:left-4`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next image"
            className={`${arrow} right-1 sm:right-4`}
          >
            ›
          </button>
        </>
      )}

      <div className="flex min-h-full items-center justify-center px-4 py-16 sm:px-16 lg:py-12">
        <div
          onClick={(e) => e.stopPropagation()}
          className="grid w-full max-w-7xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12"
        >
          {/* The art: as large as the screen allows, never cropped. */}
          <div className="flex items-center justify-center lg:sticky lg:top-12">
            {youTubeId ? (
              <div className="relative aspect-video w-full">
                <iframe
                  key={item.id}
                  src={youTubeEmbedUrl(youTubeId, { autoplay: true })}
                  title={title || "Video"}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
            ) : isVideoFile(item.imageUrl) ? (
              <video
                key={item.id}
                src={item.imageUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[65svh] w-auto max-w-full lg:max-h-[86svh]"
              />
            ) : (
              <FlowImage
                key={item.id}
                src={mediaThumbnail(item.imageUrl)}
                alt={item.title || title || ""}
                sizes="(min-width: 1024px) 60vw, 100vw"
                priority
                className="h-auto max-h-[65svh] w-auto max-w-full object-contain lg:max-h-[86svh]"
              />
            )}
          </div>

          {/* The story: who it was for, what they said, how to order the same. */}
          <aside className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              {title && <h2 className="display-sm text-pretty">{title}</h2>}
              {item.clientName && <p className="mono-meta text-ink-muted">Made for {item.clientName}</p>}
              {isClientWork(item) && (
                <span className="inline-flex w-fit items-center gap-1.5 border border-line bg-bg-raised px-2.5 py-1 font-body text-[12px] font-medium text-ink">
                  <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center bg-accent text-[9px] leading-none text-accent-ink">
                    ✓
                  </span>
                  Client commission
                </span>
              )}
            </div>

            {item.review && (
              <blockquote className="flex flex-col gap-3 border border-line bg-bg-raised p-5">
                <div className="flex items-center gap-3">
                  {item.review.rating ? <Stars rating={item.review.rating} /> : null}
                  {reviewDate && <span className="text-body-sm text-ink-muted">{reviewDate}</span>}
                </div>
                <p className="whitespace-pre-line text-body-sm leading-relaxed text-pretty text-ink">
                  &ldquo;{item.review.quote}&rdquo;
                </p>
                <footer className="flex flex-col gap-1">
                  <span className="text-body-sm text-ink-muted">
                    — {item.review.name}
                    {item.review.role ? `, ${item.review.role}` : ""}
                  </span>
                  {item.review.verified && <VerifiedBadge />}
                </footer>
              </blockquote>
            )}

            {item.caption && <p className="text-body-sm text-pretty text-ink-muted">{item.caption}</p>}

            {services.length > 0 && (
              <div className="flex flex-col gap-3 border-y border-line py-4">
                {services.map((service) => (
                  <Link
                    key={service.id}
                    href={`/services/${service.slug}`}
                    className="group flex flex-col gap-0.5 text-body font-medium text-accent-strong"
                  >
                    <span>
                      Commission me for something similar{" "}
                      <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                    <span className="text-body-sm font-normal text-ink-muted">{service.title}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* The tile's own click opens this viewer, so an item's link lives here. */}
            {item.linkUrl &&
              (isExternal(item.linkUrl) ? (
                <a
                  href={item.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-fit bg-accent px-5 py-2.5 text-body-sm font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85"
                >
                  Visit link ↗
                </a>
              ) : (
                <Link
                  href={item.linkUrl}
                  className="w-fit bg-accent px-5 py-2.5 text-body-sm font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85"
                >
                  Visit link →
                </Link>
              ))}

            {item.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Tags">
                {item.tags.map((tag) => (
                  <li key={tag} className="border border-line px-3 py-1 text-body-sm text-ink-muted">
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between gap-3 text-body-sm text-ink-faint">
              {published ? <span>Published {published}</span> : <span />}
              {items.length > 1 && (
                <span className="font-mono text-label">
                  {index + 1} / {items.length}
                </span>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}
