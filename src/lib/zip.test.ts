import assert from "node:assert/strict";
import test from "node:test";
import { crc32, createZipStream, uniqueZipNames, type ZipEntry } from "@/lib/zip";

async function collect(stream: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

async function* from(entries: (ZipEntry | null)[]) {
  for (const entry of entries) yield entry;
}

/** Reads the archive back through its central directory, like an unzip tool would. */
function readZip(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = bytes.length - 22;
  assert.equal(v.getUint32(eocd, true), 0x06054b50);
  const count = v.getUint16(eocd + 10, true);
  let at = v.getUint32(eocd + 16, true);
  const files: { name: string; data: Uint8Array; crc: number }[] = [];
  for (let i = 0; i < count; i++) {
    assert.equal(v.getUint32(at, true), 0x02014b50);
    const crc = v.getUint32(at + 16, true);
    const size = v.getUint32(at + 20, true);
    const nameLen = v.getUint16(at + 28, true);
    const local = v.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen));
    assert.equal(v.getUint32(local, true), 0x04034b50);
    const start = local + 30 + v.getUint16(local + 26, true);
    files.push({ name, data: bytes.subarray(start, start + size), crc });
    at += 46 + nameLen;
  }
  return files;
}

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test("uniqueZipNames de-duplicates case-insensitively and strips path characters", () => {
  assert.deepEqual(uniqueZipNames(["sketch.png", "Sketch.png", "sketch.png", "a/b.jpg", "..hidden", ""]), [
    "sketch.png",
    "Sketch (2).png",
    "sketch (3).png",
    "a-b.jpg",
    "hidden",
    "file",
  ]);
});

test("createZipStream writes a readable archive and skips missing files", async () => {
  const enc = new TextEncoder();
  const bytes = await collect(
    createZipStream(
      from([
        { name: "ref one.png", data: enc.encode("first file") },
        null,
        { name: "pose — 2.jpg", data: new Uint8Array([0, 1, 2, 255]) },
      ]),
    ),
  );
  const files = readZip(bytes);
  assert.deepEqual(
    files.map((f) => f.name),
    ["ref one.png", "pose — 2.jpg"],
  );
  assert.equal(new TextDecoder().decode(files[0].data), "first file");
  assert.deepEqual([...files[1].data], [0, 1, 2, 255]);
  for (const f of files) assert.equal(f.crc, crc32(f.data));
});

test("an empty archive is still valid", async () => {
  const bytes = await collect(createZipStream(from([])));
  assert.equal(bytes.length, 22);
  assert.deepEqual(readZip(bytes), []);
});
