/* Where the games are installed on THIS machine.
 *
 * Most of these tests check the editor's behaviour against the real data files a game ships --
 * that is the whole point of them, since a profile that matches nothing in System.json is exactly
 * the bug worth catching. But the install path is different on every machine, and hard-coding one
 * person's drive means the suite fails for everyone else and quietly publishes their disk layout.
 *
 * So: resolve at run time, and let a test SKIP cleanly when a game is not installed. A skip is an
 * honest result here -- the check needs files that are not present -- and it keeps the suite
 * runnable by someone who owns one of these games, or none of them.
 *
 * Override any of them explicitly if your copy lives somewhere unusual:
 *
 *   SAVEDELVER_FH1="D:/Games/Fear & Hunger/www"   node tools/tests/test-fh-edits.js
 *   SAVEDELVER_STEAM="D:/SteamLibrary/steamapps/common"  node tools/tests/test-profiles.js
 */
const fs = require('fs'), path = require('path');

const GAMES = {
  // `sub` is the folder inside the install that holds `data`. MZ games have no www.
  fh1: { env: 'SAVEDELVER_FH1', dir: 'Fear & Hunger',           sub: 'www', title: 'Fear & Hunger' },
  fh2: { env: 'SAVEDELVER_FH2', dir: 'Fear & Hunger 2 Termina', sub: 'www', title: 'Fear & Hunger 2: Termina' },
  lo:  { env: 'SAVEDELVER_LO',  dir: 'Look Outside',            sub: '',    title: 'Look Outside' },
};

/* Steam scatters libraries across drives. libraryfolders.vdf is the authoritative list, so read it
 * where it exists and fall back to the conventional layouts otherwise. */
function steamCommonDirs() {
  if (process.env.SAVEDELVER_STEAM) return [process.env.SAVEDELVER_STEAM];
  const out = [], seen = new Set();
  const add = p => { const k = p.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(p); } };

  const vdfs = [];
  for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) {
    if (base) vdfs.push(path.join(base, 'Steam', 'steamapps', 'libraryfolders.vdf'));
  }
  for (const d of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    for (const layout of ['Program Files/Steam', 'SteamLibrary', 'Steam', 'Games/Steam']) {
      vdfs.push(`${d}:/${layout}/steamapps/libraryfolders.vdf`);
    }
  }
  for (const v of vdfs) {
    let text;
    try { text = fs.readFileSync(v, 'utf8'); } catch (e) { continue; }
    add(path.join(path.dirname(v), 'common'));
    // Entries look like:  "path"   "D:\\SteamLibrary"
    for (const m of text.matchAll(/"path"\s*"([^"]+)"/g)) {
      add(path.join(m[1].split('\\\\').join('/'), 'steamapps', 'common'));
    }
  }
  // Non-Steam / non-Windows fallbacks, so a clone is at least testable elsewhere.
  if (process.env.HOME) {
    add(path.join(process.env.HOME, '.steam', 'steam', 'steamapps', 'common'));
    add(path.join(process.env.HOME, 'Library', 'Application Support', 'Steam', 'steamapps', 'common'));
  }
  return out;
}

let COMMON = null;
const cache = {};

/* The folder holding `data` for one game, or null when it is not installed here. */
function game(key) {
  if (key in cache) return cache[key];
  const g = GAMES[key];
  if (!g) throw new Error('unknown game key: ' + key);

  const candidates = [];
  if (process.env[g.env]) candidates.push(process.env[g.env]);
  if (COMMON === null) COMMON = steamCommonDirs();
  for (const c of COMMON) candidates.push(path.join(c, g.dir, g.sub));

  for (const c of candidates) {
    // `data/System.json` is the proof it is really an install, not an empty folder of that name.
    if (fs.existsSync(path.join(c, 'data', 'System.json'))) return (cache[key] = c.split('\\').join('/'));
  }
  return (cache[key] = null);
}

/* Print a consistent skip line, so a run with nothing installed still reads clearly. */
function skip(key, why) {
  const g = GAMES[key];
  console.log(`  SKIP  ${g ? g.title : key} is not installed here${why ? ' — ' + why : ''} (set ${g ? g.env : 'the override'} to point at it)`);
  return null;
}

/* For a test that checks exactly one game: say so and stop, successfully. Exit 0 matters — a
 * missing game is not a failing test, and a red suite nobody can fix teaches people to ignore it. */
function bail(key) {
  skip(key);
  console.log('\n0 passed, 0 failed (skipped)');
  process.exit(0);
}

module.exports = { game, skip, bail, GAMES, title: k => (GAMES[k] || {}).title || k };
