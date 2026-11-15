// Self-check for apps/api/src/orders/tar.ts. Run: pnpm build && node scripts/check-tar.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { TAR_END, tarEntries, tarHeader, tarPadding } = createRequire(import.meta.url)(
  '../apps/api/dist/orders/tar.js',
);
const files = [
  ['orders.json', Buffer.from('[{"_id":"a"}]')],
  ['uploads/empty.png', Buffer.alloc(0)],
  ['uploads/one-block.png', Buffer.alloc(512, 7)],
  ['uploads/big.png', Buffer.alloc(100_001, 9)],
];
const tar = Buffer.concat([
  ...files.flatMap(([name, data]) => [tarHeader(name, data.length), data, tarPadding(data.length)]),
  TAR_END,
]);

// Fed in awkward chunk sizes, so entries straddle chunk boundaries.
async function* chunked(buffer, size) {
  for (let i = 0; i < buffer.length; i += size) yield buffer.subarray(i, i + size);
}
const read = async (source) => {
  const out = [];
  for await (const entry of tarEntries(source)) out.push([entry.name, entry.data]);
  return out;
};
for (const size of [1, 7, 512, 1000, tar.length]) {
  const out = await read(chunked(tar, size));
  assert.deepEqual(
    out.map(([n]) => n),
    files.map(([n]) => n),
  );
  out.forEach(([, data], i) => assert.ok(data.equals(files[i][1]), `content of ${files[i][0]}`));
}

// The system tar must agree it is a tar with these files.
const path = join(mkdtempSync(join(tmpdir(), 'sph-tar-')), 'check.tar');
writeFileSync(path, tar);
assert.deepEqual(
  execFileSync('tar', ['-tf', path], { encoding: 'utf8' }).trim().split('\n'),
  files.map(([n]) => n),
);

await assert.rejects(
  read(chunked(tar.subarray(0, tar.length - 2000), 512)),
  /cut short|end marker/,
);
await assert.rejects(read(chunked(Buffer.alloc(2048, 65), 512)), /not a tar file/);
console.log('tar check passed');
