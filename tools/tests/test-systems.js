/* A profile's `systems` groups are matched by NAME against the game's own System.json, so a
 * renamed or mistyped pattern silently yields an empty group. This checks every declared pattern
 * resolves, and that anything offered as an editable number really is one in a real save —
 * Look Outside's roomExploration is a 457-entry array, and editing it as a scalar would wreck it. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const G = require('./_gamepaths.js');
const ROOT = path.resolve(__dirname, '..', '..');

// A game that is not installed on this machine drops out with a SKIP line, rather than crashing.
const GAMES = [
  { key: 'lo',  id: 'look-outside',      www: G.game('lo'),  save: 'save/file1.rmmzsave' },
  { key: 'fh1', id: 'fear-and-hunger',   www: G.game('fh1'), save: 'save/file3.rpgsave' },
  { key: 'fh2', id: 'fear-and-hunger-2', www: G.game('fh2'), save: 'save/file1.rpgsave' },
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
const findByName = (names, re) => { const o = []; for (let i = 1; i < names.length; i++) if (names[i] && re.test(names[i])) o.push(i); return o; };

check('systems editor is registered', !!(FHSE.editors && FHSE.editors.systems));

for (const G of GAMES) {
  const profile = FHSE.games.get(G.id);
  const systems = (profile && profile.systems) || [];
  if (!systems.length) continue;
  console.log(`\n######## ${G.id} — ${systems.length} systems ########`);
  const dataDir = path.join(G.www, 'data');
  if (!fs.existsSync(dataDir)) { console.log('  SKIP  not installed'); continue; }
  const Sys = JSON.parse(fs.readFileSync(path.join(dataDir, 'System.json'), 'utf8'));

  let save = null;
  if (G.save && fs.existsSync(path.join(G.www, G.save))) {
    const b = fs.readFileSync(path.join(G.www, G.save));
    save = FHSE.codecs.decodeAuto(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), path.basename(G.save)).save;
  }
  const VR = save ? (jx.arr(save.variables._data) || []) : null;

  for (const sys of systems) {
    let total = 0;

    /* A grid declares exclusive state: every row, column AND combined cell switch must exist, or
     * picking a square would half-set the game's clock. */
    if (sys.grid) {
      const g = sys.grid;
      const byName = new Set(Sys.switches.filter(Boolean));
      const cellName = (r, c) => g.cell.replace('{row}', r).replace('{col}', c.replace(g.colPrefix || '', ''));
      const missRow = g.rows.filter(n => !byName.has(n));
      const missCol = g.cols.filter(n => !byName.has(n));
      const cells = [];
      for (const r of g.rows) for (const c of g.cols) cells.push(cellName(r, c));
      const missCell = cells.filter(n => !byName.has(n));
      check(`${sys.name}: all ${g.rows.length} row switches exist`, missRow.length === 0, missRow.join(', '));
      check(`${sys.name}: all ${g.cols.length} column switches exist`, missCol.length === 0, missCol.join(', '));
      check(`${sys.name}: all ${cells.length} combined cells exist`, missCell.length === 0, missCell.join(', '));
      check(`${sys.name}: 'clear' switches exist`, (g.clear || []).every(n => byName.has(n)),
        (g.clear || []).filter(n => !byName.has(n)).join(', '));
      // A real save should sit on at most one row and one column.
      if (save) {
        const SW = jx.arr(save.switches._data) || [];
        const idOf = {}; Sys.switches.forEach((n, i) => { if (n) idOf[n] = i; });
        const rowsOn = g.rows.filter(n => SW[idOf[n]]);
        const colsOn = g.cols.filter(n => SW[idOf[n]]);
        console.log(`        save sits at: ${rowsOn.join('+') || '(no row)'} / ${colsOn.join('+') || '(no column)'}`);
        check(`${sys.name}: the save is on at most one row`, rowsOn.length <= 1, rowsOn.join(', '));
        check(`${sys.name}: the save is on at most one column`, colsOn.length <= 1, colsOn.join(', '));
      }
      continue;
    }

    if (sys.switches) {
      const hits = findByName(Sys.switches, sys.switches);
      total += hits.length;
      check(`${sys.name}: switch pattern matches (${hits.length})`, hits.length > 0, String(sys.switches));
    }
    for (const spec of sys.variables || []) {
      const hits = findByName(Sys.variables, spec.re);
      total += hits.length;
      check(`${sys.name}: "${spec.label}" resolves`, hits.length > 0, String(spec.re));
      // Ambiguous patterns would edit the wrong slot.
      check(`${sys.name}: "${spec.label}" is unambiguous`, hits.length <= 1,
        hits.map(i => Sys.variables[i]).join(', '));
      // A field the editor offers as a NUMBER must not hold a structure in a real save.
      if (VR && hits.length === 1) {
        const v = VR[hits[0]];
        const complex = v !== null && typeof v === 'object';
        const editable = !complex;
        if (complex) {
          console.log(`        (${spec.label} holds a ${Array.isArray(v) ? 'array[' + v.length + ']' : 'object'} — editor shows it read-only)`);
        }
        check(`${sys.name}: "${spec.label}" is a scalar, or declared knowing it isn't`,
          editable || spec.label === 'Rooms explored');
      }
    }
    check(`${sys.name}: group is not empty`, total > 0);
  }

  /* Transient display state must stay out: editing it changes nothing except the next redraw.
   * These are real variable names in Look Outside that look tempting but are UI scratch. */
  if (G.id === 'look-outside') {
    const banned = ['shopItem', 'shopDesc', 'shopItemName', 'shopPrice', 'shopDispo', 'exploreMeterDisplay', 'ExploreMinDisplay'];
    const declared = systems.flatMap(s => (s.variables || []).map(v => v.re));
    const leaked = banned.filter(name => declared.some(re => re.test(name)));
    check('transient display variables are not exposed', leaked.length === 0, leaked.join(', '));
    check('crafting group covers all 16 recipes + the kit',
      findByName(Sys.switches, systems.find(s => /recipe/i.test(s.name)).switches).length === 17);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
