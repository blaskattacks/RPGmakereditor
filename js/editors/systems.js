/* editors/systems.js — a game's side systems, grouped and labelled.
 *
 * The variables and switches views already expose everything, but a save has ~1000 of each and
 * the interesting ones are scattered. A profile can declare `systems`: named groups that gather
 * the switches and variables behind one mechanic (crafting recipes, a cooking sub-skill, a shop's
 * level) so they read as the thing they are instead of numbered rows.
 *
 * Groups are matched by NAME, not by id. Ids shift when a game patches; the names the developer
 * gave these things don't. A pattern matching nothing simply renders an empty group rather than
 * inventing rows.
 *
 * Two guards worth keeping, both learned from Look Outside's real data:
 *   - a "variable" may hold an array or an object (roomExploration is 400 booleans; shopItem is a
 *     whole item record). Those are shown read-only — a number input would corrupt them.
 *   - transient display state (shopItemName, exploreMeterDisplay) is deliberately not declared by
 *     the profile: editing it does nothing except confuse the next redraw.
 */
(function (FHSE) {
  'use strict';
  var el, clear, jx;

  // Resolve a name pattern against the game's own switch/variable name tables.
  function findByName(names, re) {
    var out = [];
    for (var id = 1; id < names.length; id++) {
      var n = names[id];
      if (n && re.test(n)) out.push({ id: id, name: n });
    }
    return out;
  }

  function valueKind(v) {
    if (v === null || v === undefined) return 'empty';
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return 'number';
    if (typeof v === 'string') return 'string';
    return 'complex';   // array or object — never edit as a scalar
  }

  function switchRow(ctx, data, id, name) {
    var cb = el('input', { type: 'checkbox', checked: !!data[id] });
    cb.addEventListener('change', function () { data[id] = cb.checked; ctx.markDirty(); });
    return el('label', { class: 'tog' }, [cb, el('span', {}, name), el('span', { class: 'id' }, '#' + id)]);
  }

  function variableRow(ctx, vars, spec, id, name) {
    var cur = vars[id];
    var kind = valueKind(cur);
    var label = spec.label || name;

    if (kind === 'complex') {
      // Show what it is, and how big, without offering to break it.
      var what = Array.isArray(cur) ? ('array of ' + cur.length) : 'object';
      return el('div', { class: 'sysrow' }, [
        el('span', { class: 'nm' }, [label, el('span', { class: 'id' }, '#' + id)]),
        el('span', { class: 'ro' }, what + ' — not editable here'),
      ]);
    }
    if (kind === 'bool') {
      var cb = el('input', { type: 'checkbox', checked: !!cur });
      cb.addEventListener('change', function () { vars[id] = cb.checked; ctx.markDirty(); });
      return el('div', { class: 'sysrow' }, [
        el('span', { class: 'nm' }, [label, el('span', { class: 'id' }, '#' + id)]),
        el('span', { class: 'switchbox' }, cb)
      ]);
    }
    if (kind === 'string') {
      var ti = el('input', { type: 'text', value: cur });
      ti.addEventListener('change', function () { vars[id] = ti.value; ctx.markDirty(); });
      return el('div', { class: 'sysrow' }, [
        el('span', { class: 'nm' }, [label, el('span', { class: 'id' }, '#' + id)]), ti
      ]);
    }
    // number, or an unset slot the game will treat as 0
    var inp = el('input', { type: 'number', value: (kind === 'empty' ? 0 : cur) });
    if (spec.step) inp.setAttribute('step', spec.step);
    if (spec.min != null) inp.setAttribute('min', spec.min);
    inp.addEventListener('change', function () {
      var v = parseFloat(inp.value);
      if (isNaN(v)) v = 0;
      if (spec.min != null && v < spec.min) v = spec.min;
      if (!spec.step || spec.step === 1) v = Math.round(v);
      inp.value = v; vars[id] = v; ctx.markDirty();
    });
    return el('div', { class: 'sysrow' }, [
      el('span', { class: 'nm' }, [label, el('span', { class: 'id' }, '#' + id)]),
      inp,
      spec.hint ? el('span', { class: 'hint' }, spec.hint) : null
    ]);
  }

  /* An exclusive state grid.
   *
   * Some progress is stored as a spread of booleans that are only valid in one combination --
   * Termina's clock is exactly one of DAY1/2/3, exactly one of AFTERNOON/DUSK/EVENING, and the one
   * DAY{n}_{PHASE} that matches. Offering those as twenty loose checkboxes invites a state the
   * game can never produce (two days at once), so the profile declares the shape and this renders
   * one button per legal combination, setting all of it and clearing the rest.
   */
  function gridPanel(ctx, sys, swData, swNames) {
    var g = sys.grid;
    var idOf = {};
    for (var i = 1; i < swNames.length; i++) if (swNames[i]) idOf[swNames[i]] = i;

    var missing = g.rows.concat(g.cols).filter(function (n) { return idOf[n] == null; });
    var p = el('div', { class: 'panel' });
    p.appendChild(el('h3', {}, [sys.name, el('span', { class: 'side' }, g.rows.length + ' x ' + g.cols.length)]));
    if (sys.note) p.appendChild(el('p', { class: 'toolnote' }, sys.note));
    if (missing.length) {
      p.appendChild(el('p', { class: 'empty' }, 'This save does not have: ' + missing.join(', ')));
      return p;
    }

    function cellName(r, c) { return g.cell.replace('{row}', r).replace('{col}', c.replace(g.colPrefix || '', '')); }
    function currentRow() { return g.rows.filter(function (n) { return swData[idOf[n]]; })[0] || null; }
    function currentCol() { return g.cols.filter(function (n) { return swData[idOf[n]]; })[0] || null; }

    function setTo(r, c) {
      g.rows.forEach(function (n) { swData[idOf[n]] = (n === r); });
      g.cols.forEach(function (n) { swData[idOf[n]] = (n === c); });
      // Only the matching combined marker stays on; the game clears the rest on every advance.
      g.rows.forEach(function (rr) {
        g.cols.forEach(function (cc) {
          var id = idOf[cellName(rr, cc)];
          if (id != null) swData[id] = (rr === r && cc === c);
        });
      });
      (g.clear || []).forEach(function (n) { if (idOf[n] != null) swData[idOf[n]] = false; });
      ctx.markDirty();
      ctx.rerender();
    }

    var table = el('div', { class: 'gridpick' });
    table.appendChild(el('div', { class: 'gh' }, ''));
    g.cols.forEach(function (c) { table.appendChild(el('div', { class: 'gh' }, g.colLabels ? g.colLabels[c] : c)); });
    var rNow = currentRow(), cNow = currentCol();
    g.rows.forEach(function (r) {
      table.appendChild(el('div', { class: 'gh row' }, g.rowLabels ? g.rowLabels[r] : r));
      g.cols.forEach(function (c) {
        var on = (r === rNow && c === cNow);
        table.appendChild(el('button', {
          class: 'gcell' + (on ? ' on' : ''),
          title: cellName(r, c),
          onclick: function () { setTo(r, c); }
        }, on ? 'now' : ''));
      });
    });
    p.appendChild(table);

    var where = (rNow && cNow)
      ? ((g.rowLabels ? g.rowLabels[rNow] : rNow) + ', ' + (g.colLabels ? g.colLabels[cNow] : cNow))
      : 'not set -- this save is somewhere the grid does not describe';
    p.appendChild(el('p', { class: 'toolnote' }, 'Currently: ' + where));

    (g.clear || []).forEach(function (n) {
      if (idOf[n] == null) return;
      var cb = el('input', { type: 'checkbox', checked: !!swData[idOf[n]] });
      cb.addEventListener('change', function () { swData[idOf[n]] = cb.checked; ctx.markDirty(); });
      p.appendChild(el('label', { class: 'tog' }, [cb, el('span', {}, n), el('span', { class: 'id' }, '#' + idOf[n])]));
    });
    return p;
  }

  function render(root, ctx) {
    el = FHSE.dom.el; clear = FHSE.dom.clear; jx = FHSE.jx;
    clear(root);

    var systems = ctx.profile.systems || [];
    if (!systems.length) {
      root.appendChild(el('div', { class: 'panel' }, el('p', { class: 'empty' }, 'This game has no extra systems mapped.')));
      return;
    }

    var swData = jx.arr(ctx.save.switches._data) || [];
    var varData = jx.arr(ctx.save.variables._data) || [];
    var swNames = ctx.data.system().switches || [];
    var varNames = ctx.data.system().variables || [];

    systems.forEach(function (sys) {
      if (sys.grid) { root.appendChild(gridPanel(ctx, sys, swData, swNames)); return; }
      var p = el('div', { class: 'panel' });
      var found = 0;

      var body = el('div');
      if (sys.switches) {
        var hits = findByName(swNames, sys.switches);
        found += hits.length;
        if (hits.length) {
          var togs = el('div', { class: 'togs' });
          hits.forEach(function (h) { togs.appendChild(switchRow(ctx, swData, h.id, sys.strip ? h.name.replace(sys.strip, '') : h.name)); });
          body.appendChild(togs);
          if (hits.length > 3) {
            body.appendChild(el('div', { class: 'hexacts', style: { marginTop: '10px' } }, [
              el('button', { class: 'btn sm ghost', onclick: function () {
                hits.forEach(function (h) { swData[h.id] = true; }); ctx.markDirty(); ctx.rerender();
              } }, 'Enable all'),
              el('button', { class: 'btn sm ghost', onclick: function () {
                hits.forEach(function (h) { swData[h.id] = false; }); ctx.markDirty(); ctx.rerender();
              } }, 'Clear all')
            ]));
          }
        }
      }
      (sys.variables || []).forEach(function (spec) {
        var hits = findByName(varNames, spec.re);
        found += hits.length;
        hits.forEach(function (h) { body.appendChild(variableRow(ctx, varData, spec, h.id, h.name)); });
      });

      p.appendChild(el('h3', {}, [sys.name, el('span', { class: 'side' }, found + (found === 1 ? ' entry' : ' entries'))]));
      if (sys.note) p.appendChild(el('p', { class: 'toolnote' }, sys.note));
      if (!found) {
        p.appendChild(el('p', { class: 'empty' }, 'Nothing in this save matches — the game may have renamed these.'));
      } else {
        p.appendChild(body);
      }
      root.appendChild(p);
    });
  }

  FHSE.editors = FHSE.editors || {};
  FHSE.editors.systems = { render: render };
})(window.FHSE);
