/* The usage index is what stands in for the notes RPG Maker never stores on switches and
 * variables, so it has to point at real ids and real places. These files are loaded lazily by the
 * app (they total ~760KB), so this test loads them explicitly rather than via index.html. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const G = require('./_gamepaths.js');
const ROOT = path.resolve(__dirname, '..', '..');

// A game that is not installed on this machine drops out with a SKIP line, rather than crashing.
const GAMES = [
  { key: 'fh1', id: 'fear-and-hunger',   file: 'usage-fh1.js', www: G.game('fh1') },
  { key: 'fh2', id: 'fear-and-hunger-2', file: 'usage-fh2.js', www: G.game('fh2') },
  { key: 'lo',  id: 'look-outside',      file: 'usage-lo.js',  www: G.game('lo') },
].filter(g => g.www || G.skip(g.key));

const sandbox = { window: {}, console, TextDecoder, TextEncoder, document: { addEventListener() {}, head: { appendChild() {} }, createElement: () => ({}) } };
sandbox.globalThis = sandbox; vm.createContext(sandbox);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, m[1]), 'utf8'), sandbox, { filename: m[1] });
  for (const k of ['pako', 'LZString']) if (sandbox[k] === undefined && sandbox.window[k] !== undefined) sandbox[k] = sandbox.window[k];
}
const FHSE = sandbox.window.FHSE;
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' — ' + d : ''}`)); };

check('usage helper is registered', !!(FHSE.usageInfo && FHSE.usageInfo.load && FHSE.usageInfo.summary));
check('usage files are NOT eagerly loaded by index.html',
  ![...html.matchAll(/<script src="([^"]+)"><\/script>/g)].some(m => /usage-/.test(m[1])));

for (const G of GAMES) {
  console.log(`\n######## ${G.id} ########`);
  const p = path.join(ROOT, 'js/games', G.file);
  if (!fs.existsSync(p)) { check(`${G.file} exists`, false); continue; }
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: G.file });
  const U = (FHSE.usage || {})[G.id];
  check(`${G.file} registers under "${G.id}"`, !!U);
  if (!U) continue;

  const kb = (fs.statSync(p).size / 1024).toFixed(0);
  const nv = Object.keys(U.vars).length, ns = Object.keys(U.switches).length;
  console.log(`  ${kb} KB · ${nv} variables, ${ns} switches, ${U.places.length} places`);
  check('has entries for both kinds', nv > 0 && ns > 0);

  if (!fs.existsSync(path.join(G.www, 'data/System.json'))) { console.log('  SKIP  game not installed'); continue; }
  const Sys = JSON.parse(fs.readFileSync(path.join(G.www, 'data/System.json'), 'utf8'));

  // Every indexed id must be a real, named slot in that game.
  const badV = Object.keys(U.vars).filter(id => !Sys.variables[id]);
  const badS = Object.keys(U.switches).filter(id => !Sys.switches[id]);
  check('every indexed variable id is a named variable', badV.length === 0, badV.slice(0, 5).join(', '));
  check('every indexed switch id is a named switch', badS.length === 0, badS.slice(0, 5).join(', '));

  // Place references must resolve.
  const maxPlace = U.places.length - 1;
  const badRef = [];
  for (const [id, r] of Object.entries(U.vars)) for (const i of r.at || []) if (i < 0 || i > maxPlace) badRef.push('var' + id);
  for (const [id, r] of Object.entries(U.switches)) for (const i of r.at || []) if (i < 0 || i > maxPlace) badRef.push('sw' + id);
  check('every place reference resolves', badRef.length === 0, badRef.slice(0, 5).join(', '));
  check('no place name is empty', U.places.every(s => typeof s === 'string' && s.length));

  // An entry that claims usage must actually carry counts.
  const hollow = Object.entries(U.vars).filter(([, r]) => !r.w && !r.t && !r.s);
  check('no variable entry is hollow', hollow.length === 0, hollow.slice(0, 5).map(x => x[0]).join(', '));

  // The summary helper must produce something for a real entry and cope with an unknown one.
  const someVar = Object.keys(U.vars)[0];
  check('summary() works for a known variable', /\d/.test(FHSE.usageInfo.summary(G.id, 'variable', Number(someVar))));
  check('summary() copes with an unindexed id', typeof FHSE.usageInfo.summary(G.id, 'variable', 999999) === 'string');
}

/* The point of the whole exercise: an opaque name should become legible. F&H's HUNGER_MERC has no
 * note anywhere in the game, but its comparisons are the hunger-level breakpoints. */
console.log('\n######## it actually explains something ########');
const U1 = (FHSE.usage || {})['fear-and-hunger'];
if (U1 && fs.existsSync(G.game('fh1') + '/data/System.json')) {
  const Sys = JSON.parse(fs.readFileSync(G.game('fh1') + '/data/System.json', 'utf8'));
  const id = Sys.variables.findIndex(n => n === 'HUNGER_MERC');
  const rec = U1.vars[id];
  check(`HUNGER_MERC (#${id}) is indexed`, !!rec);
  if (rec) {
    const nums = (rec.cmp || []).map(c => Number(c.split(' ')[1])).filter(n => !isNaN(n));
    check('its comparisons expose the hunger breakpoints (63, 68, 78, 88, 108)',
      [63, 68, 78, 88, 108].every(v => nums.includes(v)), nums.join(', '));
    check('it names the common events that drive it',
      (rec.at || []).map(i => U1.places[i]).some(p => /HUNGER LEVELS_Mercenary/.test(p)));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
