// A minimal tar (ustar) writer and reader for the backup file: regular files only, names up to
// 100 bytes. Hand-rolled because Node has no built-in archive format, and the backup stays
// readable by any tar tool. Check: `pnpm build && node scripts/check-tar.mjs`.

const BLOCK = 512;
/** Largest single file accepted on import. Uploads are capped at 15 MB; orders.json is far smaller. */
const MAX_ENTRY = 64 * 1024 * 1024;

const octal = (n: number, width: number) => n.toString(8).padStart(width - 1, '0') + '\0';

export function tarHeader(name: string, size: number): Buffer {
  if (Buffer.byteLength(name) > 100) throw new Error(`tar name too long: ${name}`);
  const h = Buffer.alloc(BLOCK);
  h.write(name, 0);
  h.write(octal(0o644, 8), 100); // mode
  h.write(octal(0, 8), 108); // uid
  h.write(octal(0, 8), 116); // gid
  h.write(octal(size, 12), 124);
  h.write(octal(Math.floor(Date.now() / 1000), 12), 136); // mtime
  h.fill(' ', 148, 156); // the checksum is computed with its own field as spaces
  h.write('0', 156); // regular file
  h.write('ustar\0' + '00', 257);
  h.write(octal(checksum(h), 7) + ' ', 148);
  return h;
}

/** Zero bytes that round a file of `size` bytes up to the next 512-byte block. */
export const tarPadding = (size: number) => Buffer.alloc((BLOCK - (size % BLOCK)) % BLOCK);
/** Two empty blocks mark the end of the archive. */
export const TAR_END = Buffer.alloc(BLOCK * 2);

function checksum(header: Buffer): number {
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 32 : (header[i] ?? 0);
  return sum;
}

const text = (b: Buffer, start: number, end: number) =>
  b.toString('utf8', start, end).replace(/\0.*$/s, '');

/** Yields each regular file in a tar stream. Throws on anything that is not a complete tar. */
export async function* tarEntries(
  stream: AsyncIterable<Buffer>,
): AsyncGenerator<{ name: string; data: Buffer }> {
  const chunks = stream[Symbol.asyncIterator]();
  let pending: Buffer[] = [];
  let length = 0;
  // Returns exactly n bytes, or undefined if the stream ends first.
  const read = async (n: number) => {
    while (length < n) {
      const next = await chunks.next();
      if (next.done) return undefined;
      pending.push(next.value);
      length += next.value.length;
    }
    const all = pending.length === 1 ? (pending[0] as Buffer) : Buffer.concat(pending);
    pending = [all.subarray(n)];
    length = all.length - n;
    return all.subarray(0, n);
  };

  for (;;) {
    const header = await read(BLOCK);
    if (!header) throw new Error('tar ends without an end marker');
    if (header.every((byte) => byte === 0)) return;
    if (parseInt(text(header, 148, 156).trim(), 8) !== checksum(header)) {
      throw new Error('not a tar file');
    }
    const size = parseInt(text(header, 124, 136).trim(), 8);
    if (!Number.isFinite(size) || size > MAX_ENTRY) throw new Error('tar entry too large');
    const data = await read(size);
    const padding = await read((BLOCK - (size % BLOCK)) % BLOCK);
    if (!data || !padding) throw new Error('tar is cut short');
    const type = header[156];
    // '0' or NUL is a regular file. Directories and the extra headers other tools add are skipped.
    if (type === 48 || type === 0) yield { name: text(header, 0, 100), data: Buffer.from(data) };
  }
}
