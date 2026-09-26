/* Regression test for the extracted hexen tables (both games): every node must point at a real
 * skill or parameter, a real purchase switch, prerequisites that resolve to other nodes, and
 * coordinates on the board. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const G = require('./_gamepaths.js');
const ROOT = path.resolve(__dirname, '..', '..');

const GAMES = [
  { id: 'fear-and-hunger',   www: G.game('fh1'),            expect: 26 },
  { id: 'fear-and-hunger-2', www: G.game('fh2'),  expect: 104 },
];

const sandbox = { window: {}, console, TextDecoder, TextEncoder, document: { addEventListener() {} } };
sandbox.globalThis = sandbox; vm.createContext(sandbox);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, m[1]), 'utf8'), sandbox, { filename: m[1] });
  for (const k of ['pako', 'LZString']) if (sandbox[k] === undefined && sandbox.window[k] !== undefined) sandbox[k] = sandbox.window[k];
}
const FHSE = sandbox.window.FHSE;
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' — ' + d : ''}`)); };

for (const G of GAMES) {
  console.log(`\n######## ${G.id} ########`);
  const T = (FHSE.hexen || {})[G.id];
  check('hexen table registered', !!T);
  if (!T) continue;
  if (!fs.existsSync(G.www)) { console.log('  SKIP  game not installed, data checks skipped'); continue; }

  const Skills = JSON.parse(fs.readFileSync(`${G.www}/data/Skills.json`, 'utf8'));
  const Sys = JSON.parse(fs.readFileSync(`${G.www}/data/System.json`, 'utf8'));

  check(`${G.expect} nodes`, T.nodes.length === G.expect, String(T.nodes.length));
  check('board dimensions positive', T.board.w > 0 && T.board.h > 0);

  // Every node grants something real.
  const bad = T.nodes.filter(n => {
    if (n.skillId != null) return !Skills[n.skillId] || !Skills[n.skillId].name;
    return !n.param || n.param.id == null || !n.param.amount;
  });
  check('every node grants a real skill or parameter', bad.length === 0, bad.map(n => n.name || n.i).join(', '));

  const nameMismatch = T.nodes.filter(n => n.skillId != null && Skills[n.skillId].name !== n.skill);
  check('cached skill names match Skills.json', nameMismatch.length === 0,
    nameMismatch.map(n => `${n.i}: "${n.skill}" vs "${Skills[n.skillId].name}"`).join('; '));

  const badSw = T.nodes.filter(n => n.sw == null || Sys.switches[n.sw] !== n.swName);
  check('every node has a purchase switch matching System.json', badSw.length === 0,
    badSw.map(n => n.name || n.i).join(', '));

  // Structure.
  const ids = T.nodes.map(n => n.i);
  check('node keys unique', new Set(ids).size === ids.length);
  const bySw = {}; T.nodes.forEach(n => { bySw[n.sw] = n; });
  const dangling = T.nodes.flatMap(n => (n.pre || []).filter(p => !bySw[p]).map(p => `${n.name || n.i}->${Sys.switches[p] || p}`));
  check('every prerequisite resolves to another node', dangling.length === 0, dangling.join(', '));
  const selfPre = T.nodes.filter(n => (n.pre || []).includes(n.sw));
  check('no node is its own prerequisite', selfPre.length === 0, selfPre.map(n => n.name || n.i).join(', '));

  let cyclic = [];
  for (const n of T.nodes) {
    const seen = new Set(); const stack = [n];
    while (stack.length) {
      const cur = stack.pop();
      for (const p of (cur.pre || [])) {
        const pn = bySw[p]; if (!pn) continue;
        if (pn.i === n.i) { cyclic.push(n.name || n.i); stack.length = 0; break; }
        if (!seen.has(pn.i)) { seen.add(pn.i); stack.push(pn); }
      }
    }
  }
  check('prerequisite graph is acyclic', cyclic.length === 0, cyclic.join(', '));

  // Geometry — labels and click targets are placed from these.
  const margin = 12;
  const off = T.nodes.filter(n => n.x < margin || n.x > T.board.w - margin || n.y < margin || n.y > T.board.h - margin);
  check('all nodes sit inside the board', off.length === 0, off.map(n => `${n.name || n.i}@${n.x},${n.y}`).join(', '));
  let tooClose = [];
  for (let i = 0; i < T.nodes.length; i++) for (let j = i + 1; j < T.nodes.length; j++) {
    const a = T.nodes[i], c = T.nodes[j];
    if (Math.hypot(a.x - c.x, a.y - c.y) < 20) tooClose.push(`${a.name || a.i}/${c.name || c.i}`);
  }
  check('no two nodes share a click target', tooClose.length === 0, tooClose.join(', '));

  // Game-specific extras.
  if (G.id === 'fear-and-hunger') {
    check('8 octagon hubs', (T.hubs || []).length === 8, String((T.hubs || []).length));
    check('indices are branch-major', JSON.stringify(T.nodes.map(n => n.i).sort((a, b) => a - b)) ===
      JSON.stringify([1,2,3,4,11,12,13,14,21,22,23,24,25,31,32,33,41,42,51,52,53,61,62,63,64,65]));
    const souls = new Set(T.nodes.map(n => n.soul));
    check('exactly 4 soul branches', souls.size === 4, [...souls].join(', '));
  }
  if (G.id === 'fear-and-hunger-2') {
    const params = T.nodes.filter(n => n.param);
    check(`${params.length} parameter nodes, all with a known param id`,
      params.length > 0 && params.every(n => n.param.id >= 0 && n.param.id < 8));
    const gated = T.nodes.filter(n => n.gateVar != null);
    check('affliction gates present and named', gated.length > 0 &&
      gated.every(n => Sys.variables[n.gateVar] === n.gateVarName && n.gateValue > 0), String(gated.length));
    const learns = T.nodes.filter(n => n.learnsVar != null);
    check('learns_ variables match System.json', learns.every(n => Sys.variables[n.learnsVar] === n.learnsVarName),
      String(learns.length));
    check('soul item resolves', T.soulItem != null);
    // Every node must be reachable from a root, or it could never be bought in-game.
    const roots = T.nodes.filter(n => !(n.pre || []).length).map(n => n.sw);
    const reach = new Set(roots);
    for (let pass2 = 0; pass2 < T.nodes.length; pass2++) {
      for (const n of T.nodes) if (!reach.has(n.sw) && (n.pre || []).every(p => reach.has(p))) reach.add(n.sw);
    }
    const unreachable = T.nodes.filter(n => !reach.has(n.sw));
    check('every node is reachable from a root', unreachable.length === 0,
      unreachable.map(n => n.name).join(', '));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
