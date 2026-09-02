"use client";

import { useState } from "react";

export default function FocalPointPicker({
  name,
  imageUrl,
  initial,
}: {
  name: string;
  imageUrl: string;
  initial?: { x: number; y: number };
}) {
  const [point, setPoint] = useState(initial ?? { x: 0.5, y: 0.5 });
  // The preview takes the image's own shape once it loads. A fixed frame would
  // crop a portrait here — and you cannot click a part of the image the picker
  // is not showing you. Matching the shape also keeps the maths honest: a click
  // at 30% across the box is 30% across the image.
  const [ratio, setRatio] = useState(16 / 9);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setPoint({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  };

  if (!imageUrl) return null;

  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">
        Focal point — click the image to set it
      </span>
      <div
        onClick={handleClick}
        className="relative w-full cursor-crosshair overflow-hidden bg-bg-raised"
        // Capping the width rather than the height keeps a tall image in
        // proportion as it shrinks, so the preview never letterboxes.
        style={{ aspectRatio: ratio, maxWidth: `min(20rem, calc(16rem * ${ratio}))` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (naturalWidth && naturalHeight) setRatio(naturalWidth / naturalHeight);
          }}
          className="h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/40"
          style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
        />
      </div>
      <input type="hidden" name={name} value={JSON.stringify(point)} />
    </div>
  );
}
