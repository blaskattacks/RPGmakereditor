/* cache.js — a local crash-recovery cache for the session in progress.
 *
 * Editing a save means dropping in nine files and then making a pile of edits that exist only in
 * memory. A stray refresh or a closed tab throws all of it away. This keeps the working session in
 * the browser's own storage so it can be offered back.
 *
 * IndexedDB, not localStorage: a session is a few megabytes (Termina's data files alone are ~1MB,
 * a save ~400KB), which is past what localStorage is safe for, and IndexedDB stores ArrayBuffers
 * and plain objects directly instead of base64-inflating them. Everything stays on this machine —
 * same as the rest of the editor, nothing is uploaded.
 *
 * Storage can be unavailable (private windows, file:// in some browsers, blocked site data), so
 * every call resolves rather than rejects and the app treats caching as a bonus, never a
 * requirement. `FHSE.cache.available` reports whether it actually works.
 */
(function (FHSE) {
  'use strict';

  /* Two stores, because they answer different questions:
   *   session — the ONE edit in progress, so a crash doesn't lose it. Single key; starting a new
   *             edit replaces it, which is what you want for "what was I doing?".
   *   data    — the game's data files, keyed BY GAME and kept indefinitely. These never change
   *             between sessions, so re-picking the folder every time is pure friction. Cached the
   *             moment a game's required set is complete, not when the editor opens, so uploading
   *             and wandering off still counts. */
  var DB_NAME = 'savedelver', STORE = 'session', DATA_STORE = 'data', KEY = 'current', VERSION = 2;
  var dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var idb = window.indexedDB;
      if (!idb) return resolve(null);
      var req;
      try { req = idb.open(DB_NAME, VERSION); }
      catch (e) { return resolve(null); }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        if (!db.objectStoreNames.contains(DATA_STORE)) db.createObjectStore(DATA_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
      req.onblocked = function () { resolve(null); };
    });
    return dbPromise;
  }

  function tx(mode, fn, storeName) {
    var name = storeName || STORE;
    return openDB().then(function (db) {
      if (!db) return null;
      if (!db.objectStoreNames.contains(name)) return null;
      return new Promise(function (resolve) {
        var t, store;
        try { t = db.transaction(name, mode); store = t.objectStore(name); }
        catch (e) { return resolve(null); }
        var req = fn(store);
        t.oncomplete = function () { resolve(req ? req.result : null); };
        t.onerror = function () { resolve(null); };
        t.onabort = function () { resolve(null); };
      });
    }).catch(function () { return null; });
  }

  /* What a session needs to come back exactly as it was:
   *   original  — the bytes the user gave us, so "discard & reload" still works
   *   encoded   — the CURRENT edits, already run through the codec (compact, and it is exactly
   *               what a download would contain, so restoring cannot drift from saving)
   *   files     — the parsed data JSON, so names resolve without re-picking the folder  */
  function put(session) {
    session.savedAt = Date.now();
    session.v = 1;
    return tx('readwrite', function (s) { return s.put(session, KEY); })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  function get() {
    return tx('readonly', function (s) { return s.get(KEY); })
      .then(function (v) { return (v && v.v === 1) ? v : null; })
      .catch(function () { return null; });
  }

  function clear() {
    return tx('readwrite', function (s) { return s.delete(KEY); })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  /* ---- the remembered data library, per game ----
   * A game's www\data never changes between playthroughs, so once it has been provided there is
   * no reason to ask again. Keyed by profile id, so several games can be remembered at once and
   * editing one doesn't evict another. */
  function putData(profileId, files) {
    if (!profileId || !files) return Promise.resolve(false);
    var names = Object.keys(files);
    if (!names.length) return Promise.resolve(false);
    var bytes = 0;
    try { bytes = names.reduce(function (n, k) { return n + JSON.stringify(files[k]).length; }, 0); } catch (e) {}
    return tx('readwrite', function (s) {
      return s.put({ v: 1, files: files, names: names, bytes: bytes, savedAt: Date.now() }, profileId);
    }, DATA_STORE).then(function () { return true; }).catch(function () { return false; });
  }

  function getData(profileId) {
    if (!profileId) return Promise.resolve(null);
    return tx('readonly', function (s) { return s.get(profileId); }, DATA_STORE)
      .then(function (v) { return (v && v.v === 1 && v.files) ? v : null; })
      .catch(function () { return null; });
  }

  function clearData(profileId) {
    return tx('readwrite', function (s) {
      return profileId ? s.delete(profileId) : s.clear();
    }, DATA_STORE).then(function () { return true; }).catch(function () { return false; });
  }

  // Which games have a remembered library, for a manage/forget UI.
  function listData() {
    return openDB().then(function (db) {
      if (!db || !db.objectStoreNames.contains(DATA_STORE)) return [];
      return new Promise(function (resolve) {
        var out = [];
        var t, store;
        try { t = db.transaction(DATA_STORE, 'readonly'); store = t.objectStore(DATA_STORE); }
        catch (e) { return resolve([]); }
        var req = store.openCursor();
        req.onsuccess = function () {
          var c = req.result;
          if (!c) return;
          out.push({ profileId: c.key, names: c.value.names || [], bytes: c.value.bytes || 0, savedAt: c.value.savedAt });
          c.continue();
        };
        t.oncomplete = function () { resolve(out); };
        t.onerror = function () { resolve([]); };
      });
    }).catch(function () { return []; });
  }

  // Probe once so the UI can tell the user plainly when recovery is not available.
  var availability = openDB().then(function (db) { return !!db; });

  FHSE.cache = {
    put: put, get: get, clear: clear,
    putData: putData, getData: getData, clearData: clearData, listData: listData,
    available: availability,
    /* Human-friendly age, for the restore prompt. */
    ago: function (ts) {
      var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
      if (s < 60) return 'moments ago';
      var m = Math.round(s / 60);
      if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
      var h = Math.round(m / 60);
      if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
      var d = Math.round(h / 24);
      return d + (d === 1 ? ' day ago' : ' days ago');
    }
  };
})(window.FHSE);
