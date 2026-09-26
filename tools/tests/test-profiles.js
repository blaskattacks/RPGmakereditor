/* Harness: load every script index.html loads, in that exact order, and check the registry.
 * Catches load-order mistakes, duplicate ids, and malformed profiles before they hit a browser. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

const sandbox = { window: {}, console, TextDecoder, TextEncoder, document: { addEventListener() {} } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// Read the real script order out of index.html rather than duplicating it here — that way this
// test fails if a new profile file is added without a <script> tag.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
console.log(`index.html loads ${scripts.length} scripts\n`);

let pass = 0, fail = 0;
const check = (label, ok, detail) => {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); }
};

for (const rel of scripts) {
  try {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
    for (const k of ['pako', 'LZString']) {
      if (sandbox[k] === undefined && sandbox.window[k] !== undefined) sandbox[k] = sandbox.window[k];
    }
  } catch (e) {
    console.log(`  FAIL  loading ${rel} — ${e.message}`);
    fail++;
  }
}

const FHSE = sandbox.window.FHSE;
const games = FHSE.games.all();
console.log(`\n=== registry: ${games.length} profiles ===`);

/* Every profile file on disk should be registered — no orphan files missing a <script> tag.
 * usage-*.js are the exception on purpose: they total ~760KB and are injected lazily by
 * js/usage.js for the game actually being edited, so they must NOT be in index.html.
 * test-usage.js asserts the other half of that rule. */
const LAZY = /^usage-/;
const onDisk = fs.readdirSync(path.join(ROOT, 'js/games')).filter(f => f.endsWith('.js') && !LAZY.test(f));
const tagged = scripts.filter(s => s.startsWith('js/games/')).map(s => path.basename(s));
check(`every eagerly-loaded js/games file is in index.html (${onDisk.length} files)`,
  onDisk.every(f => tagged.includes(f)),
  'missing: ' + onDisk.filter(f => !tagged.includes(f)).join(', '));
check('lazily-loaded usage files are kept out of index.html',
  !tagged.some(f => LAZY.test(f)), tagged.filter(f => LAZY.test(f)).join(', '));

const ids = games.map(g => g.id);
check('no duplicate profile ids', new Set(ids).size === ids.length);

for (const g of games) {
  const problems = [];
  if (!g.title) problems.push('no title');
  if (!['rpgmv', 'rpgmz'].includes(g.engine)) problems.push(`bad engine "${g.engine}"`);
  if (!Array.isArray(g.requiredData) || !g.requiredData.length) problems.push('no requiredData');
  if (!Array.isArray(g.stateGroups) || !g.stateGroups.length) problems.push('no stateGroups');
  if (typeof g.verified !== 'boolean') problems.push('verified not boolean');
  if (g.detect && typeof g.detect !== 'function') problems.push('detect not a function');
  // Every stateGroup must actually be callable against a state object.
  for (const grp of (g.stateGroups || [])) {
    if (typeof grp.match !== 'function' || !grp.name) { problems.push('bad stateGroup'); break; }
    try { grp.match({ name: 'Bleeding' }); } catch (e) { problems.push('stateGroup threw: ' + e.message); break; }
  }
  const flag = g.verified ? 'TESTED  ' : (g.generic ? 'GENERIC ' : 'SKELETON');
  check(`${flag} ${g.id} (${g.engine}, ext ${g.saveExt || '.rpgsave'})`, problems.length === 0, problems.join('; '));
}

// The three profiles that were round-tripped against real saves must stay marked verified.
console.log('\n=== verification status ===');
const verified = games.filter(g => g.verified).map(g => g.id).sort();
check('exactly the 3 tested games are verified',
  JSON.stringify(verified) === JSON.stringify(['fear-and-hunger', 'fear-and-hunger-2', 'look-outside']),
  verified.join(', '));

// detect() must not fire for the wrong game — a cheap guard against over-broad regexes.
console.log('\n=== detect() cross-check ===');
const titles = {
  'fear-and-hunger': 'Fear & Hunger', 'fear-and-hunger-2': 'Fear & Hunger 2: Termina',
  'look-outside': 'Look Outside', 'omori': 'OMORI', 'little-one': 'Little One',
  'coffin-andy-leyley': 'The Coffin of Andy and Leyley', 'witchs-house-mv': "The Witch's House MV",
  'ib': 'Ib',
};

// Titles that belong to no profile here. A detect() firing on one of these is too greedy —
// it would silently mislabel an unrelated game as a supported one.
// ("Ib and the Forgotten Portrait" is deliberately NOT here — Forgotten Portrait is Ib's own
// ending/theme, so a title starting with "Ib " is that game, and matching it is correct.)
const DECOYS = ['Ibb & Obb', 'Bibliophile', 'Calibration', 'Ao Oni',
  'The Witch of the Woods', 'Omorashi Quest', 'Little Nightmares', 'Corpse Party'];
for (const [id, title] of Object.entries(titles)) {
  const g = FHSE.games.get(id);
  if (!g || !g.detect) continue;
  check(`${id}.detect() matches its own title`, g.detect({ gameTitle: () => title }));
  const falsePositives = Object.entries(titles)
    .filter(([oid, ot]) => oid !== id && g.detect({ gameTitle: () => ot }))
    .map(([oid]) => oid);
  check(`${id}.detect() rejects other games`, falsePositives.length === 0, 'also matched: ' + falsePositives.join(', '));
  const decoyHits = DECOYS.filter(t => g.detect({ gameTitle: () => t }));
  check(`${id}.detect() rejects decoy titles`, decoyHits.length === 0, 'matched: ' + decoyHits.join(' | '));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
