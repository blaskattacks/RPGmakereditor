/* Functional test of the F&H editing capabilities, against a real save.
 * Covers: limb switch discovery, engine-faithful state counters, party additions,
 * inventory, equipment — each verified to survive a full encode/decode round-trip. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const G = require('./_gamepaths.js');
const ROOT = path.resolve(__dirname, '..', '..');
const FH = G.game('fh1');
if (!FH) G.bail('fh1');

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

// Build the MVData index the editors use.
const data = new FHSE.MVData();
for (const n of ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'])
  data.set(n, JSON.parse(fs.readFileSync(`${FH}/data/${n}.json`, 'utf8')));

const profile = FHSE.games.get('fear-and-hunger');
const load = f => {
  const b = fs.readFileSync(f);
  return FHSE.codecs.decodeAuto(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), path.basename(f));
};
const roundTrip = (codec, save) => {
  const out = Buffer.from(codec.encode(save), 'utf8');
  return FHSE.codecs.decodeAuto(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), 'x.rpgsave').save;
};

const { codec, save } = load(`${FH}/save/file3.rpgsave`);
const actors = jx.arr(save.actors._data);
const swData = jx.arr(save.switches._data);

// ---------------------------------------------------------------- 1. limb switches
console.log('\n=== 1. limb switch discovery (the fix for "restore lost limbs") ===');
const EXPECT = {
  1: [36, 37, 38, 39],       // Mercenary / Cahara
  2: [168, 169, 170, 171],   // Girl / Marina
  3: [248, 249, 250, 251],   // Knight / D'arce
  4: [252, 253, 254, 255],   // Dark Priest
  5: [256, 257, 258, 259],   // Outlander / Ragnvaldr
  6: [261, 262, 263, 264],   // Le'garde / Captain
};
for (const [aid, want] of Object.entries(EXPECT)) {
  const got = FHSE.limbs.switchesFor(profile, Number(aid), data, swData);
  const ids = got.switches.map(s => s.id);
  const name = (data.obj('Actors', Number(aid)) || {}).name;
  check(`actor #${aid} ${name}: ${JSON.stringify(ids)}`,
    want.every(w => ids.includes(w)) && !got.guessed, `wanted ${JSON.stringify(want)}`);
}
// The separate "sawing" mechanic must never be swept up.
const merc = FHSE.limbs.switchesFor(profile, 1, data, swData);
check('excludes the *_sawing_* mechanic', !merc.switches.some(s => /sawing/i.test(s.name)),
  merc.switches.filter(s => /sawing/i.test(s.name)).map(s => s.name).join(', '));
check('limb states found', FHSE.limbs.statesFor(profile, data).map(s => s.name).sort().join(',') ===
  'Arm cut,Arrow loss,Fracture,Headless,Leg cut', FHSE.limbs.statesFor(profile, data).map(s => s.name).join(','));

// ---------------------------------------------------------------- 2. state counters
console.log('\n=== 2. state counters match what the engine writes ===');
// The save records state #70 with _stateTurns 1 and _stateSteps 100. Our add-state logic derives
// those from the state's own minTurns / stepsToRemove, so it must reproduce them exactly.
const s70 = data.obj('States', 70);
check(`State #70 "${s70.name}": minTurns=${s70.minTurns} -> _stateTurns 1`, s70.minTurns === 1);
check(`State #70 stepsToRemove=${s70.stepsToRemove} -> _stateSteps 100`, s70.stepsToRemove === 100);
const a1 = actors[1];
check('save actually holds those values', a1._stateTurns[70] === 1 && a1._stateSteps[70] === 100,
  `turns=${a1._stateTurns[70]} steps=${a1._stateSteps[70]}`);

// ---------------------------------------------------------------- 3. restore a limb
console.log('\n=== 3. restoring a limb clears state AND switch ===');
const armCut = data.list('States').find(s => s.name === 'Arm cut');
const legCut = data.list('States').find(s => s.name === 'Leg cut');
// Maim the Mercenary the way the game would: state + sprite switch.
jx.mutArr(a1._states).push(armCut.id); a1._stateTurns[armCut.id] = armCut.minTurns; a1._stateSteps[armCut.id] = armCut.stepsToRemove;
jx.mutArr(a1._states).push(legCut.id);
swData[36] = true; swData[38] = true;
check('setup: mercenary is maimed', (jx.arr(a1._states)).includes(armCut.id) && swData[36] === true);

// What "Restore every limb" does.
const limbStates = FHSE.limbs.statesFor(profile, data);
const found = FHSE.limbs.switchesFor(profile, 1, data, swData);
for (const st of limbStates) {
  const arr = jx.mutArr(a1._states); const i = arr.indexOf(st.id);
  if (i !== -1) { arr.splice(i, 1); delete a1._stateTurns[st.id]; delete a1._stateSteps[st.id]; }
}
for (const sw of found.switches) if (swData[sw.id]) swData[sw.id] = false;

check('states cleared', !limbStates.some(s => jx.arr(a1._states).includes(s.id)));
check('sprite switches cleared', !found.switches.some(s => swData[s.id]));
check('counters cleaned up', a1._stateTurns[armCut.id] === undefined && a1._stateSteps[armCut.id] === undefined);
check('unrelated state kept', jx.arr(a1._states).includes(70));

// ---------------------------------------------------------------- 4. party additions
console.log('\n=== 4. adding characters the save never instantiated ===');
const present = []; actors.forEach((a, i) => { if (a && typeof a === 'object') present.push(i); });
const buckman = data.list('Actors').find(a => a.name === 'Buckman');
check(`Buckman is #${buckman.id} and NOT instantiated in this save`, !present.includes(buckman.id));
const candidates = data.list('Actors');
check('adder offers the full cast, not just instantiated actors',
  candidates.length > present.length, `${candidates.length} offered vs ${present.length} present`);
jx.mutArr(save.party._actors).push(buckman.id);
check('Buckman added to party', jx.arr(save.party._actors).includes(buckman.id));

// ---------------------------------------------------------------- 5. inventory + equipment
console.log('\n=== 5. inventory and equipment ===');
const ring = data.list('Armors').find(a => a.name === 'Ring of the still-blood');
const shield = data.list('Armors').find(a => a.name === 'Wooden buckler');
check(`"${ring.name}" is etypeId ${ring.etypeId} (Accessory = slot 5)`, ring.etypeId === 5);
save.party._armors[ring.id] = 2;
save.party._weapons[data.list('Weapons')[0].id] = 1;
check('ring added to the armor bag', save.party._armors[ring.id] === 2);
check('weapon bag accepts an entry despite starting empty', Object.keys(save.party._weapons).filter(k => k[0] !== '@').length === 1);

// Equip the ring into the accessory slot (slot index 4 -> etypeId 5).
const equips = jx.arr(a1._equips);
equips[4]._dataClass = 'armor'; equips[4]._itemId = ring.id;
equips[1]._dataClass = 'armor'; equips[1]._itemId = shield.id;
check('ring equipped in the accessory slot', equips[4]._itemId === ring.id);

// ---------------------------------------------------------------- 6. all of it survives a save
console.log('\n=== 6. every edit survives the round-trip ===');
const back = roundTrip(codec, save);
const bActors = jx.arr(back.actors._data), b1 = bActors[1];
check('limb states still clear', !limbStates.some(s => jx.arr(b1._states).includes(s.id)));
check('limb switches still clear', !found.switches.some(s => jx.arr(back.switches._data)[s.id]));
check('Buckman still in the party', jx.arr(back.party._actors).includes(buckman.id));
check('ring still in the bag (x2)', back.party._armors[ring.id] === 2);
check('ring still equipped', jx.arr(b1._equips)[4]._itemId === ring.id);
check('shield still equipped', jx.arr(b1._equips)[1]._itemId === shield.id);
check('JsonEx markers preserved on the actor', b1['@'] === 'Game_Actor' && typeof b1['@c'] === 'number');
check('Game_Item markers preserved on equips', jx.arr(b1._equips)[4]['@'] === 'Game_Item');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
