/* Reference mode: the editor must open with the game's data files and NO save.
 *
 * These games ration saving (Termina wants a specific item), so a player who cannot save has no
 * file to bring -- which is exactly when they want to look something up or install a mod. Every
 * view therefore has to tolerate ctx.save === null instead of throwing.
 *
 * Rendered here against a tiny DOM shim, so the editors run for real rather than being
 * pattern-matched in their source. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const G = require('./_gamepaths.js');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' -- ' + d : ''}`)); };

// ---- the smallest DOM the editors actually use ----
// util.js does `children instanceof Node`, so the shim needs a real constructor to inherit from.
function Node() {}
function makeNode(tag) {
  const n = Object.create(Node.prototype);
  Object.assign(n, {
    tagName: String(tag).toUpperCase(), children: [], attrs: {}, style: {}, dataset: {},
    className: '', textContent: '', value: '', checked: false, disabled: false, listeners: {},
    classList: {
      add(c) { n.className = (n.className + ' ' + c).trim(); },
      remove(c) { n.className = n.className.split(/\s+/).filter(x => x && x !== c).join(' '); },
      toggle(c, on) { on ? n.classList.add(c) : n.classList.remove(c); },
      contains(c) { return n.className.split(/\s+/).includes(c); },
    },
    appendChild(c) { if (c) { c.parentNode = n; n.children.push(c); } return c; },
    insertBefore(c, r) { n.children.unshift(c); if (c) c.parentNode = n; return c; },
    removeChild(c) { n.children = n.children.filter(x => x !== c); return c; },
    remove() { if (n.parentNode) n.parentNode.removeChild(n); },
    // SVG elements get their class via setAttribute, not .className -- mirror it so selector
    // matching sees both (the hexen board builds every node that way).
    setAttribute(k, v) { n.attrs[k] = String(v); if (k === 'class') n.className = String(v); },
    getAttribute(k) { return n.attrs[k] === undefined ? null : n.attrs[k]; },
    removeAttribute(k) { delete n.attrs[k]; },
    addEventListener(e, f) { (n.listeners[e] = n.listeners[e] || []).push(f); },
    // Enough selector support for what the editors query.
    querySelector(sel) { return walk(n).find(x => matches(x, sel)) || null; },
    querySelectorAll(sel) { return walk(n).filter(x => matches(x, sel)); },
    scrollIntoView() {},
  });
  Object.defineProperty(n, 'firstChild', { get: () => n.children[0] || null });
  return n;
}
// a control inside a .lrow is a real switch row; the toolbar toggle is not
function inRow(n){ let p=n.parentNode; while(p){ if(p.classList && p.classList.contains('lrow')) return true; p=p.parentNode; } return false; }
function walk(n, out = []) { for (const c of n.children) { out.push(c); walk(c, out); } return out; }
function matches(n, sel) {
  return String(sel).split(',').map(s => s.trim()).some(s => {
    if (s.startsWith('.')) return n.classList.contains(s.slice(1));
    if (s.startsWith('#')) return n.attrs.id === s.slice(1);
    return n.tagName === s.toUpperCase();
  });
}

const sandbox = {
  console, TextDecoder, TextEncoder, setTimeout, clearTimeout, Object, JSON, Math, Array, String, Number, Promise, Error, RegExp, Date,
  Node, navigator: {}, window: { location: { href: 'http://localhost/index.html' } }, document: {
    createElement: makeNode, createElementNS: (ns, t) => makeNode(t),
    createTextNode: (t) => { const n = makeNode('#text'); n.textContent = String(t); return n; },
    addEventListener() {}, head: { appendChild() {} }, body: makeNode('body'),
    querySelector: () => null,
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (/app\.js$/.test(m[1])) continue;               // the controller wants a real page
  vm.runInContext(fs.readFileSync(path.join(ROOT, m[1]), 'utf8'), sandbox, { filename: m[1] });
  for (const k of ['pako', 'LZString']) if (sandbox[k] === undefined && sandbox.window[k] !== undefined) sandbox[k] = sandbox.window[k];
}
const FHSE = sandbox.window.FHSE;

const GAME = G.game('fh1');
if (!GAME) G.bail('fh1');
const data = new FHSE.MVData();
for (const n of ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'])
  data.set(n, JSON.parse(fs.readFileSync(path.join(GAME, 'data', n + '.json'), 'utf8')));

const profile = FHSE.games.get('fear-and-hunger');
function ctxFor(save) {
  return {
    profile, data, save,
    markDirty() {}, toast() {}, rerender() {}, refreshRoster() {},
    roster: () => [], actor: null,
  };
}

console.log('=== every view renders with NO save ===');
for (const view of ['variables', 'switches', 'hexen', 'mods']) {
  const root = makeNode('div');
  let err = null;
  try { FHSE.editors[view].render(root, ctxFor(null)); } catch (e) { err = e; }
  check(`${view} renders without throwing`, !err, err && err.message);
  if (!err) check(`${view} produced content`, walk(root).length > 5, String(walk(root).length));
}

console.log('\n=== and the controls are read-only ===');
{
  const root = makeNode('div');
  FHSE.editors.switches.render(root, ctxFor(null));
  const boxes = walk(root).filter(n => n.attrs.type === 'checkbox' && inRow(n));
  check(`switch checkboxes exist (${boxes.length}) and are all disabled`,
    boxes.length > 0 && boxes.every(b => b.disabled));
  check('none are pre-ticked (there is no save to read a value from)', boxes.every(b => !b.checked));
}
{
  const root = makeNode('div');
  FHSE.editors.variables.render(root, ctxFor(null));
  const inputs = walk(root).filter(n => n.tagName === 'INPUT' && n.attrs.type === 'text');
  check(`variable inputs exist (${inputs.length}) and are all disabled`,
    inputs.length > 0 && inputs.every(i => i.disabled));
}
{
  const root = makeNode('div');
  FHSE.editors.hexen.render(root, ctxFor(null));
  const nodes = walk(root).filter(n => n.classList.contains('hex-node'));
  check(`hexen board still draws its ${nodes.length} nodes`, nodes.length === 26, String(nodes.length));
  check('every node is marked read-only', nodes.every(n => n.classList.contains('ro')));
  check('no node is clickable', nodes.every(n => !(n.listeners.click || []).length));
  check('nodes still carry their explanatory title', walk(root).some(n => n.tagName === 'TITLE' && n.textContent));
}

console.log('\n=== with a save, editing still works ===');
const savePath = path.join(GAME, 'save/file3.rpgsave');
if (fs.existsSync(savePath)) {
  const b = fs.readFileSync(savePath);
  const { save } = FHSE.codecs.decodeAuto(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), 'file3.rpgsave');
  const root = makeNode('div');
  FHSE.editors.switches.render(root, ctxFor(save));
  const boxes = walk(root).filter(n => n.attrs.type === 'checkbox' && inRow(n));
  check('switch checkboxes are enabled when a save is loaded', boxes.length > 0 && boxes.every(b => !b.disabled));
  check('some are ticked, reflecting the real save', boxes.some(b => b.checked));

  const hroot = makeNode('div');
  const c = ctxFor(save);
  c.actor = (FHSE.jx.arr(save.actors._data) || []).find(a => a && typeof a === 'object');
  c.roster = () => [];
  FHSE.editors.hexen.render(hroot, c);
  // The party inventory now picks with the radial wheel rather than a dropdown.
  const proot = makeNode('div');
  const pctx = ctxFor(save);
  pctx.roster = () => [];
  let perr = null;
  try { FHSE.editors.party.render(proot, pctx); } catch (e) { perr = e; }
  check('party editor renders', !perr, perr && perr.message);
  if (!perr) {
    const wheels = walk(proot).filter(n => n.classList.contains('wheelwrap'));
    check(`inventory uses the wheel picker (${wheels.length}: items, weapons, armors)`, wheels.length === 3, String(wheels.length));
    check('each wheel drew entries', walk(proot).filter(n => n.classList.contains('wheel-item')).length > 0);
  }

  const hnodes = walk(hroot).filter(n => n.classList.contains('hex-node'));
  check('hexen nodes are clickable with a save', hnodes.length === 26 && hnodes.every(n => (n.listeners.click || []).length === 1));
  check('and are not marked read-only', hnodes.every(n => !n.classList.contains('ro')));
} else {
  console.log('  (no save on disk - editing checks skipped)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
