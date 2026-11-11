"use client";

import { useSearchParams } from "next/navigation";
import GalleryBrowser from "@/components/gallery/GalleryBrowser";
import type { GalleryItem } from "@/lib/data/gallery";

// Reads `/gallery?service=…` (a service page's "See works" link) in the
// browser rather than on the server, so /gallery itself can be prerendered and
// served from the CDN like every other public page. The page wraps this in
// <Suspense> with the unfiltered grid as its fallback — that's the HTML that
// ships, and the filter applies as soon as the page hydrates.
export default function GalleryFromQuery({ items }: { items: GalleryItem[] }) {
  const service = useSearchParams().get("service") ?? undefined;
  return <GalleryBrowser key={service ?? ""} items={items} initialService={service} />;
}
