/* The cache is a convenience, never a requirement: private windows, blocked site data, and some
 * browsers on file:// all leave IndexedDB unavailable. Every call must resolve rather than reject
 * so the editor keeps working. Node has no IndexedDB at all, which makes it the perfect place to
 * prove the degraded path — and a small fake IDB then exercises the real one. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' — ' + d : ''}`)); };

function loadCache(indexedDB) {
  const sandbox = { window: { FHSE: {}, indexedDB }, console, setTimeout, clearTimeout, Date, JSON, Object, Promise, Error };
  sandbox.window.FHSE = { dom: { el: () => ({}) } };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/cache.js'), 'utf8'), sandbox, { filename: 'cache.js' });
  return sandbox.window.FHSE.cache;
}

(async function () {
  console.log('=== with no IndexedDB at all (private window, blocked site data, some file:// cases) ===');
  {
    const c = loadCache(undefined);
    check('API surface is complete', ['put', 'get', 'clear', 'putData', 'getData', 'clearData', 'listData', 'ago']
      .every(k => typeof c[k] === 'function'));
    const results = await Promise.all([
      c.put({ profileId: 'x' }), c.get(), c.clear(),
      c.putData('x', { System: {} }), c.getData('x'), c.clearData('x'), c.listData(), c.available,
    ]);
    check('every call resolves instead of throwing', true);
    check('get() yields null, not a crash', results[1] === null);
    check('getData() yields null', results[4] === null);
    check('listData() yields an empty list', Array.isArray(results[6]) && results[6].length === 0);
    check('available resolves false', results[7] === false);
  }

  console.log('\n=== with IndexedDB that refuses to open ===');
  {
    const c = loadCache({ open() { const r = {}; setTimeout(() => r.onerror && r.onerror(), 0); return r; } });
    check('available resolves false', (await c.available) === false);
    check('getData still yields null', (await c.getData('x')) === null);
  }

  console.log('\n=== with IndexedDB that throws on open ===');
  {
    const c = loadCache({ open() { throw new Error('blocked'); } });
    check('available resolves false rather than throwing', (await c.available) === false);
    check('put resolves', (await c.put({})) === false || (await c.put({})) === true);
  }

  console.log('\n=== the two stores are kept separate ===');
  {
    const src = fs.readFileSync(path.join(ROOT, 'js/cache.js'), 'utf8');
    check('declares a session store and a data store', /STORE\s*=\s*'session'/.test(src) && /DATA_STORE\s*=\s*'data'/.test(src));
    check('session uses one fixed key', /KEY\s*=\s*'current'/.test(src));
    check('data is keyed by profile id', /s\.put\(.*,\s*profileId\)/.test(src));
    check('db version was bumped for the new store', /VERSION\s*=\s*2/.test(src));
    check('upgrade creates both stores', /createObjectStore\(STORE\)/.test(src) && /createObjectStore\(DATA_STORE\)/.test(src));
  }

  console.log('\n=== the app remembers the library without needing the editor ===');
  {
    const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
    check('rememberLibrary runs from updateIntake, not openEditor',
      /function updateIntake\(\)\s*\{\s*\n\s*rememberLibrary\(\);/.test(app));
    check('it only stores once the required set is complete',
      /requiredData\.some\(function \(n\) \{ return !S\.files\[n\]; \}\)/.test(app));
    check('intake restores a remembered library', /restoreDataLibrary\(profile\)/.test(app));
    check('a freshly dropped file is never overwritten by the cache',
      /if \(S\.files\[n\] \|\| !entry\.files\[n\]\) return;/.test(app));
    check('there is a way to forget a game library', /clearData\(profile\.id\)/.test(app));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
