/* Minimal PNG reader: find the bounding box + centre of a sprite's non-transparent pixels.
 * Enough to answer "where inside the cursor sprite is the ring?" without a dependency. */
const fs = require('fs');
const zlib = require('zlib');

function readPNG(file) {
  const buf = fs.readFileSync(file);
  if (!buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new Error('not a PNG');
  let off = 8, ihdr = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.slice(off + 4, off + 8).toString('ascii');
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') ihdr = {
      width: data.readUInt32BE(0), height: data.readUInt32BE(4),
      bitDepth: data[8], colorType: data[9], interlace: data[12],
    };
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.bitDepth !== 8) throw new Error('only 8-bit supported, got ' + ihdr.bitDepth);
  if (ihdr.interlace) throw new Error('interlaced PNG not supported');
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colorType];
  if (!CH) throw new Error('unsupported colorType ' + ihdr.colorType);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = ihdr.width * CH;
  const out = Buffer.alloc(stride * ihdr.height);
  let pos = 0;
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[pos++];
    const line = raw.slice(pos, pos + stride); pos += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= CH ? cur[i - CH] : 0, b = prev[i], c = i >= CH ? prev[i - CH] : 0, x = line[i];
      let v;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break;
        }
        default: throw new Error('bad filter ' + filter);
      }
      cur[i] = v & 0xff;
    }
  }
  return { ...ihdr, channels: CH, pixels: out, stride };
}

function alphaBBox(png, threshold = 16) {
  const { width, height, channels: CH, pixels, stride } = png;
  const hasAlpha = CH === 4 || CH === 2;
  let minX = width, minY = height, maxX = -1, maxY = -1, sumX = 0, sumY = 0, n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * stride + x * CH;
      const a = hasAlpha ? pixels[i + CH - 1] : 255;
      if (a <= threshold) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      sumX += x; sumY += y; n++;
    }
  }
  if (n === 0) return null;
  return {
    minX, minY, maxX, maxY,
    w: maxX - minX + 1, h: maxY - minY + 1,
    bboxCx: (minX + maxX) / 2, bboxCy: (minY + maxY) / 2,
    centroidX: sumX / n, centroidY: sumY / n, opaque: n,
  };
}

for (const f of process.argv.slice(2)) {
  const png = readPNG(f);
  const bb = alphaBBox(png);
  console.log(`${f.split(/[\\/]/).pop()}  ${png.width}x${png.height} colorType=${png.colorType}`);
  if (!bb) { console.log('   (fully transparent)'); continue; }
  console.log(`   opaque bbox  x ${bb.minX}..${bb.maxX} (w ${bb.w}), y ${bb.minY}..${bb.maxY} (h ${bb.h})`);
  console.log(`   bbox centre  ${bb.bboxCx}, ${bb.bboxCy}`);
  console.log(`   centroid     ${bb.centroidX.toFixed(1)}, ${bb.centroidY.toFixed(1)}   (${bb.opaque} px)`);
}
