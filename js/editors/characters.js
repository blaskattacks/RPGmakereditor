/* editors/characters.js — per-character editor: identity, vitals, params, skills, states, equipment.
 * app.js owns the sidebar roster and passes the selected actor as ctx.actor.
 */
(function (FHSE) {
  'use strict';
  var el, clear, jx;

  // ---- small field helpers ----
  function numField(ctx, label, get, set, opts) {
    opts = opts || {};
    var inp = el('input', { type: 'number', value: get() });
    if (opts.min != null) inp.setAttribute('min', opts.min);
    inp.addEventListener('change', function () {
      var v = parseFloat(inp.value);
      if (isNaN(v)) v = (opts.min != null ? opts.min : 0);
      if (opts.min != null && v < opts.min) v = opts.min;
      if (opts.int !== false) v = Math.round(v);
      inp.value = v; set(v); ctx.markDirty();
    });
    return el('label', { class: 'fld' }, [label, inp]);
  }
  function textField(ctx, label, get, set) {
    var inp = el('input', { type: 'text', value: get() == null ? '' : get() });
    inp.addEventListener('change', function () { set(inp.value); ctx.markDirty(); });
    return el('label', { class: 'fld' }, [label, inp]);
  }

  // ---- panels ----
  /* Skills a class teaches at or below a level — Game_Actor.initSkills/levelUp grant these as the
   * character levels, so they live in _skills once earned. Setting _level here doesn't run the
   * engine's levelUp, so those skills would otherwise be silently skipped. */
  function owedLearnings(a, ctx) {
    var klass = ctx.data.obj('Classes', a._classId);
    if (!klass || !klass.learnings) return [];
    var have = jx.arr(a._skills) || [];
    var seen = {};
    return klass.learnings.filter(function (l) {
      if (l.level > (a._level || 1) || have.indexOf(l.skillId) !== -1 || seen[l.skillId]) return false;
      seen[l.skillId] = 1; return true;
    });
  }

  function identityPanel(a, ctx) {
    var p = el('div', { class: 'panel' });

    /* Say plainly who this is in relation to your party. A save instantiates every character the
     * story has touched, so it is easy to land on someone you are not playing and edit them for a
     * while before noticing. */
    var party = (ctx.save && jx.arr(ctx.save.party._actors)) || [];
    var slot = party.indexOf(a._actorId);
    var standing = slot === 0 ? el('span', { class: 'side lead' }, 'party leader')
      : slot > 0 ? el('span', { class: 'side lead' }, 'in your party, #' + (slot + 1))
      : el('span', { class: 'side off' }, 'NOT in your party');
    p.appendChild(el('h3', {}, ['Identity', standing]));

    if (slot === -1) {
      p.appendChild(el('div', { class: 'banner note offwarn' }, [
        el('span', { class: 'i' }, '!'),
        el('span', {}, [
          el('b', {}, a._name || ('Actor #' + a._actorId)), ' is not in your party. ',
          'This save keeps a record for everyone the story has met, so editing this one changes a ',
          'character you are not currently playing. ',
          party.length ? ('Your party is: ' + party.map(function (id) {
            var arr = jx.arr(ctx.save.actors._data) || [];
            return (arr[id] && arr[id]._name) || ctx.data.actor(id);
          }).join(', ') + '.') : 'Your party is empty.'
        ])
      ]));
    }

    var note = el('div', { class: 'learnnote' });

    var classSel = el('select');
    ctx.data.list('Classes').forEach(function (c) {
      classSel.appendChild(el('option', { value: c.id, selected: c.id === a._classId }, c.name));
    });
    classSel.addEventListener('change', function () {
      var id = parseInt(classSel.value, 10);
      a._classId = id;
      if (a._exp && a._exp[id] == null) {
        var e = ctx.data.expForLevel(id, a._level || 1);
        a._exp[id] = (e == null ? 0 : e);
      }
      ctx.markDirty(); refreshNote();
    });

    var lvl = numField(ctx, 'Level', function () { return a._level; }, function (v) {
      a._level = v;
      var e = ctx.data.expForLevel(a._classId, v);
      if (e != null && a._exp) a._exp[a._classId] = e; // keep exp consistent with level
      refreshNote();
    }, { min: 1 });

    function refreshNote() {
      clear(note);
      var owed = owedLearnings(a, ctx);
      if (!owed.length) return;
      note.appendChild(el('span', {}, [
        'This class teaches ', el('b', {}, String(owed.length)),
        ' skill' + (owed.length === 1 ? '' : 's') + ' at or below Lv' + (a._level || 1) +
        ' that this character doesn’t have — the game grants these on level-up, so raising a ' +
        'level here skips them: ',
        el('i', {}, owed.map(function (l) { return ctx.data.skill(l.skillId) + ' (Lv' + l.level + ')'; }).join(', '))
      ]));
      note.appendChild(el('button', { class: 'btn sm ghost', onclick: function () {
        var m = jx.mutArr(a._skills);
        owed.forEach(function (l) { if (m.indexOf(l.skillId) === -1) m.push(l.skillId); });
        ctx.markDirty();
        ctx.toast('Learned ' + owed.length + ' class skill' + (owed.length === 1 ? '' : 's') + '.');
        ctx.rerender();
      } }, 'Learn them'));
    }

    p.appendChild(el('div', { class: 'grid two' }, [
      textField(ctx, 'Name', function () { return a._name; }, function (v) { a._name = v; if (ctx.refreshRoster) ctx.refreshRoster(); }),
      textField(ctx, 'Nickname', function () { return a._nickname; }, function (v) { a._nickname = v; }),
      el('label', { class: 'fld' }, ['Class', classSel]),
      lvl
    ]));
    p.appendChild(note);
    refreshNote();
    return p;
  }

  /* What the engine would compute for this actor's maximum, mirroring Game_BattlerBase.param:
   *     paramBase (the class curve at this level) + paramPlus (the actor's own bonus + equipment)
   * Traits and buffs can scale it further, but those are multiplicative and rare on HP/MP -- and
   * the game clamps hp/mp to the true maximum in refresh() on load, so a value that lands slightly
   * under is simply a slightly-under heal, never corruption. maxTp is a flat 100. */
  function maxVital(a, ctx, paramId) {
    var klass = ctx.data.obj('Classes', a._classId);
    var curve = klass && klass.params && klass.params[paramId];
    if (!curve) return null;
    var lvl = Math.max(0, Math.min(curve.length - 1, a._level || 1));
    var base = curve[lvl] || 0;
    var plus = (jx.arr(a._paramPlus) || [])[paramId] || 0;
    // Equipment contributes through its own params array, exactly as Game_Actor.paramPlus does.
    (jx.arr(a._equips) || []).forEach(function (it) {
      if (!it || !it._itemId) return;
      var db = it._dataClass === 'weapon' ? 'Weapons' : 'Armors';
      var obj = ctx.data.obj(db, it._itemId);
      if (obj && obj.params && obj.params[paramId] != null) plus += obj.params[paramId];
    });
    return Math.max(0, Math.round(base + plus));
  }

  function statsPanel(a, ctx) {
    var p = el('div', { class: 'panel' });
    var L = ctx.profile.labels || {};
    var head = el('h3', {}, ['Vitals & parameters', el('span', { class: 'side' }, '')]);
    p.appendChild(head);

    var mhp = maxVital(a, ctx, 0), mmp = maxVital(a, ctx, 1), mtp = 100;
    var cap = function (label, m) { return m == null ? label : (label + ' (max ' + m + ')'); };

    var vitals = el('div', { class: 'grid' }, [
      numField(ctx, cap((L.hp || 'HP') + ' now', mhp), function () { return a._hp; }, function (v) { a._hp = v; }, { min: 0 }),
      numField(ctx, cap((L.mp || 'MP') + ' now', mmp), function () { return a._mp; }, function (v) { a._mp = v; }, { min: 0 }),
      numField(ctx, cap((L.tp || 'TP'), mtp), function () { return a._tp; }, function (v) { a._tp = v; }, { min: 0 })
    ]);
    p.appendChild(vitals);

    p.appendChild(el('div', { class: 'bulkbar' }, [
      el('button', { class: 'btn sm ghost', onclick: function () {
        if (mhp != null) a._hp = mhp;
        if (mmp != null) a._mp = mmp;
        a._tp = mtp;
        ctx.markDirty();
        ctx.toast('Restored ' + (a._name || 'this character') + ' to full.');
        ctx.rerender();
      } }, 'Max all vitals'),
      el('button', { class: 'btn sm ghost', onclick: function () {
        if (mhp != null) a._hp = mhp;
        ctx.markDirty(); ctx.toast((L.hp || 'HP') + ' set to ' + mhp + '.'); ctx.rerender();
      } }, 'Max ' + (L.hp || 'HP'))
    ]));

    if (mhp == null) {
      p.appendChild(el('p', { class: 'toolnote' },
        'This class has no parameter curve in the data files, so the maximum cannot be worked out ' +
        'here -- the numbers above are still the real stored values.'));
    }

    var labels = ctx.profile.paramLabels || ctx.data.paramLabels();
    var pp = jx.arr(a._paramPlus) || [];
    var caps = (ctx.profile.paramCaps || FHSE.paramCaps || {});
    var capOf = function (i) { return (caps.max || [])[i]; };

    /* What the parameter currently totals, and the bonus that would put it exactly on the cap.
     * The bonus itself is not capped -- Game_BattlerBase.param clamps the RESULT -- so anything
     * past this is simply discarded by the engine. */
    function paramBaseOf(i) {
      var klass = ctx.data.obj('Classes', a._classId);
      var curve = klass && klass.params && klass.params[i];
      if (!curve) return null;
      var lvl = Math.max(0, Math.min(curve.length - 1, a._level || 1));
      return curve[lvl] || 0;
    }
    function gearOf(i) {
      var sum = 0;
      (jx.arr(a._equips) || []).forEach(function (it) {
        if (!it || !it._itemId) return;
        var obj = ctx.data.obj(it._dataClass === 'weapon' ? 'Weapons' : 'Armors', it._itemId);
        if (obj && obj.params && obj.params[i] != null) sum += obj.params[i];
      });
      return sum;
    }
    function totalOf(i) {
      var base = paramBaseOf(i);
      if (base == null) return null;
      var raw = base + (jx.arr(a._paramPlus)[i] || 0) + gearOf(i);
      var cap = capOf(i);
      return cap != null ? Math.min(raw, cap) : raw;
    }
    function plusForCap(i) {
      var base = paramBaseOf(i), cap = capOf(i);
      if (base == null || cap == null) return null;
      return Math.max(0, cap - base - gearOf(i));
    }

    var grid = el('div', { class: 'grid', style: { marginTop: '12px' } });
    pp.forEach(function (_, i) {
      if (i >= labels.length) return;
      var total = totalOf(i), cap = capOf(i);
      var suffix = (total != null && cap != null) ? (' → ' + total + ' / ' + cap) : '';
      grid.appendChild(numField(ctx, labels[i] + ' +' + suffix,
        function () { return jx.arr(a._paramPlus)[i]; },
        function (v) { jx.arr(a._paramPlus)[i] = v; }, {}));
    });
    p.appendChild(grid);

    if (capOf(0) != null && paramBaseOf(0) != null) {
      p.appendChild(el('div', { class: 'bulkbar' }, [
        el('button', { class: 'btn sm ghost', onclick: function () {
          var arr = jx.arr(a._paramPlus), n = 0;
          labels.forEach(function (_, i) {
            if (i >= arr.length) return;
            var want = plusForCap(i);
            if (want != null && arr[i] !== want) { arr[i] = want; n++; }
          });
          ctx.markDirty();
          ctx.toast('Set ' + n + ' bonus' + (n === 1 ? '' : 'es') + ' to reach the cap.');
          ctx.rerender();
        } }, 'Max every bonus'),
        el('button', { class: 'btn sm ghost', onclick: function () {
          var arr = jx.arr(a._paramPlus);
          for (var i = 0; i < arr.length; i++) arr[i] = 0;
          ctx.markDirty(); ctx.toast('Cleared all parameter bonuses.'); ctx.rerender();
        } }, 'Clear bonuses')
      ]));
      p.appendChild(el('p', { class: 'toolnote' },
        'The bonus itself has no limit, but the engine clamps the resulting stat -- ' +
        capOf(0) + ' for ' + labels[0] + '/' + labels[1] + ', ' + capOf(2) + ' for the rest -- so ' +
        'a bigger number here is simply thrown away. "Max every bonus" lands each one exactly on ' +
        'its cap, counting the class curve and whatever is equipped.'));
    }
    p.appendChild(el('p', { class: 'toolnote', style: { marginTop: '10px' } },
      'Parameters are flat bonuses on top of the class base. Current ' + (L.hp || 'HP') + '/' + (L.mp || 'MP') + ' clamp to their max when the game loads.'));
    return p;
  }

  function skillsPanel(a, ctx) {
    var p = el('div', { class: 'panel' });
    var head = el('h3', {}, ['Skills & abilities', el('span', { class: 'side' }, '')]);
    p.appendChild(head);
    var chips = el('div', { class: 'chips' });

    function redraw() {
      clear(chips);
      var arr = jx.arr(a._skills) || [];
      head.querySelector('.side').textContent = arr.length + ' known';
      if (!arr.length) { chips.appendChild(el('span', { class: 'empty' }, 'No skills learned.')); return; }
      arr.slice().forEach(function (sid) {
        chips.appendChild(el('span', { class: 'chip' }, [
          ctx.data.skill(sid),
          el('span', { class: 'id' }, '#' + sid),
          // A real <button>: it gets the tab order, Enter/Space and the announced role for free.
          el('button', { class: 'x', type: 'button', title: 'Remove', 'aria-label': 'Remove ' + ctx.data.skill(sid), onclick: function () {
            var m = jx.mutArr(a._skills); var i = m.indexOf(sid); if (i >= 0) m.splice(i, 1);
            ctx.markDirty(); redraw();
          } }, '✕')
        ]));
      });
    }

    var adder = FHSE.widgets.adder({
      placeholder: 'Add a skill by name or #id…',
      items: ctx.data.list('Skills'),
      filter: function (s, q) { return !q || s.name.toLowerCase().indexOf(q) !== -1 || ('' + s.id === q); },
      row: function (s) {
        var ty = ctx.data.skillTypes()[s.stypeId] || '';
        return el('div', {}, [el('span', {}, s.name), el('span', { class: 'id' }, '#' + s.id), el('span', { class: 'ty' }, ty)]);
      },
      onPick: function (s) {
        var m = jx.mutArr(a._skills);
        if (m.indexOf(s.id) === -1) { m.push(s.id); ctx.markDirty(); redraw(); }
      }
    });

    p.appendChild(chips);
    p.appendChild(adder);
    redraw();
    return p;
  }

  /* Add or remove a state the way the engine does.
   *
   * Game_Actor.resetStateCounts sets BOTH counters — _stateTurns from the state's own minTurns
   * (the engine randomises up to maxTurns; we take the low end so an edit is reproducible) and
   * _stateSteps from stepsToRemove. Setting only _stateTurns, as this used to, left
   * removeByWalking states with no step counter, so they never wore off on their own.
   * Removal mirrors Game_BattlerBase.eraseState, which deletes both. */
  function toggleState(a, ctx, s, on) {
    var arr = jx.mutArr(a._states);
    var i = arr.indexOf(s.id);
    if (on && i === -1) {
      arr.push(s.id);
      if (a._stateTurns && typeof a._stateTurns === 'object') {
        a._stateTurns[s.id] = (s.minTurns != null ? s.minTurns : 0);
      }
      if (a._stateSteps && typeof a._stateSteps === 'object') {
        a._stateSteps[s.id] = (s.stepsToRemove != null ? s.stepsToRemove : 0);
      }
    } else if (!on && i !== -1) {
      arr.splice(i, 1);
      if (a._stateTurns) delete a._stateTurns[s.id];
      if (a._stateSteps) delete a._stateSteps[s.id];
    }
    ctx.markDirty();
  }

  /* Limbs get their own panel because a lost limb is stored twice: as a state (the mechanical
   * penalty) and as a switch (the limbless walking sprite). Restoring one means clearing both,
   * which no amount of un-ticking states in the panel below can do on its own. Only rendered for
   * profiles that declare a `limbs` block. */
  function limbsPanel(a, ctx) {
    if (!ctx.profile.limbs || !FHSE.limbs) return null;
    var actorId = a._actorId;
    var swData = jx.arr(ctx.save.switches._data) || [];
    var found = FHSE.limbs.switchesFor(ctx.profile, actorId, ctx.data, swData);
    var limbStates = FHSE.limbs.statesFor(ctx.profile, ctx.data);
    if (!limbStates.length && !found.switches.length) return null;

    var p = el('div', { class: 'panel' });
    var head = el('h3', {}, ['Limbs & dismemberment', el('span', { class: 'side' }, '')]);
    p.appendChild(head);

    var activeStates = function () {
      var on = jx.arr(a._states) || [];
      return limbStates.filter(function (s) { return on.indexOf(s.id) !== -1; });
    };
    var activeSwitches = function () {
      return found.switches.filter(function (sw) { return !!swData[sw.id]; });
    };
    function updateCount() {
      var n = activeStates().length + activeSwitches().length;
      head.querySelector('.side').textContent = n ? (n + ' set') : 'intact';
    }

    p.appendChild(el('p', { class: 'toolnote' }, [
      'A lost limb is recorded twice — as a state here, and as a sprite switch. Clear both, or the ',
      'character keeps the maimed sprite. ',
      found.guessed
        ? el('b', {}, 'These switches were guessed from this character’s name, not verified for this game — check them before trusting.')
        : ''
    ]));

    // --- the states ---
    if (limbStates.length) {
      var stg = el('div', { class: 'togs' });
      limbStates.forEach(function (s) {
        var cb = el('input', { type: 'checkbox', checked: (jx.arr(a._states) || []).indexOf(s.id) !== -1 });
        cb.addEventListener('change', function () { toggleState(a, ctx, s, cb.checked); updateCount(); });
        stg.appendChild(el('label', { class: 'tog' }, [cb, el('span', {}, s.name), el('span', { class: 'id' }, '#' + s.id)]));
      });
      p.appendChild(el('div', { class: 'stategrp' }, [el('div', { class: 'gname' }, 'Injury states'), stg]));
    }

    // --- the sprite switches ---
    if (found.switches.length) {
      var swg = el('div', { class: 'togs' });
      found.switches.forEach(function (sw) {
        var cb = el('input', { type: 'checkbox', checked: !!swData[sw.id] });
        cb.addEventListener('change', function () { swData[sw.id] = cb.checked; ctx.markDirty(); updateCount(); });
        swg.appendChild(el('label', { class: 'tog' }, [cb, el('span', {}, sw.name), el('span', { class: 'id' }, '#' + sw.id)]));
      });
      p.appendChild(el('div', { class: 'stategrp' }, [
        el('div', { class: 'gname' }, 'Sprite switches' + (found.aliases.length ? ' — matched on “' + found.aliases.join('”, “') + '”' : '')),
        swg
      ]));
    } else {
      p.appendChild(el('p', { class: 'empty' }, 'No limb sprite switches found for this character.'));
    }

    // --- the one-click fix ---
    var restore = el('button', { class: 'btn primary sm', onclick: function () {
      var nS = activeStates().length, nW = activeSwitches().length;
      if (!nS && !nW) { ctx.toast('Nothing to restore — this character is already intact.'); return; }
      activeStates().forEach(function (s) { toggleState(a, ctx, s, false); });
      found.switches.forEach(function (sw) { if (swData[sw.id]) swData[sw.id] = false; });
      ctx.markDirty();
      ctx.toast('Restored ' + nS + ' injury state' + (nS === 1 ? '' : 's') + ' and cleared ' + nW + ' sprite switch' + (nW === 1 ? '' : 'es') + '.');
      ctx.rerender();
    } }, 'Restore every limb');
    p.appendChild(el('div', { style: { marginTop: '12px' } }, restore));

    updateCount();
    return p;
  }

  function statesPanel(a, ctx) {
    var p = el('div', { class: 'panel' });
    var head = el('h3', {}, ['States — afflictions, limbs & sickness', el('span', { class: 'side' }, '')]);
    p.appendChild(head);
    function updateCount() { head.querySelector('.side').textContent = (jx.arr(a._states) || []).length + ' active'; }

    var all = ctx.data.list('States');
    var groups = ctx.profile.stateGroups || [];
    var buckets = groups.map(function (g) { return { name: g.name, items: [] }; });
    var other = { name: 'Other', items: [] };
    all.forEach(function (s) {
      for (var i = 0; i < groups.length; i++) { if (groups[i].match(s)) { buckets[i].items.push(s); return; } }
      other.items.push(s);
    });

    buckets.concat([other]).forEach(function (b) {
      if (!b.items.length) return;
      var togs = el('div', { class: 'togs' });
      b.items.forEach(function (s) {
        var cb = el('input', { type: 'checkbox', checked: (jx.arr(a._states) || []).indexOf(s.id) !== -1 });
        cb.addEventListener('change', function () { toggleState(a, ctx, s, cb.checked); updateCount(); });
        togs.appendChild(el('label', { class: 'tog' }, [cb, el('span', {}, s.name), el('span', { class: 'id' }, '#' + s.id)]));
      });
      if (b === other) {
        // The catch-all bucket is mostly internal/enemy/mechanical states — collapse it by default.
        p.appendChild(el('details', { class: 'stategrp' }, [
          el('summary', { class: 'gname' }, b.name + ' — internal / uncommon (' + b.items.length + ')'),
          togs
        ]));
      } else {
        p.appendChild(el('div', { class: 'stategrp' }, [el('div', { class: 'gname' }, b.name), togs]));
      }
    });
    updateCount();
    return p;
  }

  function equipPanel(a, ctx) {
    var p = el('div', { class: 'panel' });
    p.appendChild(el('h3', {}, 'Equipment'));
    var equips = jx.arr(a._equips) || [];
    var etypes = ctx.data.equipTypes();
    if (!equips.length) { p.appendChild(el('p', { class: 'empty' }, 'This actor has no equipment slots stored.')); return p; }

    equips.forEach(function (item, slot) {
      var etypeId = slot + 1;
      var slotName = etypes[etypeId] || ('Slot ' + etypeId);
      var isWeapon = (slot === 0);
      var sel = el('select');
      var noneKey = (isWeapon ? 'weapon:0' : 'armor:0');
      sel.appendChild(el('option', { value: noneKey, selected: !item || !item._itemId }, '— none —'));
      var opts = isWeapon ? ctx.data.list('Weapons')
        : ctx.data.list('Armors').filter(function (ar) { return ar.etypeId === etypeId; });
      opts.forEach(function (o) {
        var key = (isWeapon ? 'weapon:' : 'armor:') + o.id;
        var cur = item && item._itemId === o.id && item._dataClass === (isWeapon ? 'weapon' : 'armor');
        sel.appendChild(el('option', { value: key, selected: cur }, o.name + '   #' + o.id));
      });
      if (!item) sel.disabled = true;
      else sel.addEventListener('change', function () {
        var parts = sel.value.split(':');
        item._dataClass = parts[0]; item._itemId = parseInt(parts[1], 10) || 0;
        ctx.markDirty();
      });
      p.appendChild(el('div', { class: 'eqrow' }, [el('span', { class: 'slot' }, slotName), sel]));
    });
    p.appendChild(el('p', { class: 'toolnote', style: { marginTop: '10px' } },
      'Equipping here sets the slot directly (editor-style) — it does not move items in or out of your bag.'));
    return p;
  }

  function render(root, ctx) {
    el = FHSE.dom.el; clear = FHSE.dom.clear; jx = FHSE.jx;
    clear(root);
    var a = ctx.actor;
    if (!a) { root.appendChild(el('div', { class: 'panel' }, el('p', { class: 'empty' }, 'Select a character from the list.'))); return; }
    root.appendChild(identityPanel(a, ctx));
    root.appendChild(statsPanel(a, ctx));
    root.appendChild(skillsPanel(a, ctx));
    var limbs = limbsPanel(a, ctx);   // null for profiles with no limb mechanic
    if (limbs) root.appendChild(limbs);
    root.appendChild(statesPanel(a, ctx));
    root.appendChild(equipPanel(a, ctx));
  }

  FHSE.editors = FHSE.editors || {};
  FHSE.editors.characters = { render: render };
})(window.FHSE);
