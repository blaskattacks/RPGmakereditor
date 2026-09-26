/* The "max vitals" button must set the value the ENGINE would compute, not a guess.
 *
 *   Game_BattlerBase.param = paramBase + paramPlus, where
 *     paramBase = currentClass().params[paramId][level]
 *     paramPlus = actor._paramPlus[paramId] + every equipped item's params[paramId]
 *   maxTp is a flat 100.
 *
 * Checked against real characters from a real save, and re-derived here independently so the test
 * is not just repeating the editor's own arithmetic back at itself. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const G = require('./_gamepaths.js');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' -- ' + d : ''}`)); };

function Node() {}
function makeNode(tag) {
  const n = Object.create(Node.prototype);
  Object.assign(n, {
    tagName: String(tag).toUpperCase(), children: [], attrs: {}, style: {}, dataset: {},
    className: '', textContent: '', value: '', checked: false, disabled: false, listeners: {},
    classList: {
      add: c => { n.className = (n.className + ' ' + c).trim(); },
      remove: c => { n.className = n.className.split(/\s+/).filter(x => x && x !== c).join(' '); },
      toggle: (c, on) => on ? n.classList.add(c) : n.classList.remove(c),
      contains: c => n.className.split(/\s+/).includes(c),
    },
    appendChild(c) { if (c) { c.parentNode = n; n.children.push(c); } return c; },
    removeChild(c) { n.children = n.children.filter(x => x !== c); return c; },
    remove() { if (n.parentNode) n.parentNode.removeChild(n); },
    setAttribute(k, v) { n.attrs[k] = String(v); if (k === 'class') n.className = String(v); },
    getAttribute(k) { return n.attrs[k] === undefined ? null : n.attrs[k]; },
    removeAttribute(k) { delete n.attrs[k]; },
    addEventListener(e, f) { (n.listeners[e] = n.listeners[e] || []).push(f); },
    fire(e, ev) { (n.listeners[e] || []).forEach(f => f(ev || { preventDefault() {} })); },
    querySelector(sel) { return walk(n).find(x => matches(x, sel)) || null; },
    querySelectorAll(sel) { return walk(n).filter(x => matches(x, sel)); },
  });
  Object.defineProperty(n, 'firstChild', { get: () => n.children[0] || null });
  return n;
}
const walk = (n, out = []) => { for (const c of n.children) { out.push(c); walk(c, out); } return out; };
function matches(n, sel) {
  return String(sel).split(',').map(s => s.trim()).some(s => {
    if (s.startsWith('.')) return n.classList.contains(s.slice(1));
    if (s.startsWith('#')) return n.attrs.id === s.slice(1);
    return n.tagName === s.toUpperCase();
  });
}

const sandbox = {
  console, setTimeout, clearTimeout, Object, JSON, Math, Array, String, Number, Promise, Error, RegExp, Date,
  TextDecoder, TextEncoder, Node,
  window: { confirm: () => true }, document: {
    createElement: makeNode, createElementNS: (ns, t) => makeNode(t),
    createTextNode: t => { const n = makeNode('#text'); n.textContent = String(t); return n; },
    addEventListener() {}, head: { appendChild() {} },
  },
};
sandbox.globalThis = sandbox; vm.createContext(sandbox);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (/app\.js$/.test(m[1])) continue;
  vm.runInContext(fs.readFileSync(path.join(ROOT, m[1]), 'utf8'), sandbox, { filename: m[1] });
  for (const k of ['pako', 'LZString']) if (sandbox[k] === undefined && sandbox.window[k] !== undefined) sandbox[k] = sandbox.window[k];
}
const FHSE = sandbox.window.FHSE, jx = FHSE.jx;

const GAME = G.game('fh1');
if (!GAME) G.bail('fh1');
const SAVE = path.join(GAME, 'save/file3.rpgsave');
if (!fs.existsSync(SAVE)) { console.log('no save on disk - skipping'); process.exit(0); }
const raw = {};
for (const n of ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'])
  raw[n] = JSON.parse(fs.readFileSync(path.join(GAME, 'data', n + '.json'), 'utf8'));
const data = new FHSE.MVData();
for (const n of Object.keys(raw)) data.set(n, raw[n]);
const buf = fs.readFileSync(SAVE);
const got = FHSE.codecs.decodeAuto(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'file3.rpgsave');
const save = got.save;
const actors = jx.arr(save.actors._data);

// Independent re-derivation of the engine's formula, straight from the raw JSON.
function engineMax(actor, paramId) {
  const klass = raw.Classes[actor._classId];
  if (!klass || !klass.params || !klass.params[paramId]) return null;
  const curve = klass.params[paramId];
  const lvl = Math.max(0, Math.min(curve.length - 1, actor._level || 1));
  let v = curve[lvl] + ((jx.arr(actor._paramPlus) || [])[paramId] || 0);
  for (const it of (jx.arr(actor._equips) || [])) {
    if (!it || !it._itemId) continue;
    const db = it._dataClass === 'weapon' ? raw.Weapons : raw.Armors;
    const obj = db[it._itemId];
    if (obj && obj.params && obj.params[paramId] != null) v += obj.params[paramId];
  }
  return Math.max(0, Math.round(v));
}

const ctx = { profile: FHSE.games.get('fear-and-hunger'), data, save,
  markDirty() {}, toast() {}, rerender() {}, refreshRoster() {}, roster: () => [], actor: null };

const party = jx.arr(save.party._actors) || [];
console.log(`checking ${party.length} party members\n`);

console.log('=== the button sets exactly what the engine would compute ===');
for (const id of party) {
  const a = actors[id];
  if (!a) continue;
  const wantHp = engineMax(a, 0), wantMp = engineMax(a, 1);
  a._hp = 1; a._mp = 1; a._tp = 0;

  const root = makeNode('div');
  ctx.actor = a;
  FHSE.editors.characters.render(root, ctx);
  const btn = walk(root).find(n => n.tagName === 'BUTTON' &&
    walk(n).concat([n]).some(x => /Max all vitals/.test(x.textContent)));
  check(`${a._name}: button present`, !!btn);
  if (!btn) continue;
  btn.fire('click');
  check(`${a._name} Lv${a._level}: HP 1 -> ${a._hp} (engine says ${wantHp})`, a._hp === wantHp);
  check(`${a._name}: MP -> ${a._mp} (engine says ${wantMp})`, a._mp === wantMp);
  check(`${a._name}: TP -> ${a._tp} (maxTp is a flat 100)`, a._tp === 100);
}

console.log('\n=== equipment is counted, not ignored ===');
{
  const a = actors[party[0]];
  const equips = jx.arr(a._equips);
  const before = engineMax(a, 0);
  // Find an armor that actually carries a MaxHP bonus, and put it on.
  const boost = raw.Armors.filter(Boolean).find(x => x.params && x.params[0] > 0);
  if (boost) {
    const slot = equips.find(e => e && e._dataClass === 'armor');
    const oldId = slot._itemId;
    slot._itemId = boost.id;
    const after = engineMax(a, 0);
    check(`equipping "${boost.name}" (+${boost.params[0]} max HP) raises the computed max (${before} -> ${after})`,
      after === before + boost.params[0] - ((raw.Armors[oldId] && raw.Armors[oldId].params[0]) || 0));
    const root = makeNode('div');
    ctx.actor = a; a._hp = 1;
    FHSE.editors.characters.render(root, ctx);
    walk(root).find(n => n.tagName === 'BUTTON' && walk(n).concat([n]).some(x => /Max all vitals/.test(x.textContent))).fire('click');
    check('and the button uses that higher number', a._hp === after);
    slot._itemId = oldId;
  } else {
    console.log('  (no armor in this game grants max HP - skipped)');
  }
}

console.log('\n=== the label tells you the number ===');
{
  const a = actors[party[0]];
  const root = makeNode('div');
  ctx.actor = a;
  FHSE.editors.characters.render(root, ctx);
  const labels = walk(root).filter(n => n.tagName === 'LABEL').map(n => walk(n).map(x => x.textContent).join(''));
  check('a vitals label shows its maximum', labels.some(t => /max \d+/.test(t)), labels.slice(0, 3).join(' | '));
}

/* Neither Fear & Hunger game gives max HP through equipment -- their gear grants Attack, Defence
 * and so on -- so the equipment half of the formula needs a game that does. Look Outside's does. */
console.log('\n=== equipment contribution, on a game whose gear grants max HP ===');
{
  const LO = G.game('lo');
  const LSAVE = LO ? path.join(LO, 'save/file1.rmmzsave') : null;
  if (!LSAVE || !fs.existsSync(LSAVE)) { console.log('  (Look Outside not installed - skipped)'); }
  else {
    const lraw = {};
    for (const n of ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'])
      lraw[n] = JSON.parse(fs.readFileSync(path.join(LO, 'data', n + '.json'), 'utf8'));
    const ldata = new FHSE.MVData();
    for (const n of Object.keys(lraw)) ldata.set(n, lraw[n]);
    const lb = fs.readFileSync(LSAVE);
    const lgot = FHSE.codecs.decodeAuto(lb.buffer.slice(lb.byteOffset, lb.byteOffset + lb.byteLength), 'file1.rmmzsave');
    const lactors = jx.arr(lgot.save.actors._data);
    const lparty = jx.arr(lgot.save.party._actors) || [];
    const la = lactors[lparty[0]];

    const lmax = (actor, paramId) => {
      const klass = lraw.Classes[actor._classId];
      if (!klass || !klass.params || !klass.params[paramId]) return null;
      const curve = klass.params[paramId];
      const lvl = Math.max(0, Math.min(curve.length - 1, actor._level || 1));
      let v = curve[lvl] + ((jx.arr(actor._paramPlus) || [])[paramId] || 0);
      for (const it of (jx.arr(actor._equips) || [])) {
        if (!it || !it._itemId) continue;
        const db = it._dataClass === 'weapon' ? lraw.Weapons : lraw.Armors;
        const o = db[it._itemId];
        if (o && o.params && o.params[paramId] != null) v += o.params[paramId];
      }
      return Math.max(0, Math.round(v));
    };

    const lctx = { profile: FHSE.games.get('look-outside'), data: ldata, save: lgot.save,
      markDirty() {}, toast() {}, rerender() {}, refreshRoster() {}, roster: () => [], actor: la };

    // What the class curve alone would give, with nothing worn.
    const klass = lraw.Classes[la._classId];
    const curveOnly = klass.params[0][la._level] + ((jx.arr(la._paramPlus) || [])[0] || 0);
    const withGear = lmax(la, 0);
    const fromGear = withGear - curveOnly;
    console.log(`  ${la._name} Lv${la._level}: class curve + bonus = ${curveOnly}, worn gear adds ${fromGear}`);
    check('this character\'s gear really does grant max HP', fromGear > 0, String(fromGear));

    la._hp = 1;
    const lroot = makeNode('div');
    FHSE.editors.characters.render(lroot, lctx);
    const lbtn = walk(lroot).find(n => n.tagName === 'BUTTON' &&
      walk(n).concat([n]).some(x => /Max all vitals/.test(x.textContent)));
    lbtn.fire('click');
    check(`the button includes that gear (set ${la._hp}, engine says ${withGear})`, la._hp === withGear);
    check(`and it exceeds the curve-only figure (${la._hp} > ${curveOnly})`, la._hp > curveOnly);

    // Removing a piece must lower the computed maximum by exactly that piece's bonus.
    const equips = jx.arr(la._equips);
    const worn = equips.find(e => e && e._itemId && (e._dataClass === 'weapon' ? lraw.Weapons : lraw.Armors)[e._itemId].params[0] > 0);
    if (worn) {
      const db = worn._dataClass === 'weapon' ? lraw.Weapons : lraw.Armors;
      const bonus = db[worn._itemId].params[0];
      const name = db[worn._itemId].name;
      const oldId = worn._itemId;
      worn._itemId = 0;
      check(`taking off "${name}" drops the max by exactly its +${bonus}`, lmax(la, 0) === withGear - bonus,
        `${withGear} -> ${lmax(la, 0)}`);
      worn._itemId = oldId;
      check('and putting it back restores it', lmax(la, 0) === withGear);
    }
  }
}

console.log('\n=== and it survives the round-trip ===');
const out = Buffer.from(got.codec.encode(save), 'utf8');
const back = FHSE.codecs.decodeAuto(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), 'x.rpgsave').save;
const b = jx.arr(back.actors._data)[party[0]];
check('maxed HP persists', b._hp === engineMax(actors[party[0]], 0));
check('TP persists at 100', b._tp === 100);
check('save still intact', FHSE.codecs.looksLikeSave(back));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
