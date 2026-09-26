/* Would this survive being hosted on a real web server?
 *
 * Windows and most Macs have case-insensitive filesystems, so a <script src> whose capitalisation
 * doesn't match the file on disk works locally and 404s the moment it's served from Linux. That
 * class of bug is invisible until deploy, so check it here. Also flags anything that assumes a
 * local filesystem. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0, warn = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' -- ' + d : ''}`)); };
const note = (l) => { warn++; console.log(`  NOTE  ${l}`); };

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// What index.html pulls on every visit. This list alone is the eager payload, below.
const eagerRefs = [
  ...[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]),
  ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m => m[1]),
];
/* The usage indexes are deliberately NOT in index.html — they are appended as <script> at runtime,
 * so a typo or a rename in the loader's own table would 404 only on Linux, and only for the one
 * game whose index it is. Derive them from the loader rather than restating them here. They are
 * case-checked with everything else but must stay OUT of the eager total: fetched per game. */
const lazyRefs = [...fs.readFileSync(path.join(ROOT, 'js', 'usage.js'), 'utf8')
  .matchAll(/'(usage-[^']+\.js)'/g)].map(m => 'js/games/' + m[1]);
const refs = [...eagerRefs, ...lazyRefs];

console.log(`=== every referenced file exists with EXACTLY that capitalisation (${refs.length} refs) ===`);
// Walk the real directory listing so the comparison is byte-exact, not filesystem-normalised.
function realCase(rel) {
  const parts = rel.split('/').filter(Boolean);
  let dir = ROOT;
  for (let i = 0; i < parts.length; i++) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch (e) { return null; }
    const hit = entries.find(e => e === parts[i]);
    if (!hit) return null;
    dir = path.join(dir, hit);
  }
  return dir;
}
const badCase = refs.filter(r => !realCase(r.replace(/[?#].*$/, '')));
check('all script/link paths resolve case-sensitively', badCase.length === 0, badCase.join(', '));

/* GitHub Pages runs Jekyll over the repo unless told not to, and Jekyll silently drops every file
 * and folder whose name starts with an underscore. index.html loads js/games/_shared.js and
 * _generic.js, so without this the hosted copy 404s on two core scripts and the picker comes up
 * empty -- while the local copy works perfectly. Exactly the bug that only shows up after deploy. */
const underscored = refs.filter(r => r.split('/').some(seg => seg.startsWith('_')));
if (underscored.length) {
  check(`.nojekyll exists (${underscored.length} referenced path(s) start with "_")`,
    fs.existsSync(path.join(ROOT, '.nojekyll')), underscored.join(', '));
}

console.log('\n=== nothing shipped to the browser assumes a local filesystem ===');
const shipped = [];
(function collect(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'tools' || e.name === '.claude' || e.name === 'vendor') continue;
    const full = path.join(dir, e.name), r = (rel ? rel + '/' : '') + e.name;
    if (e.isDirectory()) collect(full, r);
    else if (/\.(js|html|css)$/.test(e.name)) shipped.push({ r, full });
  }
})(ROOT, '');

const winPath = [];
for (const f of shipped) {
  const src = fs.readFileSync(f.full, 'utf8');
  // A drive letter or a file:// URL baked into shipped code would break when hosted.
  if (/['"][A-Za-z]:[\\\/]/.test(src)) winPath.push(f.r + ' (drive letter)');
  // A bare "file:///" literal is scheme DETECTION, which is legitimate and needed. Only a literal
  // carrying an actual path after the scheme would break when hosted.
  for (const m of src.matchAll(/['"](file:\/\/[^'"]*)['"]/g)) {
    if (!/^file:\/\/\/?$/.test(m[1])) winPath.push(f.r + ': ' + m[1]);
  }
}
check('no hard-coded drive letters or file:// URLs', winPath.length === 0, winPath.join(', '));

const netUse = [];
for (const f of shipped) {
  const src = fs.readFileSync(f.full, 'utf8');
  for (const m of src.matchAll(/https?:\/\/[^\s'"()]+/g)) {
    // The XML namespace is a constant, not a request.
    if (m[0].indexOf('www.w3.org') !== -1) continue;
    netUse.push(f.r + ': ' + m[0]);
  }
}
check('no external network requests (the privacy claim holds when hosted)', netUse.length === 0, netUse.join(', '));

/* The tools and tests are not shipped to the browser, but a hard-coded absolute path in one is
 * still a bug with two faces: it publishes the author's disk layout, and it means the suite only
 * runs on that one machine. CI caught exactly this — two suites pinned to a D: project root that
 * the Linux runner obviously did not have. _gamepaths.js is the one place allowed to build them. */
console.log('\n=== the tools run on somebody else\'s machine too ===');
const toolFiles = [];
(function collectTools(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = (rel ? rel + '/' : '') + e.name;
    if (e.isDirectory()) collectTools(path.join(dir, e.name), r);
    else if (/\.js$/.test(e.name) && e.name !== '_gamepaths.js') toolFiles.push({ r: 'tools/' + r, full: path.join(dir, e.name) });
  }
})(path.join(ROOT, 'tools'), '');
const pinned = [];
for (const { r, full } of toolFiles) {
  const t = fs.readFileSync(full, 'utf8');
  // A drive letter followed by a slash or backslash, inside a quoted string.
  if (/['"][A-Za-z]:[\\/]/.test(t)) pinned.push(r);
}
check(`no tool or test is pinned to one machine's drive (${toolFiles.length} files)`,
  pinned.length === 0, pinned.join(', '));

console.log('\n=== weight over the wire ===');
let eager = 0, lazy = 0;
for (const r of eagerRefs) { const p = realCase(r); if (p) eager += fs.statSync(p).size; }
for (const f of fs.readdirSync(path.join(ROOT, 'js/games'))) {
  if (/^usage-/.test(f)) lazy += fs.statSync(path.join(ROOT, 'js/games', f)).size;
}
console.log(`  eager (every visit)      ${(eager / 1024).toFixed(0)} KB`);
console.log(`  lazy   (per game opened) ${(lazy / 1024 / 3).toFixed(0)} KB average, ${(lazy / 1024).toFixed(0)} KB total across 3 games`);
check('initial payload is under 1 MB', eager < 1024 * 1024, `${(eager / 1024).toFixed(0)} KB`);

console.log('\n=== behaviour that differs when hosted ===');
const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const modsSrc = fs.readFileSync(path.join(ROOT, 'js/editors/mods.js'), 'utf8');
check('the mods panel copes with not being on file://', /indexOf\('file:\/\/\/'\) !== 0/.test(modsSrc));
check('mods panel tells hosted visitors the tool is not theirs to run',
  /hosted|not available|download|served over http/i.test(modsSrc));
note('IndexedDB is more reliable over https than file:// -- hosting improves the cache, not harms it.');
note('The folder picker (webkitdirectory) also works better over https than from disk.');

console.log(`\n${pass} passed, ${fail} failed, ${warn} note(s)`);
process.exit(fail ? 1 : 0);
