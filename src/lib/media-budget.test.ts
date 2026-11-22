import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { budgetEdges, fitToBudget, MEDIA_MAX_BYTES, type Attempt } from "@/lib/media-budget";

// Fake encoder: bytes grow with pixel area and quality.
const fake = (bytesAt2400q86: number) => async ({ edge, quality }: Attempt) => ({
  size: Math.round(bytesAt2400q86 * (edge / 2400) ** 2 * (quality / 86) ** 3),
});

test("media budget: edges never upscale and cap at 2400", () => {
  assert.deepEqual(budgetEdges(6000), [2400, 2000, 1800, 1600, 1400, 1200, 1000]);
  assert.deepEqual(budgetEdges(1700), [1700, 1600, 1400, 1200, 1000]);
  assert.deepEqual(budgetEdges(640), [640]);
});

test("media budget: small enough keeps full size and best quality", async () => {
  const r = await fitToBudget(3000, fake(200 * 1024));
  assert.deepEqual(r.attempt, { edge: 2400, quality: 86 });
  assert.equal(r.fits, true);
});

test("media budget: prefers lower quality over a smaller size", async () => {
  const r = await fitToBudget(3000, fake(400 * 1024));
  assert.equal(r.attempt.edge, 2400, "q74 at 2400 fits, so the size is kept");
  assert.ok(r.out.size <= MEDIA_MAX_BYTES);
});

test("media budget: steps the size down when needed, last resort lowers quality", async () => {
  const heavy = await fitToBudget(3000, fake(1500 * 1024));
  assert.ok(heavy.fits && heavy.attempt.edge < 2400 && heavy.out.size <= MEDIA_MAX_BYTES);
  const extreme = await fitToBudget(3000, fake(20_000 * 1024));
  assert.equal(extreme.attempt.edge, 1000);
  assert.ok(extreme.attempt.quality < 74);
});

test("media budget: real noisy 3000px image lands under 300 KB as WebP", async () => {
  const noise = Buffer.alloc(3000 * 2000 * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
  const src = sharp(noise, { raw: { width: 3000, height: 2000, channels: 3 } });
  const { out, fits } = await fitToBudget(3000, async ({ edge, quality }) => {
    const data = await src.clone().resize({ width: edge, height: edge, fit: "inside" }).webp({ quality }).toBuffer();
    return { data, size: data.length };
  });
  assert.equal(fits, true);
  assert.ok(out.size <= MEDIA_MAX_BYTES);
  assert.equal((await sharp(out.data).metadata()).format, "webp");
});
