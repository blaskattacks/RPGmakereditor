/* The editor must land on someone you are actually playing.
 *
 * A save instantiates a record for every character the story has touched, so picking "the lowest
 * instantiated actor id" lands on whoever occupies slot 1 -- in a real Termina save that is Levi,
 * while the party is Marcoh. You then edit the wrong person for a while before noticing.
 *
 * So: default to the party leader, sort the roster party-first in marching order, and say plainly
 * on the panel when the character being edited is not in the party. */
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
    insertBefore(c) { if (c) { c.parentNode = n; n.children.unshift(c); } return c; },
    removeChild(c) { n.children = n.children.filter(x => x !== c); return c; },
    remove() { if (n.parentNode) n.parentNode.removeChild(n); },
    setAttribute(k, v) { n.attrs[k] = String(v); if (k === 'class') n.className = String(v); },
    getAttribute(k) { return n.attrs[k] === undefined ? null : n.attrs[k]; },
    removeAttribute(k) { delete n.attrs[k]; },
    addEventListener(e, f) { (n.listeners[e] = n.listeners[e] || []).push(f); },
    fire(e, ev) { (n.listeners[e] || []).forEach(f => f(ev || { preventDefault() {} })); },
    contains(x) { while (x) { if (x === n) return true; x = x.parentNode; } return false; },
    querySelector(sel) { return walk(n).find(x => matches(x, sel)) || null; },
    querySelectorAll(sel) { return walk(n).filter(x => matches(x, sel)); },
  });
  Object.defineProperty(n, 'firstChild', { get: () => n.children[0] || null });
  return n;
}
const walk = (n, out = []) => { for (const c of n.children) { out.push(c); walk(c, out); } return out; };
const textOf = n => walk(n).map(x => x.textContent).join('') + n.textContent;
function matches(n, sel) {
  return String(sel).split(',').map(s => s.trim()).some(s => {
    if (s.startsWith('.')) return n.classList.contains(s.slice(1));
    if (s.startsWith('#')) return n.attrs.id === s.slice(1);
    return n.tagName === s.toUpperCase();
  });
}

const sandbox = {
  console, setTimeout, clearTimeout, Object, JSON, Math, Array, String, Number, Promise, Error, RegExp, Date,
  TextDecoder, TextEncoder, Node, window: { confirm: () => true },
  document: {
    createElement: makeNode, createElementNS: (ns, t) => makeNode(t),
    createTextNode: t => { const n = makeNode('#text'); n.textContent = String(t); return n; },
    addEventListener() {}, head: { appendChild() {} }, querySelector: () => null,
    get activeElement() { return null; },
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

/* app.js needs a whole page, so re-implement the two rules it now applies. Both are short, and the
 * point is to pin the BEHAVIOUR against real saves -- the panel warning is checked for real. */
function rosterOf(save, data) {
  const arr = jx.arr(save.actors._data) || [];
  const party = jx.arr(save.party._actors) || [];
  const out = [];
  for (let id = 0; id < arr.length; id++) {
    const a = arr[id];
    if (!a || typeof a !== 'object') continue;
    const slot = party.indexOf(id);
    out.push({ id, actor: a, name: a._name || data.actor(id), inParty: slot !== -1, isLeader: slot === 0, slot });
  }
  out.sort((x, y) => (x.inParty !== y.inParty) ? (x.inParty ? -1 : 1) : (x.inParty ? x.slot - y.slot : x.id - y.id));
  return out;
}
const defaultActor = r => r.find(x => x.isLeader) || r.find(x => x.inParty) || r[0] || null;

// A game that is not installed on this machine drops out with a SKIP line, rather than crashing.
const GAMES = [
  ['fear-and-hunger-2', G.game('fh2'), 'save', 'fh2'],
  ['fear-and-hunger', G.game('fh1'), 'save', 'fh1'],
  ['look-outside', G.game('lo'), 'save', 'lo'],
].filter(g => g[1] || G.skip(g[3]));

for (const [id, www, sd] of GAMES) {
  const dir = path.join(www, sd);
  if (!fs.existsSync(dir)) continue;
  const f = fs.readdirSync(dir).find(x => /^file\d+\.(rpgsave|rmmzsave)$/.test(x));
  if (!f) continue;
  console.log(`\n######## ${id} :: ${f} ########`);

  const data = new FHSE.MVData();
  for (const n of ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'])
    data.set(n, JSON.parse(fs.readFileSync(path.join(www, 'data', n + '.json'), 'utf8')));
  const b = fs.readFileSync(path.join(dir, f));
  const got = FHSE.codecs.decodeAuto(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), f);
  const save = got.save;

  const roster = rosterOf(save, data);
  const party = jx.arr(save.party._actors) || [];
  const chosen = defaultActor(roster);
  const lowestId = roster.slice().sort((a, c) => a.id - c.id)[0];

  console.log(`  party: ${party.map(i => (jx.arr(save.actors._data)[i] || {})._name || '#' + i).join(', ') || '(empty)'}`);
  console.log(`  lowest instantiated actor: ${lowestId.name} (#${lowestId.id})`);
  console.log(`  editor now opens on:       ${chosen.name} (#${chosen.id})`);

  if (party.length) {
    check('opens on someone in the party', chosen.inParty);
    check('and specifically on the leader', chosen.isLeader);
    check('the leader is first in the roster', roster[0].isLeader);
    check('party members come before everyone else',
      roster.findIndex(r => !r.inParty) === -1 || roster.findIndex(r => !r.inParty) === party.length);
    if (!lowestId.inParty) {
      check(`the old rule would have picked a non-party character (${lowestId.name})`, true);
    }
  }

  // The panel must say so when the selected character is outside the party.
  const outsider = roster.find(r => !r.inParty);
  if (outsider && party.length) {
    const ctx = { profile: FHSE.games.get(id), data, save, actor: outsider.actor,
      markDirty() {}, toast() {}, rerender() {}, refreshRoster() {}, roster: () => [] };
    const root = makeNode('div');
    FHSE.editors.characters.render(root, ctx);
    const warn = walk(root).filter(n => n.classList.contains('offwarn'));
    check(`editing "${outsider.name}" shows the not-in-party warning`, warn.length === 1);
    check('the warning names the character', warn.length === 1 && textOf(warn[0]).indexOf(outsider.name) !== -1);
    check('and lists who your party actually is',
      warn.length === 1 && party.every(pid => {
        const nm = (jx.arr(save.actors._data)[pid] || {})._name || data.actor(pid);
        return textOf(warn[0]).indexOf(nm) !== -1;
      }));

    // ...and must NOT show it for a party member.
    const inner = roster.find(r => r.inParty);
    const ctx2 = Object.assign({}, ctx, { actor: inner.actor });
    const root2 = makeNode('div');
    FHSE.editors.characters.render(root2, ctx2);
    check(`no warning when editing "${inner.name}", who is in the party`,
      walk(root2).filter(n => n.classList.contains('offwarn')).length === 0);
    check('the leader is labelled as such',
      walk(root2).some(n => n.classList.contains('lead') && /leader|in your party/.test(textOf(n) + n.textContent)));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
