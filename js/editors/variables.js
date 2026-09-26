/* editors/variables.js — searchable editor for $gameVariables, named from System.json. */
(function (FHSE) {
  'use strict';
  var el, clear, jx;
  var CAP = 400; // max rows rendered at once (keeps the DOM light)

  function coerce(raw, prev) {
    if (raw === '') return 0;
    if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
    if (/^-?\d*\.\d+$/.test(raw)) return parseFloat(raw);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return raw; // keep as string
  }

  /* A name is all RPG Maker stores for a variable, so where the game writes and tests it is the
   * only available documentation. The usage index supplies that; it loads lazily, so rows render
   * fine without it and simply gain the ⓘ once it arrives. */
  function row(ctx, data, id, name) {
    // Reference mode: no save, so there is no value to show or change — the name and the usage
    // notes are still worth reading.
    var readOnly = !ctx.save;
    var inp = el('input', { type: 'text', value: (readOnly || data[id] == null) ? '' : data[id] });
    if (readOnly) { inp.disabled = true; inp.placeholder = 'no save'; }
    else inp.addEventListener('change', function () { data[id] = coerce(inp.value, data[id]); ctx.markDirty(); });

    var wrap = el('div', { class: 'lrowwrap' });
    var r = el('div', { class: 'lrow' }, [
      el('span', { class: 'id' }, '#' + id),
      el('span', { class: 'nm' + (name ? '' : ' unnamed') }, name || '(unnamed)'),
      inp
    ]);
    var info = FHSE.usageInfo;
    if (info && info.available(ctx.profile.id)) {
      var open = false, panel = null;
      var btn = el('button', {
        class: 'usagebtn', title: info.summary(ctx.profile.id, 'variable', id),
        onclick: function () {
          open = !open;
          btn.classList.toggle('on', open);
          if (open) { panel = info.detail(ctx.profile.id, 'variable', id); wrap.appendChild(panel); }
          else if (panel) { panel.remove(); panel = null; }
        }
      }, 'ⓘ');
      r.appendChild(btn);
    }
    wrap.appendChild(r);
    return wrap;
  }

  function render(root, ctx) {
    el = FHSE.dom.el; clear = FHSE.dom.clear; jx = FHSE.jx;
    clear(root);
    var data = ctx.save ? (jx.arr(ctx.save.variables._data) || []) : [];
    var maxId = Math.max(data.length, (ctx.data.system().variables || []).length);

    var p = el('div', { class: 'panel' });
    p.appendChild(el('h3', {}, ['Variables', el('span', { class: 'side' }, (maxId - 1) + ' slots')]));

    var search = el('input', { type: 'search', placeholder: 'Filter by name or #id…' });
    var showUnnamed = el('input', { type: 'checkbox' });
    var note = el('span', { class: 'toolnote' });
    var rows = el('div', { class: 'rows' });

    function build() {
      clear(rows);
      var q = (search.value || '').trim().toLowerCase();
      var shown = 0, matches = 0;
      for (var id = 1; id < maxId; id++) {
        var name = ctx.data.variableName(id);
        if (q) {
          if (name.toLowerCase().indexOf(q) === -1 && ('' + id).indexOf(q) === -1) continue;
        } else if (!name && !showUnnamed.checked) continue;
        matches++;
        if (shown >= CAP) continue;
        shown++;
        rows.appendChild(row(ctx, data, id, name));
      }
      if (!shown) rows.appendChild(el('div', { class: 'lrow' }, el('span', { class: 'nm unnamed' }, 'No matches.')));
      note.textContent = matches > shown ? ('showing ' + shown + ' of ' + matches + ' — refine your search') : (matches + ' shown');
    }

    search.addEventListener('input', FHSE.dom.debounce(build, 120));
    showUnnamed.addEventListener('change', build);

    p.appendChild(el('div', { class: 'listtools' }, [
      search,
      el('label', { class: 'tog' }, [showUnnamed, 'show unnamed']),
      note
    ]));
    p.appendChild(rows);
    root.appendChild(p);
    build();
  }

  FHSE.editors = FHSE.editors || {};
  FHSE.editors.variables = { render: render };
})(window.FHSE);
