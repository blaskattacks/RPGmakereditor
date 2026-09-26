/* extract-hexen-termina.js — rebuild Fear & Hunger 2: Termina's hexen tree.
 *
 * Termina models the hexen completely differently from F&H1, so this is a separate extractor
 * rather than a flag on the other one:
 *
 *   F&H1  one navigator event moves a cursor picture between 26 hard-coded screen positions,
 *         keyed by the HEXEN_cursor variable.
 *   F&H2  a whole MAP ("hexen", Map031) with ONE EVENT PER NODE. The node's position is the
 *         event's own grid position, so there is no cursor variable and no plate order to align.
 *
 * Each node event runs: gate condition -> "spend a Lesser soul?" (an item check) -> pick which
 * party member gets it -> either LEARN a skill or CHANGE a parameter -> set that node's SKILL_*
 * switch, and (for skill nodes) record the chosen actor in a `learns_<node>` variable.
 *
 * That last part matters for editing: Termina remembers WHO bought each node, so granting a node
 * properly means writing the skill, the switch, and the learns_ variable.
 *
 *   node tools/extract-hexen-termina.js "<game>/www" <outJs>
 */
const fs = require('fs');
const path = require('path');
const G = require('./tests/_gamepaths.js');

const WWW = process.argv[2] || G.game('fh2');
const OUT = process.argv[3] || path.join(__dirname, '..', 'js', 'games', 'hexen-fh2.js');
const DATA = path.join(WWW, 'data');

const Skills = JSON.parse(fs.readFileSync(path.join(DATA, 'Skills.json'), 'utf8'));
const Items = JSON.parse(fs.readFileSync(path.join(DATA, 'Items.json'), 'utf8'));
const Sys = JSON.parse(fs.readFileSync(path.join(DATA, 'System.json'), 'utf8'));
const Infos = JSON.parse(fs.readFileSync(path.join(DATA, 'MapInfos.json'), 'utf8'));
const swName = i => Sys.switches[i] || ('switch' + i);
const varName = i => Sys.variables[i] || ('var' + i);
const PARAM = ['Max HP', 'Max MP', 'Attack', 'Defense', 'M.Attack', 'M.Defense', 'Agility', 'Luck'];

// ---- locate the hexen map: the one whose events draw hexen_* pictures ----
const HEX = /^hexen[_-]/i;
let best = null;
for (const f of fs.readdirSync(DATA).filter(n => /^Map\d+\.json$/.test(n))) {
  const json = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  let hits = 0;
  for (const ev of (json.events || []).filter(Boolean))
    for (const pg of ev.pages || []) for (const c of pg.list || [])
      if (c.code === 231 && typeof (c.parameters || [])[1] === 'string' && HEX.test(c.parameters[1])) { hits++; break; }
  if (hits && (!best || hits > best.hits)) best = { file: f, id: Number(f.match(/\d+/)[0]), json, hits };
}
if (!best) { console.error('no hexen map found'); process.exit(1); }
const info = Infos.filter(Boolean).find(i => i.id === best.id);
console.log(`hexen map: ${best.file} "${(info && info.name) || '?'}" — grid ${best.json.width}x${best.json.height}, ${best.hits} node events`);

/* Conditions that are part of the "who gets it?" menu rather than the tree's gating. Every node
 * fans out over party size and the chosen member, so those must not be read as prerequisites. */
/* Most nodes record the purchase in a SKILL_* switch, but three gun skills use a
 * <Name>AVAILABLE switch instead. Both mean the same thing: this node has been bought. */
const PURCHASE_SW = /(^SKILL_|AVAILABLE$)/i;
const MENU_VAR = /^(PartySize|Party_Member|learns_)/i;

function condOf(p) {
  if (p[0] === 0) return { kind: 'switch', id: p[1], on: p[2] === 0 };
  if (p[0] === 1 && p[2] === 0) return { kind: 'var', id: p[1], op: p[4], value: p[3] };
  if (p[0] === 8) return { kind: 'item', id: p[1] };
  return { kind: 'other' };
}

/* Walk a page tracking the enclosing IF stack, so we can ask what guarded a given command.
 * ELSE keeps the nesting depth; only END pops. */
function walkPage(list, onCmd) {
  const stack = [];
  for (const c of list) {
    const p = c.parameters || [];
    if (c.code === 111) { stack.push(condOf(p)); continue; }
    if (c.code === 412) { stack.pop(); continue; }
    if (c.code === 411) continue;
    onCmd(c, p, stack);
  }
}

// ---- read one node event ----
function readNode(ev) {
  const n = {
    ev: ev.id, name: ev.name, gx: ev.x, gy: ev.y,
    img: null, skillId: null, param: null, sw: null, learnsVar: null,
    prereqSw: [], prereqVar: null, soulItem: null, actors: new Set(),
    swSets: [], fallbackGates: null,
  };
  for (const pg of ev.pages || []) {
    const list = pg.list || [];
    for (const c of list) {
      const p = c.parameters || [];
      if (c.code === 231 && typeof p[1] === 'string' && HEX.test(p[1]) && !n.img) n.img = p[1];
    }
    if (!list.some(c => c.code === 318 || c.code === 317)) continue;   // not the interactive page

    /* Anchor the gates on the command that records the purchase — the node's own SKILL_* switch
     * being turned ON. Whatever IFs enclose that are exactly the conditions the game requires,
     * which the naive "first conditional on the page" reading got wrong (it picked up the
     * PartySize branch). A few nodes set no switch; fall back to the grant itself. */
    /* A node can set MORE THAN ONE purchase switch: Termina inherited F&H1's switch list, so
     * several nodes flip a legacy SKILL_* alongside their real one (the lockpicking node sets
     * both SKILL_Lockpicking, F&H1's, and SKILL_lockpicking, the one Termina's tree tests).
     * Record every candidate with the gates that guarded it and choose later, once we know which
     * switches other nodes actually depend on. */
    walkPage(list, (c, p, stack) => {
      if (c.code === 121 && p[2] === 0 && PURCHASE_SW.test(swName(p[0]))) {
        if (!n.swSets.some(s => s.id === p[0])) n.swSets.push({ id: p[0], gates: stack.slice() });
      }
    });
    let gates = n.swSets.length ? n.swSets[0].gates : null;
    if (!gates) {
      walkPage(list, (c, p, stack) => {
        if (gates) return;
        if ((c.code === 318 && p[2] === 0) || c.code === 317) gates = stack.slice();
      });
    }
    n.fallbackGates = gates;
    for (const g of gates || []) {
      if (g.kind === 'item' && n.soulItem == null) n.soulItem = g.id;
      else if (g.kind === 'switch' && g.on && PURCHASE_SW.test(swName(g.id)) && g.id !== n.sw) n.prereqSw.push(g.id);
      else if (g.kind === 'var' && !MENU_VAR.test(varName(g.id)) && !n.prereqVar) {
        n.prereqVar = { id: g.id, op: g.op, value: g.value };
      }
    }

    walkPage(list, (c, p) => {
      if (c.code === 318 && p[2] === 0) { if (!n.skillId) n.skillId = p[3]; if (p[0] === 0) n.actors.add(p[1]); }
      if (c.code === 317 && !n.param) { n.param = { id: p[2], plus: p[3] === 0, amount: p[5] }; if (p[0] === 0) n.actors.add(p[1]); }
      if (c.code === 122 && /^learns_/i.test(varName(p[0])) && !n.learnsVar) n.learnsVar = p[0];
    });
  }
  n.prereqSw = [...new Set(n.prereqSw)];
  return n;
}

const nodes = [];
for (const ev of (best.json.events || []).filter(Boolean)) {
  const hasHexPic = (ev.pages || []).some(pg => (pg.list || []).some(c =>
    c.code === 231 && typeof (c.parameters || [])[1] === 'string' && HEX.test(c.parameters[1])));
  if (!hasHexPic) continue;
  const n = readNode(ev);
  if (!n.skillId && !n.param) continue;   // decorative / banner events
  nodes.push(n);
}

/* ---- resolve which switch each node's purchase really is ----
 *
 * Nodes that flip several SKILL_* switches need one picked as *the* purchase flag. Preference:
 *   1. a switch another node lists as a prerequisite — the tree itself tells us which one counts
 *   2. otherwise the switch whose name best matches the event's own name
 *   3. otherwise the first one set
 * Getting this wrong leaves dangling prerequisites and unreachable nodes, which the test catches. */
const referenced = new Set();
for (const n of nodes) for (const id of n.prereqSw) referenced.add(id);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

let retargeted = 0;
for (const n of nodes) {
  if (n.swSets.length <= 1) { n.sw = n.swSets.length ? n.swSets[0].id : n.sw; continue; }
  const cands = n.swSets;
  let pick = cands.find(c => referenced.has(c.id));
  if (!pick) {
    const want = norm(n.name);
    pick = cands.find(c => norm(swName(c.id).replace(/^SKILL_/i, '')) === want)
        || cands.find(c => norm(swName(c.id).replace(/^SKILL_/i, '')).includes(want) && want.length > 3);
  }
  pick = pick || cands[0];
  if (n.sw !== pick.id) {
    retargeted++;
    n.sw = pick.id;
    // Re-read the gates from the chosen switch's own position in the event.
    n.prereqSw = []; n.prereqVar = null;
    for (const g of pick.gates || n.fallbackGates || []) {
      if (g.kind === 'item' && n.soulItem == null) n.soulItem = g.id;
      else if (g.kind === 'switch' && g.on && PURCHASE_SW.test(swName(g.id)) && g.id !== n.sw) n.prereqSw.push(g.id);
      else if (g.kind === 'var' && !MENU_VAR.test(varName(g.id)) && !n.prereqVar) n.prereqVar = { id: g.id, op: g.op, value: g.value };
    }
    n.prereqSw = [...new Set(n.prereqSw)];
  }
}
const multi = nodes.filter(n => n.swSets.length > 1);
if (multi.length) {
  console.log(`\n${multi.length} node(s) flip more than one purchase switch (legacy F&H1 names alongside Termina's);`);
  console.log(`  ${retargeted} retargeted to the switch the tree actually depends on:`);
  multi.filter(n => n.swSets.length > 1).slice(0, 8).forEach(n =>
    console.log(`    ${n.name.padEnd(18)} sets ${n.swSets.map(s => swName(s.id)).join(' + ')}  ->  ${swName(n.sw)}`));
}

// ---- report ----
const withSkill = nodes.filter(n => n.skillId), withParam = nodes.filter(n => n.param);
console.log(`\n${nodes.length} usable nodes: ${withSkill.length} grant a skill, ${withParam.length} raise a parameter`);
const noSw = nodes.filter(n => !n.sw);
if (noSw.length) console.log(`!! ${noSw.length} without a SKILL_* switch: ${noSw.map(n => n.name).join(', ')}`);
// Only 17 learns_ variables exist game-wide, so most nodes simply do not track a buyer.
  const noLearns = withSkill.filter(n => !n.learnsVar);
console.log(`   ${withSkill.length - noLearns.length} of ${withSkill.length} skill nodes record the buyer in a learns_ variable (the game only defines 17)`);
const soul = [...new Set(nodes.map(n => n.soulItem).filter(v => v != null))];
console.log(`   soul item(s) checked: ${soul.map(i => `#${i} ${(Items[i] || {}).name}`).join(', ') || '(none found)'}`);

// Duplicate positions would collide on the board; duplicate skills are legitimate (two routes).
const seen = {};
const dupPos = [];
for (const n of nodes) { const k = n.gx + ',' + n.gy; if (seen[k]) dupPos.push(`${n.name}/${seen[k]} @${k}`); seen[k] = n.name; }
if (dupPos.length) console.log(`!! duplicate grid positions: ${dupPos.join('; ')}`);

console.log('\n gx  gy  name                  skill / parameter               switch                        prereq');
console.log('-'.repeat(126));
for (const n of nodes.slice().sort((a, b) => a.gy - b.gy || a.gx - b.gx)) {
  const grant = n.skillId ? `#${n.skillId} ${(Skills[n.skillId] || {}).name}`
                          : `${PARAM[n.param.id]} ${n.param.plus ? '+' : '-'}${n.param.amount}`;
  const pre = n.prereqSw.length ? swName(n.prereqSw[0])
            : n.prereqVar ? `${varName(n.prereqVar.id)} >= ${n.prereqVar.value}` : '-';
  console.log(`${String(n.gx).padStart(3)} ${String(n.gy).padStart(3)}  ${String(n.name).padEnd(21)} ${grant.padEnd(31)} ${String(n.sw ? swName(n.sw) : '-').padEnd(29)} ${pre}`);
}

// ---- emit ----
const TILE = 48;                       // MV's tile size; grid -> pixel centres
const out = {
  board: { w: best.json.width * TILE, h: best.json.height * TILE, tile: TILE },
  mapId: best.id,
  soulItem: soul[0] != null ? soul[0] : null,
  nodes: nodes.map(n => ({
    i: n.ev,
    x: n.gx * TILE + TILE / 2, y: n.gy * TILE + TILE / 2,
    name: n.name,
    skillId: n.skillId, skill: n.skillId ? (Skills[n.skillId] || {}).name : null,
    param: n.param ? { id: n.param.id, label: PARAM[n.param.id], amount: (n.param.plus ? 1 : -1) * n.param.amount } : null,
    sw: n.sw, swName: n.sw ? swName(n.sw) : null,
    learnsVar: n.learnsVar, learnsVarName: n.learnsVar ? varName(n.learnsVar) : null,
    pre: n.prereqSw,
    /* Roots of the tree aren't free — they're gated on a god's affliction level
     * (Fear/Gro-goroth/Sylvian/Rher/Vinushka/All-mer), which is a variable, not a switch. */
    gateVar: n.prereqVar ? n.prereqVar.id : null,
    gateVarName: n.prereqVar ? varName(n.prereqVar.id) : null,
    gateValue: n.prereqVar ? n.prereqVar.value : null,
  })).sort((a, b) => a.y - b.y || a.x - b.x),
};

const js = `/* games/hexen-fh2.js — Fear & Hunger 2: Termina's hexen tree, extracted from the game's own
 * map data by tools/extract-hexen-termina.js. Coordinates are pixel CENTRES derived from each
 * node event's grid position on the "hexen" map (${best.json.width}x${best.json.height} tiles at ${TILE}px).
 *
 * The board is drawn by the editor from these numbers - no game art is shipped.
 *
 * Termina differs from F&H1 in three ways worth knowing:
 *   - a node may raise a PARAMETER (attack+1, mind capacity) instead of granting a skill
 *   - the game records WHO bought each node in a learns_<node> variable, so a full edit writes
 *     the skill, the SKILL_* switch and that variable
 *   - prerequisites are the switch tested at the top of the node's interactive page
 */
(function (FHSE) {
  'use strict';
  FHSE.hexen = FHSE.hexen || {};
  FHSE.hexen['fear-and-hunger-2'] = ${JSON.stringify(out, null, 2).replace(/\n/g, '\n  ')};
})(window.FHSE);
`;
fs.writeFileSync(OUT, js);
console.log(`\nwrote ${OUT} (${out.nodes.length} nodes, board ${out.board.w}x${out.board.h})`);
