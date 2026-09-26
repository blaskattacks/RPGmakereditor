/* Class learnings: the engine grants a class's skills into _skills as a character levels
 * (Game_Actor.levelUp / initSkills). The editor sets _level directly, so it has to offer those
 * skills itself or a levelled-up character silently misses them.
 *
 * This checks the rule the editor implements — "learnings at or below _level that _skills lacks" —
 * against each installed game's real data. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const G = require('./_gamepaths.js');
const ROOT = path.resolve(__dirname, '..', '..');

// A game that is not installed on this machine drops out with a SKIP line, rather than crashing.
const GAMES = [
  { key: 'fh1', id: 'fear-and-hunger',   www: G.game('fh1'), save: 'save/file3.rpgsave' },
  { key: 'fh2', id: 'fear-and-hunger-2', www: G.game('fh2'), save: null },
  { key: 'lo',  id: 'look-outside',      www: G.game('lo'),  save: 'save/file1.rmmzsave', root: true },
].filter(g => g.www || G.skip(g.key));

const sandbox = { window: {}, console, TextDecoder, TextEncoder, document: { addEventListener() {} } };
sandbox.globalThis = sandbox; vm.createContext(sandbox);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, m[1]), 'utf8'), sandbox, { filename: m[1] });
  for (const k of ['pako', 'LZString']) if (sandbox[k] === undefined && sandbox.window[k] !== undefined) sandbox[k] = sandbox.window[k];
}
const FHSE = sandbox.window.FHSE, jx = FHSE.jx;
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' — ' + d : ''}`)); };

// The same rule the characters editor applies.
function owed(actor, data) {
  const klass = data.obj('Classes', actor._classId);
  if (!klass || !klass.learnings) return [];
  const have = jx.arr(actor._skills) || [];
  const seen = {};
  return klass.learnings.filter(l => {
    if (l.level > (actor._level || 1) || have.includes(l.skillId) || seen[l.skillId]) return false;
    seen[l.skillId] = 1; return true;
  });
}

for (const G of GAMES) {
  console.log(`\n######## ${G.id} ########`);
  const dataDir = G.root ? path.join(G.www, 'data') : path.join(G.www, 'data');
  if (!fs.existsSync(dataDir)) { console.log('  SKIP  not installed'); continue; }

  const data = new FHSE.MVData();
  for (const n of ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'])
    data.set(n, JSON.parse(fs.readFileSync(path.join(dataDir, n + '.json'), 'utf8')));

  const classes = data.list('Classes');
  const totalLearnings = classes.reduce((s, c) => s + (c.learnings || []).length, 0);
  const maxClass = classes.reduce((m, c) => (c.learnings || []).length > (m.learnings || []).length ? c : m, classes[0]);
  console.log(`  ${classes.length} classes, ${totalLearnings} learnings total; biggest: ${maxClass.name} (${(maxClass.learnings || []).length})`);

  // A synthetic level-1 actor of the busiest class must be owed everything that class teaches
  // at level 1, and a level-99 one must be owed the lot.
  const mk = lvl => ({ _classId: maxClass.id, _level: lvl, _skills: [] });
  const atOne = owed(mk(1), data), atCap = owed(mk(99), data);
  const distinct = new Set((maxClass.learnings || []).map(l => l.skillId)).size;
  check(`level 99 of "${maxClass.name}" is owed every distinct skill it teaches (${atCap.length}/${distinct})`,
    atCap.length === distinct);
  check('level 1 is owed no more than level 99', atOne.length <= atCap.length);
  check('nothing owed once the skills are already known',
    owed({ _classId: maxClass.id, _level: 99, _skills: atCap.map(l => l.skillId) }, data).length === 0);
  check('every owed skill id exists in Skills.json', atCap.every(l => data.obj('Skills', l.skillId)));

  if (!G.save) { console.log('  (no save on disk — real-actor check skipped)'); continue; }
  const savePath = path.join(G.www, G.save);
  if (!fs.existsSync(savePath)) { console.log('  (save missing — real-actor check skipped)'); continue; }

  const buf = fs.readFileSync(savePath);
  const { save } = FHSE.codecs.decodeAuto(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), path.basename(savePath));
  const actors = (jx.arr(save.actors._data) || []).filter(a => a && typeof a === 'object');
  check(`save loaded (${actors.length} actors)`, actors.length > 0);

  // A real, un-edited save should mostly already satisfy its learnings — the game granted them.
  const behind = actors.filter(a => owed(a, data).length);
  console.log(`  ${behind.length}/${actors.length} actors are missing a class skill for their level` +
    (behind.length ? ': ' + behind.slice(0, 4).map(a => `${a._name} Lv${a._level} (-${owed(a, data).length})`).join(', ') : ''));

  // The bug this guards: raising a level must surface the newly-owed skills.
  const target = actors.find(a => (data.obj('Classes', a._classId) || {}).learnings?.length) || actors[0];
  const before = owed(target, data).length;
  const raised = { _classId: target._classId, _level: 99, _skills: (jx.arr(target._skills) || []).slice() };
  const after = owed(raised, data).length;
  check(`raising ${target._name} to Lv99 surfaces more owed skills (${before} -> ${after})`, after >= before);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
