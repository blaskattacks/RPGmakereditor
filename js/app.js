/* app.js — controller: game picker -> file intake -> editor routing -> download. */
(function (FHSE) {
  'use strict';
  var el = FHSE.dom.el;
  function $(s) { return document.querySelector(s); }

  var S = { profile: null, codec: null, data: null, save: null, saveInput: null, saveName: '', files: {}, rows: {}, dirty: false, view: 'characters', actorId: null };
  // The codec detected from the save file itself wins over the profile's `engine` hint, so an
  // unverified profile guessing the wrong engine still opens and re-encodes the save correctly.
  function codec() { return S.codec || FHSE.codecs[S.profile.engine] || FHSE.codecs.rpgmv; }
  function saveExt() { return (S.codec && S.codec.ext) || S.profile.saveExt || '.rpgsave'; }
  var ctx = null;

  // ---------- views ----------
  function showView(name) {
    $('#view-picker').hidden = name !== 'picker';
    $('#view-intake').hidden = name !== 'intake';
    $('#view-editor').hidden = name !== 'editor';
    if (name === 'picker') $('#crumbs').textContent = '';
  }

  function renderPicker() {
    var cards = FHSE.dom.clear($('#game-cards'));
    // Tested profiles first, then named skeletons, then the catch-alls.
    var rank = function (g) { return g.verified ? 0 : (g.generic ? 2 : 1); };
    var all = FHSE.games.all().sort(function (a, b) { return rank(a) - rank(b) || a.title.localeCompare(b.title); });

    all.forEach(function (g) {
      var badge = g.verified
        ? el('span', { class: 'tag ok', title: 'Round-tripped against a real save of this game' }, 'TESTED')
        : el('span', { class: 'tag warn', title: 'Not yet checked against a real save — names still come from the game’s own data files' }, 'SKELETON');
      cards.appendChild(el('div', { class: 'card' + (g.generic ? ' generic' : ''), onclick: function () { startIntake(g); } }, [
        el('h3', {}, g.title),
        el('div', { class: 'blurb' }, g.blurb || ''),
        el('div', { class: 'tags' }, [el('span', { class: 'tag' }, (g.engine || '').toUpperCase()), badge])
      ]));
    });
    cards.appendChild(el('div', { class: 'card soon' }, [
      el('h3', {}, 'Another game?'),
      el('div', { class: 'blurb' }, 'Any unmodified MV or MZ game works through the two “Any RPG Maker…” profiles. Adding a named one is a small file — see the README.'),
      el('span', { class: 'tag' }, 'DIY')
    ]));
  }

  // ---------- intake ----------
  function startIntake(profile) {
    S.profile = profile; S.files = {}; S.saveInput = null; S.saveName = ''; S.data = null; S.save = null; S.codec = null;
    $('#intake-title').textContent = profile.title;
    $('#intake-sub').textContent = profile.blurb || '';
    $('#pick-folder-btn').innerHTML = 'Select your <code>' + (profile.dataFolderLabel || 'www\\data') + '</code> folder';
    renderProfileNotes(profile);
    buildChecklist();
    updateIntake();
    showView('intake');
    restoreDataLibrary(profile);
  }

  /* A game's data files don't change between playthroughs, so once they've been provided we keep
   * them and fill the checklist in automatically — the next visit only needs the save file. */
  function restoreDataLibrary(profile) {
    if (!FHSE.cache || !FHSE.cache.getData) return;
    FHSE.cache.getData(profile.id).then(function (entry) {
      if (!entry || S.profile !== profile) return;      // user moved on while we were reading
      var used = 0;
      profile.requiredData.concat(profile.optionalData || []).forEach(function (n) {
        if (S.files[n] || !entry.files[n]) return;       // never overwrite a file just dropped
        S.files[n] = entry.files[n];
        if (S.rows[n]) S.rows[n].set('remembered ✓', true);
        used++;
      });
      if (!used) return;
      updateIntake();
      renderLibraryNote(profile, entry, used);
    });
  }

  function renderLibraryNote(profile, entry, used) {
    var box = $('#profile-notes');
    var note = el('div', { class: 'banner note' }, [
      el('span', { class: 'i' }, '✓'),
      el('span', {}, [
        el('b', {}, 'Data files remembered. '),
        used + ' of ' + (profile.requiredData.length + (profile.optionalData || []).length) +
        ' filled in from the last time you picked them (' + Math.round((entry.bytes || 0) / 1024) + ' KB, saved ' +
        FHSE.cache.ago(entry.savedAt) + '). You only need the save file. Drop a fresh folder any ' +
        'time to replace them — say, after the game updates.'
      ]),
      el('button', { class: 'btn sm ghost', onclick: function () {
        FHSE.cache.clearData(profile.id).then(function () {
          profile.requiredData.concat(profile.optionalData || []).forEach(function (n) {
            delete S.files[n];
            if (S.rows[n]) S.rows[n].set('not loaded', false);
          });
          note.remove(); updateIntake();
          toast('Forgot the remembered data files for ' + profile.title + '.');
        });
      } }, 'forget them')
    ]);
    box.appendChild(note);
  }

  // Skeleton profiles say so up front, along with anything specific known to trip that game up.
  function renderProfileNotes(profile) {
    var box = FHSE.dom.clear($('#profile-notes'));
    if (!profile.verified) {
      box.appendChild(el('div', { class: 'banner note' }, [
        el('span', { class: 'i' }, '◆'),
        el('span', {}, [
          el('b', {}, profile.generic ? 'Generic profile. ' : 'Unverified profile. '),
          profile.generic
            ? 'This carries no game-specific knowledge — every name you see is read straight from the data files you provide, and the save format is detected from the file itself.'
            : 'Nobody has round-tripped a real save of this game through the editor yet. Names still come from the game’s own data files, so what you see is accurate; the labels and state grouping are the unchecked part.'
        ])
      ]));
    }
    if (profile.caveat) {
      box.appendChild(el('div', { class: 'banner note' }, [el('span', { class: 'i' }, '!'), el('span', {}, profile.caveat)]));
    }
  }

  function makeRow(key, label, hint, req, accept, onFile) {
    var input = el('input', { type: 'file', accept: accept });
    input.addEventListener('change', function () { if (input.files[0]) onFile(input.files[0]); });
    var status = el('span', { class: 'status' }, 'not loaded');
    var row = el('div', { class: 'crow miss', onclick: function (e) { if (e.target.tagName !== 'INPUT') input.click(); } }, [
      el('span', { class: 'dot' }),
      el('div', { class: 'meta' }, [
        el('div', { class: 'name' }, [label, req ? el('span', { class: 'req' }, 'required') : null]),
        el('div', { class: 'hint' }, hint)
      ]),
      status, input
    ]);
    S.rows[key] = {
      set: function (text, ok, err) {
        status.textContent = text;
        row.classList.toggle('ok', !!ok);
        row.classList.toggle('miss', !ok);
        status.style.color = err ? 'var(--bad)' : '';
      }
    };
    return row;
  }

  function buildChecklist() {
    S.rows = {};
    var dataLabel = S.profile.dataFolderLabel || 'www\\data';
    var cl = FHSE.dom.clear($('#checklist'));
    // Accept either extension: the codec is sniffed, so a profile with the wrong engine hint
    // must not stop the picker from offering the file that actually exists on disk.
    cl.appendChild(makeRow('_save', 'Save file', S.profile.saveHint || ('Your ' + (S.profile.saveExt || '.rpgsave') + ' file'),
      true, '.rpgsave,.rmmzsave', loadSave));
    S.profile.requiredData.forEach(function (n) {
      cl.appendChild(makeRow(n, n + '.json', 'from your game’s ' + dataLabel + ' folder', true, '.json', function (f) { loadData(n, f); }));
    });
    (S.profile.optionalData || []).forEach(function (n) {
      cl.appendChild(makeRow(n, n + '.json', 'optional — richer names', false, '.json', function (f) { loadData(n, f); }));
    });
  }

  function loadSave(file) {
    FHSE.dom.readBinary(file).then(function (buffer) {
      var got;
      try { got = FHSE.codecs.decodeAuto(buffer, file.name, S.profile.engine); }
      catch (e) {
        S.saveInput = null; S.saveName = ''; S.codec = null;
        S.rows._save.set('✗ ' + e.message, false, true); updateIntake(); return;
      }
      S.saveInput = buffer; S.saveName = file.name; S.codec = got.codec;
      var n = 0;
      try { (FHSE.jx.arr(got.save.actors._data) || []).forEach(function (a) { if (a && typeof a === 'object') n++; }); } catch (_) {}
      S.rows._save.set(file.name + ' — ' + got.codec.label + ', ' + n + ' characters', true);
      updateIntake();
    });
  }

  function loadData(name, file) {
    FHSE.dom.readText(file).then(function (text) {
      var json;
      try { json = JSON.parse(text); }
      catch (e) { S.rows[name].set('✗ invalid JSON', false, true); return; }
      S.files[name] = json;
      S.rows[name].set(file.name + ' ✓', true);
      updateIntake();
    });
  }

  function ingest(fileList) {
    Array.prototype.slice.call(fileList || []).forEach(function (f) {
      var lower = f.name.toLowerCase();
      if (/\.(rpgsave|rmmzsave)$/.test(lower)) {
        // config/global slots hold settings and the slot index, not a playthrough.
        if (/^(config|global)\./.test(lower)) return;
        loadSave(f); return;
      }
      if (lower.slice(-5) === '.json') {
        var base = f.name.replace(/\.json$/i, '');
        var want = S.profile.requiredData.concat(S.profile.optionalData || []);
        var match = want.filter(function (w) { return w.toLowerCase() === base.toLowerCase(); })[0];
        if (match) loadData(match, f);
      }
    });
  }

  /* Remember the library as soon as it's complete — not when the editor opens. Uploading the
   * folder and then closing the tab should still count, since picking it is the tedious part. */
  var libraryT = null;
  function rememberLibrary() {
    if (!FHSE.cache || !FHSE.cache.putData || !S.profile) return;
    if (S.profile.requiredData.some(function (n) { return !S.files[n]; })) return;
    clearTimeout(libraryT);
    var profile = S.profile, files = {};
    profile.requiredData.concat(profile.optionalData || []).forEach(function (n) { if (S.files[n]) files[n] = S.files[n]; });
    libraryT = setTimeout(function () { FHSE.cache.putData(profile.id, files); }, 400);
  }

  function updateIntake() {
    rememberLibrary();
    var haveSave = !!S.saveInput;
    var missing = S.profile.requiredData.filter(function (n) { return !S.files[n]; });
    /* A save is NOT required. Some of these games ration saving — Termina wants a specific item —
     * so a player who cannot save has no file to bring, which is exactly when they most want to
     * look something up or install a mod. With the data files alone the editor still opens, in a
     * read-only reference mode. */
    $('#open-editor-btn').disabled = (missing.length !== 0);
    $('#open-editor-btn').textContent = haveSave ? 'Open editor' : 'Browse game data';
    var got = S.profile.requiredData.length - missing.length;
    $('#intake-progress').textContent = (haveSave ? 'save loaded' : 'no save — reference mode') +
      ' · ' + got + '/' + S.profile.requiredData.length + ' data files';

    var warns = FHSE.dom.clear($('#intake-warns'));
    // The save disagreeing with the profile's engine is worth saying out loud — it means the
    // profile's hint is wrong (harmless, we use the detected codec) or this is the wrong game.
    if (S.codec && S.codec.id !== S.profile.engine) {
      var expected = FHSE.codecs[S.profile.engine];
      warns.appendChild(el('div', { class: 'warn-line' },
        'ℹ This save is ' + S.codec.label + ', not the ' + ((expected && expected.label) || S.profile.engine) +
        ' this profile expected. Reading it as ' + S.codec.label + ' — the file wins over the profile.'));
    }
    if (S.files.System) {
      var d = new FHSE.MVData();
      Object.keys(S.files).forEach(function (k) { d.set(k, S.files[k]); });
      if (S.profile.detect && !S.profile.detect(d)) {
        warns.appendChild(el('div', { class: 'warn-line' },
          '⚠ System.json title is “' + (d.gameTitle() || '?') + '”, which doesn’t look like ' + S.profile.title + '. You can still proceed, but names may not match.'));
      }
    }
  }

  // ---------- editor ----------
  function actorsArray() { return FHSE.jx.arr(S.save.actors._data) || []; }

  /* Ordered so the people you actually play come first: the leader, then the rest of the party in
   * marching order, then everyone the save happens to have instantiated. The old order was plain
   * actor id, which put whoever occupies slot 1 at the top even when they were nowhere near your
   * party -- easy to start editing the wrong character without noticing. */
  function buildRoster() {
    var arr = actorsArray();
    var party = FHSE.jx.arr(S.save.party._actors) || [];
    var out = [];
    for (var id = 0; id < arr.length; id++) {
      var a = arr[id];
      if (!a || typeof a !== 'object') continue;
      var slot = party.indexOf(id);
      out.push({
        id: id, actor: a, name: a._name || S.data.actor(id),
        inParty: slot !== -1, isLeader: slot === 0, slot: slot
      });
    }
    out.sort(function (x, y) {
      if (x.inParty !== y.inParty) return x.inParty ? -1 : 1;
      if (x.inParty) return x.slot - y.slot;      // marching order
      return x.id - y.id;
    });
    return out;
  }

  // Who the editor should land on: the party leader, else any party member, else the first actor.
  function defaultActor(roster) {
    return roster.filter(function (r) { return r.isLeader; })[0] ||
           roster.filter(function (r) { return r.inParty; })[0] ||
           roster[0] || null;
  }

  function actorById(id) {
    var r = buildRoster();
    if (!r.length) return null;
    var fallback = defaultActor(r);
    if (id == null) { S.actorId = fallback.id; return fallback.actor; }
    var f = r.filter(function (x) { return x.id === id; })[0];
    if (!f) { S.actorId = fallback.id; return fallback.actor; }
    return f.actor;
  }

  function makeCtx() {
    return {
      profile: S.profile, data: S.data, save: S.save,
      markDirty: setDirty, toast: toast,
      roster: buildRoster, refreshRoster: renderRoster,
      rerender: renderContent,   // for edits that change several panels at once
      actor: null
    };
  }

  function openEditor() {
    S.data = new FHSE.MVData();
    Object.keys(S.files).forEach(function (k) { S.data.set(k, S.files[k]); });
    S.reference = !S.saveInput;
    if (S.reference) {
      S.save = null;
      S.saveName = '(no save — reference only)';
    } else {
      try { S.save = codec().decode(S.saveInput); }
      catch (e) { toast(e.message, true); return; }
    }
    S.dirty = false; S.actorId = null; S.view = S.reference ? 'switches' : 'characters'; S.restored = false;
    ctx = makeCtx();
    $('#save-fname').textContent = S.saveName;
    $('#download-btn').textContent = 'Download ' + saveExt();
    $('#crumbs').textContent = S.profile.title + ' · ' + S.saveName;
    updateDirtyPill();
    showView('editor');
    renderShell();
    renderRestoreNotice();   // clears any note left by a previous session
    writeCache();   // capture the freshly-opened session before any edit is made
    loadUsage();
  }

  /* The "where is this used?" index is a few hundred KB per game, so it loads in the background
   * after the editor is already usable. The lists render without it and pick up the ⓘ on the
   * redraw once it lands. */
  function loadUsage() {
    if (!FHSE.usageInfo) return;
    FHSE.usageInfo.load(S.profile.id).then(function (u) {
      if (u && (S.view === 'variables' || S.view === 'switches')) renderContent();
    });
  }

  // Views that act on one selected character, so they get the roster sidebar and ctx.actor.
  function isActorView(v) { return v === 'characters' || v === 'hexen'; }

  function renderShell() {
    var nav = FHSE.dom.clear($('#nav'));
    var items = [];
    // Without a save there is nothing per-character to show, but the game's own tables still are
    // worth reading: the skill tree's shape, and what every switch and variable is for.
    if (!S.reference) items.push(['characters', 'Characters']);
    if ((FHSE.hexen || {})[S.profile.id]) items.push(['hexen', 'Hexen tree']);
    if (!S.reference) items.push(['party', 'Party & inventory']);
    if ((S.profile.systems || []).length && !S.reference) items.push(['systems', 'Game systems']);
    items = items.concat([['variables', 'Variables'], ['switches', 'Switches']]);
    // Needs neither a save nor game data, and is the answer when you can't save at all.
    items.push(['mods', 'Mods']);
    $('#download-btn').hidden = S.reference;
    $('#reload-btn').hidden = S.reference;
    items.forEach(function (it) {
      nav.appendChild(el('button', { class: 'navbtn', 'data-k': it[0], onclick: function () { selectView(it[0]); } }, it[1]));
    });
    if (!nav.querySelector('[data-k="' + S.view + '"]')) S.view = 'characters';
    renderRoster();
    selectView(S.view);
  }

  function selectView(view) {
    S.view = view;
    Array.prototype.forEach.call($('#nav').children, function (b) { b.classList.toggle('active', b.getAttribute('data-k') === view); });
    $('#char-list').hidden = !isActorView(view);
    renderContent();
  }

  /* Commit whatever is half-typed before the DOM holding it goes away.
   *
   * Fields commit on `change`, which the browser fires on blur. Tearing the view down with
   * clear() REMOVES the focused input instead of blurring it, and removal fires nothing -- so a
   * value typed and then abandoned by clicking a tab was silently dropped. Blurring first makes
   * the browser fire `change` normally, and it is a no-op when nothing was edited. */
  function commitPending() {
    var ae = document.activeElement;
    if (!ae || typeof ae.blur !== 'function') return;
    var content = $('#content');
    if (content && content.contains && content.contains(ae) && ae !== content) ae.blur();
  }

  function renderContent() {
    commitPending();
    var content = FHSE.dom.clear($('#content'));
    try {
      if (isActorView(S.view)) {
        ctx.actor = actorById(S.actorId);
        FHSE.editors[S.view].render(content, ctx);
        renderRoster();
      } else FHSE.editors[S.view].render(content, ctx);
    } catch (e) {
      content.appendChild(el('div', { class: 'panel' }, el('p', { class: 'empty' }, 'Could not render this view: ' + e.message)));
      if (window.console) console.error(e);
    }
  }

  function renderRoster() {
    var list = FHSE.dom.clear($('#char-list'));
    var roster = buildRoster();
    var inParty = roster.filter(function (r) { return r.inParty; });
    var rest = roster.filter(function (r) { return !r.inParty; });

    function add(r) {
      list.appendChild(el('div', {
        class: 'char-item' + (r.id === S.actorId ? ' active' : '') + (r.inParty ? '' : ' offparty'),
        onclick: function () { selectActor(r.id); }
      }, [
        el('span', { class: 'cn' }, r.name),
        r.isLeader ? el('span', { class: 'badge lead', title: 'Leads the party in the field' }, 'LEADER') : null,
        el('span', { class: 'lv' }, 'Lv' + (r.actor._level != null ? r.actor._level : '?'))
      ]));
    }

    // Two headed groups rather than one flat list, so "not in your party" is impossible to miss.
    list.appendChild(el('div', { class: 'clbl' }, 'In your party (' + inParty.length + ')'));
    if (!inParty.length) list.appendChild(el('div', { class: 'clnote' }, 'nobody'));
    inParty.forEach(add);
    if (rest.length) {
      list.appendChild(el('div', { class: 'clbl muted' }, 'Elsewhere in this save (' + rest.length + ')'));
      rest.forEach(add);
    }
  }

  function selectActor(id) {
    S.actorId = id;
    // Stay on the current view if it already works per-character (the hexen board does).
    if (!isActorView(S.view)) selectView('characters');
    else renderContent();
  }

  // ---------- save / reload ----------
  function doDownload() {
    if (!S.save) return;
    commitPending();   // a value typed but not yet blurred must still make it into the file
    FHSE.dom.download(S.saveName || ('file1' + saveExt()), codec().encode(S.save));
    S.dirty = false; updateDirtyPill();
    // Downloading doesn't end the session — keep the cache, just record that it's no longer
    // unsaved, so coming back after a crash still finds the work.
    writeCache();
    S.restored = false; renderRestoreNotice();
    toast('Saved ' + (S.saveName || 'file') + ' to your downloads. Check it loads in-game.');
  }

  function doReload() {
    if (S.dirty && !window.confirm('Discard all edits and reload the original save?')) return;
    try { S.save = codec().decode(S.saveInput); }
    catch (e) { toast(e.message, true); return; }
    ctx.save = S.save; S.dirty = false; S.actorId = null; S.restored = false;
    updateDirtyPill(); renderShell(); writeCache();
    toast('Reloaded the original save.');
  }

  /* Leaving the editor for the game picker. Warns first if there are edits that were never
   * downloaded — the cached session survives, so this loses nothing permanently, but walking away
   * from unsaved work without a word would be alarming. */
  function backToPicker() {
    commitPending();
    if (S.dirty && !window.confirm(
      'You have edits you haven\'t downloaded yet.\n\n' +
      'They stay saved in this browser, so you can pick this game again and restore them — but ' +
      'nothing has been written to your save file.\n\nGo back to the game list?')) return;
    writeCache();
    FHSE.dom.clear($('#editor-note'));
    S.restored = false;
    renderResumeBanner();     // the picker should offer whatever we just cached
    showView('picker');
  }

  function setDirty() { S.dirty = true; updateDirtyPill(); scheduleCache(); }
  function updateDirtyPill() { $('#dirty-pill').hidden = !S.dirty; }

  // ---------- crash recovery ----------
  /* Persist the working session so a refresh or a closed tab doesn't discard the edits. Debounced,
   * because a run of checkbox clicks would otherwise re-encode the whole save on every tick. */
  var cacheT = null;
  function scheduleCache() {
    if (!FHSE.cache) return;
    clearTimeout(cacheT);
    cacheT = setTimeout(writeCache, 900);
  }
  function writeCache() {
    if (!FHSE.cache || !S.save || !S.profile) return;
    var encoded;
    // Store the edits already encoded: compact, and identical to what a download would produce,
    // so a restored session can never differ from what saving would have written.
    try { encoded = codec().encode(S.save); }
    catch (e) { return; }
    FHSE.cache.put({
      profileId: S.profile.id, codecId: codec().id,
      saveName: S.saveName, original: S.saveInput, encoded: encoded,
      files: S.files, dirty: S.dirty, view: S.view, actorId: S.actorId
    });
  }

  function restoreSession(sess) {
    var profile = FHSE.games.get(sess.profileId);
    if (!profile) { toast('That session was for a game profile that no longer exists.', true); return; }
    S.profile = profile;
    S.codec = FHSE.codecs[sess.codecId] || null;
    S.saveName = sess.saveName;
    S.saveInput = sess.original;
    S.files = sess.files || {};
    S.data = new FHSE.MVData();
    Object.keys(S.files).forEach(function (k) { S.data.set(k, S.files[k]); });
    try { S.save = codec().decode(sess.encoded); }
    catch (e) { toast('Could not restore that session: ' + e.message, true); return; }
    S.dirty = !!sess.dirty;
    S.actorId = sess.actorId != null ? sess.actorId : null;
    S.view = sess.view || 'characters';
    S.restored = true;
    ctx = makeCtx();
    $('#save-fname').textContent = S.saveName;
    $('#download-btn').textContent = 'Download ' + saveExt();
    $('#crumbs').textContent = S.profile.title + ' · ' + S.saveName;
    updateDirtyPill();
    showView('editor');
    renderShell();
    renderRestoreNotice();
    loadUsage();
  }

  /* Restored edits have never touched the game. Say so until it's dismissed or downloaded — in
   * #editor-note rather than #content, which every view switch clears. */
  function renderRestoreNotice() {
    var host = FHSE.dom.clear($('#editor-note'));
    if (S.reference) {
      host.appendChild(el('div', { class: 'banner note' }, [
        el('span', { class: 'i' }, 'i'),
        el('span', {}, [
          el('b', {}, 'Reference mode — no save loaded. '),
          'You can read this game\'s skill tree, switches and variables, but there is nothing to ' +
          'edit and nothing to download. Go back and add a save file to unlock the rest. ',
          el('b', {}, 'Can\'t save in-game yet? '),
          'That is the usual reason to end up here — these games ration saving. ',
          '`tools/Mod swapper.bat` in this project installs a mod that lifts the limit, and backs ' +
          'up your original files first so you can undo it.'
        ])
      ]));
      return;
    }
    if (!S.restored) return;
    var note = el('div', { class: 'banner note restore-note' }, [
      el('span', { class: 'i' }, '!'),
      el('span', {}, [
        el('b', {}, 'Restored from this browser. '),
        'These edits were recovered from local storage — they were never written to your game. ' +
        'Download the file, put it back in your save folder, and load it once in-game to check ' +
        'it is good before relying on it.'
      ]),
      el('button', { class: 'btn sm ghost', onclick: function () { S.restored = false; note.remove(); } }, 'got it')
    ]);
    host.appendChild(note);
  }

  // Offer any cached session on the picker rather than silently reopening it.
  function renderResumeBanner() {
    var host = $('#resume-slot');
    if (!host || !FHSE.cache) return;
    FHSE.dom.clear(host);
    FHSE.cache.get().then(function (sess) {
      if (!sess) return;
      var profile = FHSE.games.get(sess.profileId);
      FHSE.dom.clear(host).appendChild(el('div', { class: 'banner note' }, [
        el('span', { class: 'i' }, '↺'),
        el('span', {}, [
          el('b', {}, 'Unfinished session. '),
          (profile ? profile.title : sess.profileId) + ' · ' + (sess.saveName || 'save') +
          ', left ' + FHSE.cache.ago(sess.savedAt) + (sess.dirty ? ' with unsaved edits' : '') + '.'
        ]),
        el('button', { class: 'btn sm primary', onclick: function () { restoreSession(sess); } }, 'Restore'),
        el('button', { class: 'btn sm ghost', onclick: function () {
          FHSE.cache.clear().then(function () { FHSE.dom.clear(host); toast('Discarded the saved session.'); });
        } }, 'Discard')
      ]));
    });
  }

  var toastT = null;
  function toast(msg, err) {
    var t = $('#toast');
    if (!t) { t = el('div', { class: 'toast' }); t.id = 'toast'; document.body.appendChild(t); }
    t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; t.style.display = 'block';
    clearTimeout(toastT); toastT = setTimeout(function () { t.style.display = 'none'; }, 2800);
  }

  // ---------- init ----------
  function init() {
    renderPicker();
    renderResumeBanner();
    // The browser's own "leave site?" prompt is the only reliable last line of defence; the cache
    // write is debounced, so flush it here too in case edits landed in the last moment.
    window.addEventListener('beforeunload', function (e) {
      if (!S.dirty) return;
      writeCache();
      e.preventDefault();
      e.returnValue = '';
      return '';
    });
    $('#back-to-picker').addEventListener('click', function () { showView('picker'); });
    $('#editor-back').addEventListener('click', backToPicker);
    $('#pick-folder-btn').addEventListener('click', function () { $('#folder-input').click(); });
    $('#folder-input').addEventListener('change', function (e) { ingest(e.target.files); });
    $('#open-editor-btn').addEventListener('click', openEditor);
    $('#download-btn').addEventListener('click', doDownload);
    $('#reload-btn').addEventListener('click', doReload);
    var iv = $('#view-intake');
    ['dragenter', 'dragover'].forEach(function (ev) { iv.addEventListener(ev, function (e) { e.preventDefault(); }); });
    iv.addEventListener('drop', function (e) { e.preventDefault(); ingest(e.dataTransfer.files); });
    showView('picker');
  }
  document.addEventListener('DOMContentLoaded', init);
})(window.FHSE);
