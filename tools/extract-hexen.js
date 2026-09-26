/* Final Fear & Hunger hexen table.
 *
 * The navigator event branches on HEXEN_cursor in a fixed order (1,2,3,4,11,12,…65) and, inside
 * each branch, moves the cursor picture and shows that node's name plate. So the k-th branch
 * pairs with the k-th cursor position — index order, NOT numeric node id.
 *
 * The purchase events give the authoritative skill id and purchased-flag switch per node.
 * Plate ART names are legacy (the game rebalanced skills without renaming the images), so we
 * report agreement between plate name and switch name only as a sanity check, never as the source.
 */
const fs = require('fs');
const path = require('path');
const G = require('./tests/_gamepaths.js');
const FH = process.argv[2] || G.game('fh1');
const CURSOR_VAR = Number(process.argv[3] || 166);
const OUT = process.argv[4] || path.join(__dirname, 'hexen-fh1.json');
const DATA = path.join(FH, 'data');
const Skills = JSON.parse(fs.readFileSync(path.join(DATA, 'Skills.json'), 'utf8'));
const Sys = JSON.parse(fs.readFileSync(path.join(DATA, 'System.json'), 'utf8'));
const swName = i => Sys.switches[i] || ('switch' + i);
const files = fs.readdirSync(DATA).filter(f => /^Map\d+\.json$/.test(f));

// ---------- 1. navigator: ordered [index, x, y, plate] ----------
let ordered = null;
outer:
for (const f of files) {
  const json = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  for (const ev of (json.events || []).filter(Boolean)) for (const pg of ev.pages || []) {
    const list = pg.list || [];
    const plates = list.filter(c => c.code === 231 && (c.parameters || [])[0] === 59);
    if (plates.length < 20) continue;
    const res = [];
    let idx = null, cur = null;
    for (const c of list) {
      const p = c.parameters || [];
      if (c.code === 111 && p[0] === 1 && p[1] === CURSOR_VAR && p[2] === 0 && p[4] === 0) idx = p[3];
      if ((c.code === 231 || c.code === 232) && p[0] === 58) cur = { x: p[4], y: p[5] };
      if (c.code === 231 && p[0] === 59) {
        res.push({ index: idx, x: cur ? cur.x : null, y: cur ? cur.y : null, plate: String(p[1]).replace(/^the_hexen_/, '') });
        cur = null;
      }
    }
    if (res.length >= 20) { ordered = res; break outer; }
  }
}
if (!ordered) { console.error('could not locate the hexen navigator event'); process.exit(1); }

// ---------- 2. purchase logic: index -> skill, switch, prereqs, branch ----------
const nodes = {};
function walk(list) {
  const stack = [];
  for (const c of list) {
    const p = c.parameters || [];
    if (c.code === 111) {
      let cond = null;
      if (p[0] === 1 && p[2] === 0 && p[4] === 0) cond = { kind: 'var', id: p[1], val: p[3] };
      else if (p[0] === 0) cond = { kind: 'switch', id: p[1], on: p[2] === 0 };
      stack.push(cond); continue;
    }
    if (c.code === 412) { stack.pop(); continue; }
    const nc = stack.find(s => s && s.kind === 'var' && s.id === CURSOR_VAR);
    if (!nc) continue;
    const rec = (nodes[nc.val] ||= { skillId: null, sw: null, prereq: new Set(), branch: new Set(), actors: new Set() });
    for (const s of stack) {
      if (!s || s.kind !== 'switch') continue;
      const n = swName(s.id);
      if (/_soul$/i.test(n)) rec.branch.add(s.id);
      else if (/^SKILL_/i.test(n) && s.on) rec.prereq.add(s.id);
    }
    if (c.code === 121 && p[2] === 0 && /^SKILL_/i.test(swName(p[0]))) rec.sw = p[0];
    if (c.code === 318 && p[2] === 0) { rec.skillId = p[3]; if (p[0] === 0) rec.actors.add(p[1]); }
  }
}
for (const f of files) {
  const json = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  for (const ev of (json.events || []).filter(Boolean)) for (const pg of ev.pages || []) walk(pg.list || []);
}

// ---------- 3. join, and sanity-check plate vs switch ----------
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const table = [];
let agree = 0;
for (const o of ordered) {
  const n = nodes[o.index] || {};
  const sk = Skills[n.skillId] || {};
  const swn = n.sw ? swName(n.sw) : '';
  const plateVsSwitch = swn && norm(swn.replace(/^SKILL_/i, '')) === norm(o.plate);
  if (plateVsSwitch) agree++;
  table.push({
    index: o.index, x: o.x, y: o.y, plate: o.plate,
    skillId: n.skillId ?? null, skill: sk.name || null,
    purchasedSwitch: n.sw ?? null, purchasedSwitchName: swn || null,
    prereqSwitches: [...(n.prereq || [])].filter(id => id !== n.sw),
    branchSwitches: [...(n.branch || [])],
    branchNames: [...(n.branch || [])].map(swName),
  });
}

console.log(`${table.length} nodes · plate/switch agreement ${agree}/${table.length} ` +
  `(the rest are legacy art kept after rebalances)\n`);
console.log('idx   x    y   plate                skill                     purchased switch        prereq switches');
console.log('-'.repeat(122));
for (const t of table) {
  console.log(
    `${String(t.index).padStart(3)} ${String(t.x).padStart(4)} ${String(t.y).padStart(4)}  ` +
    `${t.plate.padEnd(20)} ${(t.skillId ? '#' + t.skillId + ' ' + t.skill : '(none)').padEnd(25)} ` +
    `${String(t.purchasedSwitchName || '-').padEnd(23)} ${t.prereqSwitches.map(swName).join(', ') || '-'}`);
}
const missing = table.filter(t => !t.skillId || !t.purchasedSwitch);
console.log(`\nnodes missing skill or switch: ${missing.length ? missing.map(m => m.index).join(', ') : 'none'}`);
console.log('branch gates:', [...new Set(table.flatMap(t => t.branchNames))].join(', '));
console.log('receiving actors:', [...new Set(table.flatMap(t => [...(nodes[t.index]?.actors || [])]))].sort((a, b) => a - b).join(', '));
fs.writeFileSync(OUT, JSON.stringify(table, null, 2));
console.log(`\nwrote ${OUT}`);
