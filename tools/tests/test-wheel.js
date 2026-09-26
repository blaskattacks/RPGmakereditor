/* The radial picker, driven against a real game's item list.
 *
 * The point of the wheel is that it stays usable at 220 entries: it must draw only a window around
 * the pointer, the search must spin it to the best match, and Enter must add the thing under the
 * pointer. All of that is behaviour, not pixels, so it tests fine headlessly. */
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
    querySelector: () => null, querySelectorAll: () => [],
  });
  // FHSE.dom.clear() drains a node via firstChild -- without it, clear() is a no-op and every
  // redraw stacks on top of the last one.
  Object.defineProperty(n, 'firstChild', { get: () => n.children[0] || null });
  return n;
}
const walk = (n, out = []) => { for (const c of n.children) { out.push(c); walk(c, out); } return out; };
const find = (root, cls) => walk(root).filter(n => n.classList.contains(cls));
const firstWith = (root, cls) => find(root, cls)[0];

const sandbox = {
  console, setTimeout, clearTimeout, Object, JSON, Math, Array, String, Number, Promise, Error, RegExp, Date,
  Node, window: {}, document: {
    createElement: makeNode, createElementNS: (ns, t) => makeNode(t),
    createTextNode: t => { const n = makeNode('#text'); n.textContent = String(t); return n; },
    addEventListener() {}, head: { appendChild() {} },
  },
};
sandbox.globalThis = sandbox; vm.createContext(sandbox);
for (const f of ['js/util.js', 'js/widgets/wheel.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const FHSE = sandbox.window.FHSE;

if (!G.game('fh1')) G.bail('fh1');
const ITEMS_JSON = G.game('fh1') + '/data/Items.json';
const items = JSON.parse(fs.readFileSync(ITEMS_JSON, 'utf8')).filter(Boolean).filter(i => i.name && i.name.trim());
console.log(`driving the wheel with ${items.length} real Fear & Hunger items\n`);

let picked = null;
const w = FHSE.widgets.wheel({
  items,
  placeholder: 'test',
  filter: (o, q) => o.name.toLowerCase().indexOf(q) !== -1 || ('' + o.id === q),
  row: o => o.name,
  meta: o => '#' + o.id,
  onPick: o => { picked = o; },
});
const search = walk(w).find(n => n.attrs.type === 'search');
const wait = () => new Promise(r => setTimeout(r, 160));   // clears the input debounce

(async function () {
  console.log('=== it stays readable at scale ===');
  const drawn = find(w, 'wheel-item');
  check(`draws a window of ${drawn.length}, not all ${items.length}`, drawn.length > 3 && drawn.length <= 13, String(drawn.length));
  check('exactly one entry is at the pointer', find(w, 'wheel-item').filter(n => n.classList.contains('on')).length === 1);
  check('a pointer is drawn', find(w, 'wheel-pointer').length === 1);

  console.log('\n=== the search spins the wheel ===');
  const target = items.find(i => /torch/i.test(i.name)) || items[5];
  search.value = target.name.slice(0, 5);
  search.fire('input'); await wait();
  const onNow = firstWith(w, 'on');
  const lbl = walk(onNow).find(n => n.classList.contains('wheel-label'));
  check(`typing "${target.name.slice(0, 5)}" brings a match to the pointer (${lbl && lbl.textContent})`,
    !!lbl && lbl.textContent.toLowerCase().indexOf(target.name.slice(0, 5).toLowerCase()) !== -1);

  console.log('\n=== Enter picks whatever is at the pointer ===');
  picked = null;
  search.fire('keydown', { key: 'Enter', preventDefault() {} });
  check('onPick fired', !!picked);
  check('and it is the entry that was showing', picked && picked.name === (lbl && lbl.textContent));

  console.log('\n=== arrows nudge without retyping ===');
  // Clear the filter first: a search matching exactly one entry has nowhere to nudge to, which is
  // correct but makes for a pointless test.
  search.value = '';
  search.fire('input'); await wait();
  const before = walk(firstWith(w, 'on')).find(n => n.classList.contains('wheel-label')).textContent;
  search.fire('keydown', { key: 'ArrowDown', preventDefault() {} });
  const after = walk(firstWith(w, 'on')).find(n => n.classList.contains('wheel-label')).textContent;
  check(`ArrowDown moves the pointer (${before} -> ${after})`, before !== after);
  search.fire('keydown', { key: 'ArrowUp', preventDefault() {} });
  check('ArrowUp comes back', walk(firstWith(w, 'on')).find(n => n.classList.contains('wheel-label')).textContent === before);

  console.log('\n=== nonsense search is handled, not crashed into ===');
  search.value = 'zzzzzznotathing';
  search.fire('input'); await wait();
  check('says nothing matches', find(w, 'wheel-empty').length === 1);
  check('no entries drawn', find(w, 'wheel-item').length === 0);
  picked = null;
  search.fire('keydown', { key: 'Enter', preventDefault() {} });
  check('Enter on an empty wheel picks nothing rather than throwing', picked === null);

  console.log('\n=== clearing the search restores everything ===');
  search.value = '';
  search.fire('input'); await wait();
  check('entries are back', find(w, 'wheel-item').length > 3);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
