/* Decrypt RPG Maker MV .rpgmvp assets.
 *
 * Format: a 16-byte header ("RPGMV" + version/reserved), then the real file — whose FIRST 16
 * bytes have been XORed with the 16-byte encryption key from System.json. Everything after
 * byte 32 is untouched. So: drop the header, XOR 16 bytes back, done.
 */
const fs = require('fs');
const path = require('path');
const G = require('./tests/_gamepaths.js');

const FH = process.argv[2] || G.game('fh1');
const OUT = process.argv[3] || path.join(require('os').tmpdir(), 'savedelver-hexen');
const FILTER = process.argv[4] || '^the_hexen';

const sys = JSON.parse(fs.readFileSync(path.join(FH, 'data/System.json'), 'utf8'));
const key = Buffer.from(sys.encryptionKey, 'hex');
console.log(`key ${sys.encryptionKey} (${key.length} bytes)`);

function decrypt(buf) {
  if (buf.slice(0, 5).toString('ascii') !== 'RPGMV') return buf; // not encrypted after all
  const body = Buffer.from(buf.slice(16));                        // drop the RPGMV header
  for (let i = 0; i < 16 && i < body.length; i++) body[i] ^= key[i % key.length];
  return body;
}

fs.mkdirSync(OUT, { recursive: true });
const dir = path.join(FH, 'img/pictures');
const re = new RegExp(FILTER);
let n = 0, bad = 0;
for (const f of fs.readdirSync(dir)) {
  if (!re.test(f) || !f.endsWith('.rpgmvp')) continue;
  const out = decrypt(fs.readFileSync(path.join(dir, f)));
  // A valid PNG starts with the 8-byte signature.
  const ok = out.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!ok) { bad++; console.log(`  !! ${f} did not decode to a PNG (starts ${out.slice(0, 8).toString('hex')})`); continue; }
  // Read the IHDR for dimensions.
  const w = out.readUInt32BE(16), h = out.readUInt32BE(20);
  fs.writeFileSync(path.join(OUT, f.replace(/\.rpgmvp$/, '.png')), out);
  console.log(`  ok ${f.replace(/\.rpgmvp$/, '').padEnd(34)} ${w}x${h}`);
  n++;
}
console.log(`\n${n} decrypted to ${OUT}${bad ? `, ${bad} failed` : ''}`);
