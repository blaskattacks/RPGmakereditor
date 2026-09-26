/* Harness: load SaveDelver's real browser modules under Node and round-trip actual saves.
 * Verifies codec auto-detection picks the right engine and that encode(decode(x)) is faithful. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const G = require('./_gamepaths.js');

const ROOT = 'D:/Local AI/claude/fearandhunger';

// Minimal browser shims the modules touch at load time.
const sandbox = {
  window: {}, console,
  TextDecoder, TextEncoder, Uint8Array, Math, JSON, Object, Array, Error, RegExp, String, Number,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

// vendored compressors, then the app modules under test
load('js/vendor/lz-string.js');
load('js/vendor/pako.min.js');
// In a browser, `window` IS the global, so a UMD assigning window.pako makes bare `pako`
// resolvable. The vm sandbox separates the two, so mirror the globals across by hand.
for (const k of ['pako', 'LZString']) {
  if (sandbox[k] === undefined && sandbox.window[k] !== undefined) sandbox[k] = sandbox.window[k];
}
load('js/util.js');        // creates window.FHSE
load('js/jsonex.js');
load('js/rpgsave.js');

const FHSE = sandbox.window.FHSE;

// A .rpgsave is ASCII text; a .rmmzsave is the UTF-8 encoding of a binary string. Reading the
// raw file bytes into an ArrayBuffer is exactly what FileReader.readAsArrayBuffer gives the app.
function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const CASES = [
  { engine: 'rpgmv', file: G.game('fh1') + '/save/file1.rpgsave' },
  { engine: 'rpgmv', file: G.game('fh1') + '/save/file3.rpgsave' },
  { engine: 'rpgmz', file: G.game('lo') + '/save/file1.rmmzsave' },
  { engine: 'rpgmz', file: G.game('lo') + '/save/file10.rmmzsave' },
];

let pass = 0, fail = 0;
function check(label, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); }
}

for (const c of CASES) {
  const name = path.basename(c.file);
  console.log(`\n=== ${name} (expect ${c.engine}) ===`);
  if (!fs.existsSync(c.file)) { console.log('  SKIP  missing'); continue; }
  const ab = toArrayBuffer(fs.readFileSync(c.file));

  // 1. Detection with no hint at all — the hard case a skeleton profile creates.
  let got;
  try { got = FHSE.codecs.decodeAuto(ab, name, undefined); }
  catch (e) { check('decodeAuto', false, e.message); continue; }
  check(`detected ${got.codec.id}`, got.codec.id === c.engine, `got ${got.codec.id}`);

  // 2. Detection when the profile hint is DELIBERATELY WRONG — the whole point of the change.
  const wrongHint = c.engine === 'rpgmv' ? 'rpgmz' : 'rpgmv';
  let got2;
  try { got2 = FHSE.codecs.decodeAuto(ab, name, wrongHint); }
  catch (e) { check(`survives wrong hint (${wrongHint})`, false, e.message); continue; }
  check(`survives wrong profile hint (${wrongHint})`, got2.codec.id === c.engine, `got ${got2.codec.id}`);

  // 3. Detection with NO filename either — pure byte sniffing.
  let got3;
  try { got3 = FHSE.codecs.decodeAuto(ab, '', undefined); }
  catch (e) { check('byte-sniff without filename', false, e.message); continue; }
  check('byte-sniff without filename', got3.codec.id === c.engine, `got ${got3.codec.id}`);

  // 4. Shape sanity.
  const save = got.save;
  const actors = FHSE.jx.arr(save.actors && save.actors._data) || [];
  const nActors = actors.filter(a => a && typeof a === 'object').length;
  check(`looks like a save (${nActors} actors, gold ${save.party && save.party._gold})`, nActors > 0);

  // 5. Round-trip: re-encode and decode again; the JSON must be identical.
  const reencoded = got.codec.encode(save);
  // Blob([str]) UTF-8-encodes, which is what the download does — mirror that here.
  const outBuf = Buffer.from(reencoded, 'utf8');
  let back;
  try { back = FHSE.codecs.decodeAuto(toArrayBuffer(outBuf), name, undefined); }
  catch (e) { check('round-trip decodes', false, e.message); continue; }
  check('round-trip decodes', true);
  check('round-trip is byte-identical JSON',
    JSON.stringify(back.save) === JSON.stringify(save));

  // 6. An edit survives the round-trip.
  save.party._gold = 12345;
  const edited = Buffer.from(got.codec.encode(save), 'utf8');
  const back2 = FHSE.codecs.decodeAuto(toArrayBuffer(edited), name, undefined);
  check('edit survives round-trip', back2.save.party._gold === 12345, `got ${back2.save.party._gold}`);
}

// 7. Garbage must be rejected, not silently "detected".
console.log('\n=== rejection of non-saves ===');
for (const [label, bytes] of [
  ['random bytes', Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe])],
  ['plain text', Buffer.from('hello world, not a save', 'utf8')],
  ['valid JSON but not a save', Buffer.from(JSON.stringify({ hello: 'world' }), 'utf8')],
  ['empty', Buffer.alloc(0)],
]) {
  let threw = false;
  try { FHSE.codecs.decodeAuto(toArrayBuffer(bytes), 'x.rpgsave', undefined); }
  catch (e) { threw = true; }
  check(`rejects ${label}`, threw);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
