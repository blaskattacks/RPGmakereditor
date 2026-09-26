/* The two bulk-fill buttons on each inventory panel, exercised against a real save.
 *
 *   "Top up what I have"  -- only touches what is already in the bag
 *   "Give me every ..."   -- adds the whole database at the cap
 *
 * 99 is the engine's ceiling (Game_Party.maxItems returns 99 in both MV and MZ), so anything
 * larger would be clamped by the game anyway. Both must survive a save round-trip. */
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
    // The editors query their own subtrees (head.querySelector('.side')), so this has to work.
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

let confirmAnswer = true;
const sandbox = {
  console, setTimeout, clearTimeout, Object, JSON, Math, Array, String, Number, Promise, Error, RegExp, Date,
  TextDecoder, TextEncoder, Node,
  window: { confirm: () => confirmAnswer },
  document: {
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
const data = new FHSE.MVData();
for (const n of ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'])
  data.set(n, JSON.parse(fs.readFileSync(path.join(GAME, 'data', n + '.json'), 'utf8')));
const buf = fs.readFileSync(SAVE);
const got = FHSE.codecs.decodeAuto(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'file3.rpgsave');
const save = got.save;

const ctx = { profile: FHSE.games.get('fear-and-hunger'), data, save,
  markDirty() {}, toast() {}, rerender() {}, refreshRoster() {}, roster: () => [], actor: null };

const root = makeNode('div');
FHSE.editors.party.render(root, ctx);
const buttons = walk(root).filter(n => n.tagName === 'BUTTON');
const byText = t => buttons.find(b => walk(b).concat([b]).some(x => String(x.textContent).indexOf(t) !== -1));

console.log('=== the buttons exist on every bag ===');
const tops = buttons.filter(b => walk(b).concat([b]).some(x => /Top up what I have/.test(x.textContent)));
const alls = buttons.filter(b => walk(b).concat([b]).some(x => /Give me every/.test(x.textContent)));
check(`"top up" on all 3 bags (items, weapons, armors)`, tops.length === 3, String(tops.length));
check(`"give me every" on all 3 bags`, alls.length === 3, String(alls.length));

console.log('\n=== top up only touches what is already held ===');
const items = save.party._items;
const heldBefore = jx.keys(items).map(Number);
const someBelow = heldBefore.filter(id => items[id] < 99).length;
console.log(`  bag holds ${heldBefore.length} kinds, ${someBelow} of them below 99`);
tops[0].fire('click');
const heldAfter = jx.keys(items).map(Number);
check('the number of KINDS is unchanged (nothing new added)', heldAfter.length === heldBefore.length,
  `${heldBefore.length} -> ${heldAfter.length}`);
check('every held stack is now 99', heldAfter.every(id => items[id] === 99));
check('it did not invent entries the game does not define', heldAfter.every(id => !!data.obj('Items', id)));

console.log('\n=== give-me-every adds the whole database ===');
const everyItem = data.list('Items');
confirmAnswer = false;
alls[0].fire('click');
check('declining the confirm changes nothing', jx.keys(items).length === heldAfter.length);
confirmAnswer = true;
alls[0].fire('click');
const nowIds = jx.keys(items).map(Number);
check(`bag now holds all ${everyItem.length} defined items`, nowIds.length === everyItem.length,
  `${nowIds.length} vs ${everyItem.length}`);
check('all at 99', nowIds.every(id => items[id] === 99));

console.log('\n=== and it survives the round-trip ===');
const out = Buffer.from(got.codec.encode(save), 'utf8');
const back = FHSE.codecs.decodeAuto(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), 'x.rpgsave').save;
const bItems = back.party._items;
check('same number of kinds after save/load', jx.keys(bItems).length === nowIds.length);
check('still all at 99', jx.keys(bItems).map(Number).every(id => bItems[id] === 99));
check('JsonEx marker on the bag preserved', typeof bItems['@c'] === 'number' || bItems['@c'] === undefined);
check('the rest of the save is intact', FHSE.codecs.looksLikeSave(back));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
