import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

await mkdir('dist/icons', { recursive: true });
await cp('extension', 'dist', { recursive: true });
await build({ entryPoints: ['src/content.js'], bundle: true, outfile: 'dist/content.js', format: 'iife', platform: 'browser', target: 'chrome120', legalComments: 'inline' });
await cp('LICENSE', 'dist/LICENSE');
await writeFile('dist/THIRD_PARTY_LICENSES.txt', 'Turndown\n\n' + await readFile('node_modules/turndown/LICENSE', 'utf8'));

// Generate simple clipboard icons locally; no remote images or build services.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, crc]);
}
for (const size of [16, 48, 128]) {
  const pixels = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const paper = u > .25 && u < .75 && v > .23 && v < .83;
    const clip = u > .4 && u < .6 && v > .16 && v < .32;
    const line = u > .35 && u < .65 && ((v > .43 && v < .49) || (v > .59 && v < .65));
    const color = clip || line ? [20, 80, 56, 255] : paper ? [255, 255, 255, 255] : [36, 138, 92, 255];
    pixels.set(color, y * (1 + size * 4) + 1 + x * 4);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  await writeFile(`dist/icons/${size}.png`, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]));
}
console.log('Built unpacked extension in dist/');
