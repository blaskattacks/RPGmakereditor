/* Switching tabs must not throw away a half-typed field.
 *
 * Fields commit on `change`, which a browser fires on BLUR. Tearing the view down with clear()
 * REMOVES the focused input rather than blurring it, and removal fires nothing -- so a value typed
 * and then abandoned by clicking another tab was silently dropped. renderContent() now blurs the
 * focused field first, which makes the browser fire `change` normally.
 *
 * The shim models focus/blur faithfully enough to reproduce the original bug: blur() fires the
 * change listeners, and removing a node does not. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const G = require('./_gamepaths.js');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' -- ' + d : ''}`)); };

let ACTIVE = null;
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
    // Real focus semantics: blur fires `change`; being removed from the tree does not.
    focus() { ACTIVE = n; },
    blur() { if (ACTIVE === n) { ACTIVE = null; n.fire('change'); } },
    contains(x) { while (x) { if (x === n) return true; x = x.parentNode; } return false; },
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

const content = makeNode('div');
content.setAttribute('id', 'content');
const sandbox = {
  console, setTimeout, clearTimeout, Object, JSON, Math, Array, String, Number, Promise, Error, RegExp, Date,
  TextDecoder, TextEncoder, Node,
  window: { confirm: () => true },
  document: {
    createElement: makeNode, createElementNS: (ns, t) => makeNode(t),
    createTextNode: t => { const n = makeNode('#text'); n.textContent = String(t); return n; },
    addEventListener() {}, head: { appendChild() {} },
    querySelector: sel => (sel === '#content' ? content : null),
    get activeElement() { return ACTIVE; },
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

// Termina is where this was noticed, so use it if a save is there; otherwise F&H.
const CANDIDATES = [
  ['fear-and-hunger-2', G.game('fh2'), 'save'],
  ['fear-and-hunger', G.game('fh1'), 'save'],
].filter(c => c[1]);   // not installed here — just not a candidate
let picked = null;
for (const [id, www, sd] of CANDIDATES) {
  const dir = path.join(www, sd);
  if (!fs.existsSync(dir)) continue;
  const f = fs.readdirSync(dir).find(x => /^file\d+\.rpgsave$/.test(x));
  if (f) { picked = { id, www, save: path.join(dir, f) }; break; }
}
if (!picked) { console.log('no save available - skipping'); process.exit(0); }
console.log(`using ${picked.id} :: ${path.basename(picked.save)}\n`);

const data = new FHSE.MVData();
for (const n of ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'])
  data.set(n, JSON.parse(fs.readFileSync(path.join(picked.www, 'data', n + '.json'), 'utf8')));
const b = fs.readFileSync(picked.save);
const got = FHSE.codecs.decodeAuto(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), path.basename(picked.save));
const save = got.save;
const actors = jx.arr(save.actors._data);
const actor = (jx.arr(save.party._actors) || []).map(i => actors[i]).find(Boolean) ||
              actors.find(a => a && typeof a === 'object');

const ctx = { profile: FHSE.games.get(picked.id), data, save,
  markDirty() {}, toast() {}, rerender() {}, refreshRoster() {}, roster: () => [], actor };

function renderInto(root) { FHSE.dom.clear(root); FHSE.editors.characters.render(root, ctx); }
renderInto(content);

// The nickname field is a plain text input, so its committed value is unambiguous.
const inputs = walk(content).filter(n => n.tagName === 'INPUT' && n.attrs.type === 'text');
check(`character editor rendered text fields (${inputs.length})`, inputs.length >= 2);
const nickField = inputs[1];

console.log('=== the original bug: removal alone loses the edit ===');
{
  const original = actor._nickname;
  nickField.focus();
  nickField.value = 'TYPED-BUT-NOT-BLURRED';
  FHSE.dom.clear(content);                   // what the old renderContent did, with no blur first
  check('removing the focused field without blurring drops the value (the bug)',
    actor._nickname === original, `nickname became ${actor._nickname}`);
  ACTIVE = null;
}

console.log('\n=== the fix: blur first, and the edit lands ===');
{
  renderInto(content);
  const again = walk(content).filter(n => n.tagName === 'INPUT' && n.attrs.type === 'text')[1];
  again.focus();
  again.value = 'COMMITTED-ON-SWITCH';
  // What renderContent() now does before clearing.
  const ae = sandbox.document.activeElement;
  if (ae && content.contains(ae) && ae !== content) ae.blur();
  FHSE.dom.clear(content);
  check('the typed nickname is saved', actor._nickname === 'COMMITTED-ON-SWITCH', String(actor._nickname));
}

console.log('\n=== a numeric field too ===');
{
  renderInto(content);
  const nums = walk(content).filter(n => n.tagName === 'INPUT' && n.attrs.type === 'number');
  check(`numeric fields present (${nums.length})`, nums.length > 0);
  /* Pick the HP field by its LABEL -- the first number input on the panel is Level, from the
   * identity section above the vitals, and setting that would prove nothing about _hp. */
  const hpLabel = (ctx.profile.labels && ctx.profile.labels.hp) || 'HP';
  const hp = walk(content)
    .filter(n => n.tagName === 'LABEL' && walk(n).some(x => String(x.textContent).indexOf(hpLabel + ' now') === 0))
    .map(l => walk(l).find(x => x.tagName === 'INPUT'))[0];
  check(`found the "${hpLabel} now" field`, !!hp);
  hp.focus();
  hp.value = '77';
  const ae = sandbox.document.activeElement;
  if (ae && content.contains(ae) && ae !== content) ae.blur();
  check('the typed HP is saved', actor._hp === 77, String(actor._hp));
}

console.log('\n=== blurring when nothing was edited is harmless ===');
{
  renderInto(content);
  const before = actor._nickname;
  const f = walk(content).filter(n => n.tagName === 'INPUT' && n.attrs.type === 'text')[1];
  f.focus(); f.blur();
  check('unchanged field leaves the value alone', actor._nickname === before);
  ACTIVE = null;
  check('committing with nothing focused does not throw', (() => {
    const ae = sandbox.document.activeElement;
    if (ae && content.contains(ae)) ae.blur();
    return true;
  })());
}

console.log('\n=== and the committed edits survive a save ===');
const out = Buffer.from(got.codec.encode(save), 'utf8');
const back = FHSE.codecs.decodeAuto(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), 'x.rpgsave').save;
const ba = jx.arr(back.actors._data).find(a => a && a._nickname === 'COMMITTED-ON-SWITCH');
check('the nickname round-trips', !!ba);
check('the HP round-trips', ba && ba._hp === 77);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
