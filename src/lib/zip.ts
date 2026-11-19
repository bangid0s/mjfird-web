/*
  A tiny, dependency-free ZIP writer for "download all" buttons.

  Files are stored, not compressed: the things we bundle (PNG, JPEG, WebP,
  PSD exports…) are already compressed, so deflate would cost CPU and save
  almost nothing. Each file is read in full before it is written, so its size
  and CRC go straight into the local header — no data descriptors, no ZIP64
  (every archive here is far below 4 GB).

  `createZipStream` streams entries as they arrive, so the whole archive never
  sits in memory and large bundles don't hit response-size limits.
*/

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/**
 * Names that are safe inside an archive and unique within it:
 * "sketch.png", "sketch.png" → "sketch.png", "sketch (2).png".
 */
export function uniqueZipNames(names: string[]) {
  const used = new Set<string>();
  return names.map((raw) => {
    const clean =
      raw
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
        .replace(/^\.+/, "")
        .trim() || "file";
    const dot = clean.lastIndexOf(".");
    const base = dot > 0 ? clean.slice(0, dot) : clean;
    const ext = dot > 0 ? clean.slice(dot) : "";
    let name = clean;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} (${n})${ext}`;
    used.add(name.toLowerCase());
    return name;
  });
}

export type ZipEntry = { name: string; data: Uint8Array; modified?: Date };

type Written = { name: Uint8Array; crc: number; size: number; offset: number; time: number; date: number };

const UTF8_FLAG = 0x0800;

function localHeader(entry: Written) {
  const header = new Uint8Array(30 + entry.name.length);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, 20, true); // version needed
  v.setUint16(6, UTF8_FLAG, true);
  v.setUint16(8, 0, true); // stored
  v.setUint16(10, entry.time, true);
  v.setUint16(12, entry.date, true);
  v.setUint32(14, entry.crc, true);
  v.setUint32(18, entry.size, true);
  v.setUint32(22, entry.size, true);
  v.setUint16(26, entry.name.length, true);
  v.setUint16(28, 0, true);
  header.set(entry.name, 30);
  return header;
}

function centralHeader(entry: Written) {
  const header = new Uint8Array(46 + entry.name.length);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, 20, true); // version made by
  v.setUint16(6, 20, true); // version needed
  v.setUint16(8, UTF8_FLAG, true);
  v.setUint16(10, 0, true);
  v.setUint16(12, entry.time, true);
  v.setUint16(14, entry.date, true);
  v.setUint32(16, entry.crc, true);
  v.setUint32(20, entry.size, true);
  v.setUint32(24, entry.size, true);
  v.setUint16(28, entry.name.length, true);
  // extra, comment, disk, internal attrs, external attrs all zero
  v.setUint32(42, entry.offset, true);
  header.set(entry.name, 46);
  return header;
}

function endOfCentralDirectory(count: number, size: number, offset: number) {
  const record = new Uint8Array(22);
  const v = new DataView(record.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, count, true);
  v.setUint16(10, count, true);
  v.setUint32(12, size, true);
  v.setUint32(16, offset, true);
  return record;
}

/**
 * A ZIP archive as a byte stream. `entries` is pulled lazily, one file at a
 * time; yield `null` for a file that couldn't be read and it is skipped.
 */
export function createZipStream(entries: AsyncIterable<ZipEntry | null>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const iterator = entries[Symbol.asyncIterator]();
  const written: Written[] = [];
  let offset = 0;
  let finished = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return;
      // Skip unreadable files here rather than returning empty-handed: a pull
      // that enqueues nothing is never called again, and the stream stalls.
      let next = await iterator.next();
      while (!next.done && !next.value) next = await iterator.next();
      if (next.done) {
        const central = written.map(centralHeader);
        const size = central.reduce((sum, h) => sum + h.length, 0);
        for (const header of central) controller.enqueue(header);
        controller.enqueue(endOfCentralDirectory(written.length, size, offset));
        finished = true;
        controller.close();
        return;
      }
      const entry = next.value as ZipEntry;
      const { time, date } = dosDateTime(entry.modified ?? new Date());
      const record: Written = { name: encoder.encode(entry.name), crc: crc32(entry.data), size: entry.data.length, offset, time, date };
      const header = localHeader(record);
      controller.enqueue(header);
      controller.enqueue(entry.data);
      offset += header.length + entry.data.length;
      written.push(record);
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}
