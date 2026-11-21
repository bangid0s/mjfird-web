import { test } from "node:test";
import assert from "node:assert/strict";
import { sitemapImages } from "./sitemap-images";

const art = "https://x.supabase.co/storage/v1/object/public/media/art/orc-bard-1.webp";

test("keeps absolute images once, in order", () => {
  assert.deepEqual(sitemapImages([art, art, undefined, null, ""]), [art]);
});

test("drops videos, YouTube links and placeholder paths", () => {
  assert.deepEqual(
    sitemapImages(["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://x.co/reel.mp4", "/placeholder/project-01.jpg", art]),
    [art],
  );
});
