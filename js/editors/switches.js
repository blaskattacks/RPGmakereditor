/* editors/switches.js — searchable editor for $gameSwitches, named from System.json. */
(function (FHSE) {
  'use strict';
  var el, clear, jx;
  var CAP = 400;

  /* Same as the variables view: the name is all the format stores, so the usage index is the only
   * way to tell a one-shot story flag from something the game toggles constantly. */
  function row(ctx, data, id, name) {
    // Reference mode: no save, so nothing is on or off — but the name and usage still read.
    var readOnly = !ctx.save;
    var cb = el('input', { type: 'checkbox', checked: !readOnly && !!data[id] });
    if (readOnly) cb.disabled = true;
    else cb.addEventListener('change', function () { data[id] = cb.checked; ctx.markDirty(); });

    var wrap = el('div', { class: 'lrowwrap' });
    var r = el('div', { class: 'lrow' }, [
      el('span', { class: 'id' }, '#' + id),
      el('span', { class: 'nm' + (name ? '' : ' unnamed') }, name || '(unnamed)'),
      el('span', { class: 'switchbox' }, cb)
    ]);
    var info = FHSE.usageInfo;
    if (info && info.available(ctx.profile.id)) {
      var open = false, panel = null;
      var btn = el('button', {
        class: 'usagebtn', title: info.summary(ctx.profile.id, 'switch', id),
        onclick: function () {
          open = !open;
          btn.classList.toggle('on', open);
          if (open) { panel = info.detail(ctx.profile.id, 'switch', id); wrap.appendChild(panel); }
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
    var data = ctx.save ? (jx.arr(ctx.save.switches._data) || []) : [];
    var maxId = Math.max(data.length, (ctx.data.system().switches || []).length);

    var p = el('div', { class: 'panel' });
    p.appendChild(el('h3', {}, ['Switches', el('span', { class: 'side' }, (maxId - 1) + ' slots')]));

    var search = el('input', { type: 'search', placeholder: 'Filter by name or #id…' });
    var showUnnamed = el('input', { type: 'checkbox' });
    var note = el('span', { class: 'toolnote' });
    var rows = el('div', { class: 'rows' });

    function build() {
      clear(rows);
      var q = (search.value || '').trim().toLowerCase();
      var shown = 0, matches = 0;
      for (var id = 1; id < maxId; id++) {
        var name = ctx.data.switchName(id);
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
  FHSE.editors.switches = { render: render };
})(window.FHSE);
