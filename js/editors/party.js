/* editors/party.js — gold, party roster, and inventory (items / weapons / armors). */
(function (FHSE) {
  'use strict';
  var el, clear, jx;

  var NAME_FN = { Items: 'item', Weapons: 'weapon', Armors: 'armor' };

  function goldPanel(ctx) {
    var party = ctx.save.party;
    var p = el('div', { class: 'panel' });
    p.appendChild(el('h3', {}, 'Gold'));
    var g = el('input', { type: 'number', value: party._gold, min: 0 });
    g.addEventListener('change', function () {
      party._gold = Math.max(0, Math.round(parseFloat(g.value) || 0));
      g.value = party._gold; ctx.markDirty();
    });
    p.appendChild(el('label', { class: 'fld' }, ['Party gold', g]));
    return p;
  }

  function rosterPanel(ctx) {
    var party = ctx.save.party;
    var p = el('div', { class: 'panel' });
    var head = el('h3', {}, ['Party roster', el('span', { class: 'side' }, '')]);
    p.appendChild(head);
    var rows = el('div');

    function redraw() {
      clear(rows);
      var arr = jx.arr(party._actors) || [];
      head.querySelector('.side').textContent = arr.length + ' members';
      if (!arr.length) { rows.appendChild(el('p', { class: 'empty' }, 'No one in the party.')); }
      arr.forEach(function (aid, idx) {
        rows.appendChild(el('div', { class: 'invrow' }, [
          el('span', { class: 'nm' }, [(idx === 0 ? '★ ' : '') + ctx.data.actor(aid), el('span', { class: 'id' }, '#' + aid)]),
          el('span', {}),
          el('button', { class: 'btn sm ghost', onclick: function () {
            var m = jx.mutArr(party._actors); var i = m.indexOf(aid); if (i >= 0) m.splice(i, 1);
            ctx.markDirty(); redraw();
          } }, 'remove')
        ]));
      });
    }

    /* Offer every actor the game defines, not just the ones this save has already instantiated.
     * $gameActors._data is sparse — it only holds characters the playthrough has actually met, so
     * restricting the list to it hid most of the cast. Adding an un-instantiated id is safe:
     * Game_Actors.prototype.actor builds a fresh Game_Actor on first access, at the level and
     * equipment Actors.json specifies. Characters already in the save are marked, because those
     * keep their real progress while the rest arrive at their default state. */
    var known = {};
    ctx.roster().forEach(function (r) { known[r.id] = r.name; });
    var candidates = ctx.data.list('Actors').map(function (ac) {
      return { id: ac.id, name: known[ac.id] || ac.name, inSave: known[ac.id] != null };
    });

    var adder = FHSE.widgets.adder({
      placeholder: 'Add a character to the party…',
      items: candidates,
      filter: function (o, q) { return !q || o.name.toLowerCase().indexOf(q) !== -1 || ('' + o.id === q); },
      row: function (o) {
        return el('div', {}, [
          el('span', {}, o.name),
          el('span', { class: 'id' }, '#' + o.id),
          el('span', { class: 'ty' }, o.inSave ? 'in save' : 'fresh')
        ]);
      },
      onPick: function (o) { var m = jx.mutArr(party._actors); if (m.indexOf(o.id) === -1) { m.push(o.id); ctx.markDirty(); redraw(); } }
    });

    p.appendChild(rows);
    p.appendChild(adder);
    p.appendChild(el('p', { class: 'toolnote', style: { marginTop: '10px' } }, [
      'The first member (★) leads in the field. Characters marked ',
      el('b', {}, 'in save'),
      ' keep the progress this playthrough gave them; ones marked ',
      el('b', {}, 'fresh'),
      ' have not been met yet and will join at their default level and gear, so they won’t appear ' +
      'in the character list here until the game has loaded the save once.'
    ]));
    redraw();
    return p;
  }

  function invPanel(ctx, title, key, dbName) {
    var party = ctx.save.party;
    if (!party[key] || typeof party[key] !== 'object') party[key] = {}; // lazy-create empty bag
    var map = party[key];
    var p = el('div', { class: 'panel' });
    var head = el('h3', {}, [title, el('span', { class: 'side' }, '')]);
    p.appendChild(head);

    /* 99 is the engine's own ceiling -- Game_Party.maxItems returns 99 in both MV and MZ, so a
     * larger number would be quietly clamped the first time the game touched the stack. */
    var MAX = 99;
    var bulk = el('div', { class: 'bulkbar' }, [
      el('button', { class: 'btn sm ghost', onclick: function () {
        var ids = jx.keys(map).map(Number);
        if (!ids.length) { ctx.toast('Nothing here to top up.'); return; }
        var changed = 0;
        ids.forEach(function (id) { if (map[id] !== MAX) { map[id] = MAX; changed++; } });
        ctx.markDirty(); redraw();
        ctx.toast(changed ? ('Topped up ' + changed + ' of ' + ids.length + ' to ' + MAX + '.')
                          : ('All ' + ids.length + ' were already at ' + MAX + '.'));
      } }, 'Top up what I have to ' + MAX),

      el('button', { class: 'btn sm ghost', onclick: function () {
        var every = ctx.data.list(dbName);
        var missing = every.filter(function (o) { return !map[o.id]; }).length;
        if (!window.confirm('Put every one of the ' + every.length + ' ' + title.toLowerCase() +
            ' in the game into your bag at ' + MAX + '?\n\n' + missing + ' are not there yet. ' +
            'This includes key and quest entries, which can make a mess of a normal run -- it is ' +
            'really meant for testing.')) return;
        every.forEach(function (o) { map[o.id] = MAX; });
        ctx.markDirty(); redraw();
        ctx.toast('Added all ' + every.length + ' ' + title.toLowerCase() + ' at ' + MAX + '.');
      } }, 'Give me every ' + title.toLowerCase().replace(/s$/, '') + ' at ' + MAX)
    ]);
    p.appendChild(bulk);

    var rows = el('div');

    function redraw() {
      clear(rows);
      var ids = jx.keys(map).map(Number).sort(function (a, b) { return a - b; });
      head.querySelector('.side').textContent = ids.length + ' kinds';
      if (!ids.length) { rows.appendChild(el('p', { class: 'empty' }, 'Empty.')); return; }
      ids.forEach(function (id) {
        var cnt = el('input', { type: 'number', value: map[id], min: 1 });
        cnt.addEventListener('change', function () {
          var v = Math.round(parseFloat(cnt.value) || 0);
          if (v <= 0) { delete map[id]; ctx.markDirty(); redraw(); return; }
          map[id] = v; ctx.markDirty();
        });
        rows.appendChild(el('div', { class: 'invrow' }, [
          el('span', { class: 'nm' }, [ctx.data[NAME_FN[dbName]](id), el('span', { class: 'id' }, '#' + id)]),
          cnt,
          el('button', { class: 'btn sm ghost', onclick: function () { delete map[id]; ctx.markDirty(); redraw(); } }, 'remove')
        ]));
      });
    }

    /* A wheel rather than a dropdown: these lists run to hundreds of entries, and spinning past
     * neighbours is a nicer way to find something you'd know on sight but can't quite name. The
     * search box still drives it, so naming the thing is as fast as it ever was. */
    var picker = FHSE.widgets.wheel({
      placeholder: 'Add ' + title.toLowerCase() + ' by name or #id...',
      items: ctx.data.list(dbName),
      filter: function (o, q) { return o.name.toLowerCase().indexOf(q) !== -1 || ('' + o.id === q); },
      row: function (o) { return o.name || ('#' + o.id); },
      meta: function (o) { return '#' + o.id + (map[o.id] ? '  (have ' + map[o.id] + ')' : ''); },
      onPick: function (o) {
        map[o.id] = (map[o.id] || 0) + 1;
        ctx.markDirty();
        ctx.toast('Added ' + o.name + ' (now ' + map[o.id] + ')');
        redraw();
      }
    });

    p.appendChild(rows);
    p.appendChild(picker);
    redraw();
    return p;
  }

  function render(root, ctx) {
    el = FHSE.dom.el; clear = FHSE.dom.clear; jx = FHSE.jx;
    clear(root);
    root.appendChild(goldPanel(ctx));
    root.appendChild(rosterPanel(ctx));
    root.appendChild(invPanel(ctx, 'Items', '_items', 'Items'));
    root.appendChild(invPanel(ctx, 'Weapons', '_weapons', 'Weapons'));
    root.appendChild(invPanel(ctx, 'Armors', '_armors', 'Armors'));
  }

  FHSE.editors = FHSE.editors || {};
  FHSE.editors.party = { render: render };
})(window.FHSE);
