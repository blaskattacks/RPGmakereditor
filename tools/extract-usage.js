/* extract-usage.js — build a "where is this used?" index for a game's switches and variables.
 *
 * RPG Maker stores NO notes for switches or variables — System.json holds a bare name and nothing
 * else. (Only database entries like Items and Skills have a `note` field.) So the only way to know
 * what `Sleep_cool_down` or `HUNGER_MERC` actually does is to look at where the game writes and
 * tests it, which is exactly what this reads out of the event data.
 *
 * The result is genuinely informative: HUNGER_MERC turns out to be compared against 63/68/78/88/
 * 108/128, which are the hunger-level breakpoints, inside a common event called
 * "HUNGER LEVELS_Mercenary". That is documentation the game never wrote down.
 *
 *   node tools/extract-usage.js "<game>/www" <outJs> <profileId>
 *
 * Output is deliberately compact — place names are pooled into a shared string table and the
 * per-entry lists are capped, because this ships to the browser alongside the editor.
 */
const fs = require('fs');
const path = require('path');
const G = require('./tests/_gamepaths.js');

const WWW = process.argv[2] || G.game('fh1');
const OUT = process.argv[3] || path.join(__dirname, '..', 'js', 'games', 'usage-fh1.js');
const PROFILE = process.argv[4] || 'fear-and-hunger';
const DATA = path.join(WWW, 'data');

const Sys = JSON.parse(fs.readFileSync(path.join(DATA, 'System.json'), 'utf8'));
const Infos = JSON.parse(fs.readFileSync(path.join(DATA, 'MapInfos.json'), 'utf8'));
const mapName = id => { const m = Infos.filter(Boolean).find(i => i.id === id); return (m && m.name) || ('Map' + id); };

const OPS = ['==', '>=', '<=', '>', '<', '!='];
const ASSIGN = ['=', '+=', '-=', '*=', '/=', '%='];
const CAP = 10;            // most lists say everything useful within a handful of entries

// Pooled place names, so "common event \"FOOD_small\"" is stored once however often it appears.
const places = [];
const placeIx = new Map();
const placeId = s => { let i = placeIx.get(s); if (i === undefined) { i = places.length; places.push(s); placeIx.set(s, i); } return i; };

const V = {}, S = {};
const recV = id => (V[id] ||= { w: 0, t: 0, s: 0, set: new Set(), add: new Set(), cmp: new Set(), at: new Set() });
const recS = id => (S[id] ||= { on: 0, off: 0, t: 0, at: new Set() });

function scanList(list, where) {
  if (!Array.isArray(list)) return;
  const pid = placeId(where);
  for (const c of list) {
    const p = c.parameters || [];

    if (c.code === 122) {                                  // Control Variables
      const [from, to, op, operandType] = p;
      for (let id = from; id <= to && id - from < 64; id++) {
        const r = recV(id); r.w++; r.at.add(pid);
        let val;
        if (operandType === 0) val = String(p[4]);
        else if (operandType === 1) val = 'var' + p[4];
        else if (operandType === 2) val = `random ${p[4]}-${p[5]}`;
        else if (operandType === 3) val = 'game data';
        else val = 'script';
        if (op === 0) r.set.add(val); else if (op === 1) r.add.add(val);
      }
    }
    if (c.code === 121) {                                  // Control Switches
      const [from, to, off] = p;
      for (let id = from; id <= to && id - from < 64; id++) {
        const r = recS(id); r.at.add(pid);
        if (off === 0) r.on++; else r.off++;
      }
    }
    if (c.code === 111) {                                  // Conditional Branch
      if (p[0] === 1) { const r = recV(p[1]); r.t++; r.at.add(pid); r.cmp.add((OPS[p[4]] || '?') + ' ' + (p[2] === 0 ? p[3] : 'var' + p[3])); }
      if (p[0] === 0) { const r = recS(p[1]); r.t++; r.at.add(pid); }
    }
    if ((c.code === 401 || c.code === 101 || c.code === 405) && typeof p[0] === 'string') {
      for (const m of p[0].matchAll(/\\V\[(\d+)\]/gi)) { const r = recV(Number(m[1])); r.s++; r.at.add(pid); }
    }
    if ((c.code === 355 || c.code === 655) && typeof p[0] === 'string') {
      for (const m of p[0].matchAll(/\$gameVariables\s*\.\s*(?:value|setValue)\s*\(\s*(\d+)/g)) {
        const r = recV(Number(m[1])); r.w++; r.at.add(pid); r.set.add('script');
      }
      for (const m of p[0].matchAll(/\$gameSwitches\s*\.\s*(?:value|setValue)\s*\(\s*(\d+)/g)) {
        const r = recS(Number(m[1])); r.on++; r.at.add(pid);
      }
    }
  }
}

let files = 0;
for (const f of fs.readdirSync(DATA).filter(n => /^(Map\d+|CommonEvents)\.json$/.test(n))) {
  const json = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  files++;
  if (f === 'CommonEvents.json') {
    json.filter(Boolean).forEach(ce => scanList(ce.list, `common event "${ce.name}"`));
  } else {
    const nm = mapName(Number(f.match(/\d+/)[0]));
    (json.events || []).filter(Boolean).forEach(ev => (ev.pages || []).forEach(pg => scanList(pg.list, nm)));
  }
}

const trim = set => [...set].slice(0, CAP);
const outV = {}, outS = {};
for (const [id, r] of Object.entries(V)) {
  if (!Sys.variables[id]) continue;                        // unnamed slots aren't worth shipping
  outV[id] = { w: r.w, t: r.t, s: r.s, set: trim(r.set), add: trim(r.add), cmp: trim(r.cmp), at: trim(r.at), n: r.at.size };
}
for (const [id, r] of Object.entries(S)) {
  if (!Sys.switches[id]) continue;
  outS[id] = { on: r.on, off: r.off, t: r.t, at: trim(r.at), n: r.at.size };
}

const namedV = Sys.variables.filter(Boolean).length, namedS = Sys.switches.filter(Boolean).length;
console.log(`${files} data files scanned`);
console.log(`variables: ${Object.keys(outV).length} of ${namedV} named have recorded usage`);
console.log(`switches:  ${Object.keys(outS).length} of ${namedS} named have recorded usage`);
console.log(`places pooled: ${places.length}`);

const payload = { places, vars: outV, switches: outS };
const js = `/* games/usage-*.js — where each switch and variable is used, read out of this game's own
 * event data by tools/extract-usage.js.
 *
 * RPG Maker keeps no notes for switches or variables: System.json stores a bare name and nothing
 * else. This is the next best thing — how often each one is written and tested, the values it gets
 * set to and compared against, and which maps or common events touch it. For HUNGER_MERC that
 * surfaces the actual hunger breakpoints; for a switch it tells you whether it is a one-shot story
 * flag or something toggled all over the game.
 *
 * Place names are pooled in \`places\` and referenced by index from each entry's \`at\`.
 */
(function (FHSE) {
  'use strict';
  FHSE.usage = FHSE.usage || {};
  FHSE.usage['${PROFILE}'] = ${JSON.stringify(payload)};
})(window.FHSE);
`;
fs.writeFileSync(OUT, js);
console.log(`\nwrote ${OUT} (${(Buffer.byteLength(js) / 1024).toFixed(0)} KB)`);
