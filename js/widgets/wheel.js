/* widgets/wheel.js -- a radial picker.
 *
 * The inventory lists run to hundreds of entries (Fear & Hunger alone has 220 items), so a wheel
 * that showed everything at once would be unreadable. This shows a WINDOW of entries curving away
 * from a fixed pointer, like a rolodex seen edge-on: the arc gives it the feel of a wheel while
 * the labels stay horizontal and legible.
 *
 * Typing drives it. The search box filters the set and spins the wheel to the best match, so the
 * fast keyboard path is unchanged -- type a few letters, press Enter. Arrows, the scroll wheel and
 * clicking a neighbour all rotate it too, for when you'd rather browse than name a thing.
 */
(function (FHSE) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    (Array.isArray(kids) ? kids : kids ? [kids] : []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  /* opts: { items, placeholder, filter(item, q), row(item)->string, meta(item)->string, onPick(item) } */
  function wheel(opts) {
    var el = FHSE.dom.el, clear = FHSE.dom.clear;
    var all = opts.items || [];
    var view = all.slice();      // current filtered set
    var sel = 0;                 // index into view, sitting at the pointer

    var W = 460, H = 260, CY = H / 2;
    var R = 300;                 // big radius = a shallow, readable arc rather than a tight dial
    var STEP = 7.2;              // degrees between neighbours
    var SPAN = 5;                // how many to draw either side of the pointer

    var search = el('input', { type: 'search', placeholder: opts.placeholder || 'Type to spin the wheel...' });
    var count = el('span', { class: 'toolnote' });
    var board = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'wheelsvg' });
    var layer = svg('g', {});
    board.appendChild(layer);

    function pick() {
      var item = view[sel];
      if (item && opts.onPick) opts.onPick(item);
    }
    function move(d) {
      if (!view.length) return;
      sel = Math.max(0, Math.min(view.length - 1, sel + d));
      draw();
    }

    function draw() {
      clear(layer);
      // The rail the entries ride on, drawn behind them.
      layer.appendChild(svg('path', {
        class: 'wheel-rail',
        d: 'M ' + (W - 40 - R + R * Math.cos(-SPAN * STEP * Math.PI / 180)) + ' ' +
           (CY + R * Math.sin(-SPAN * STEP * Math.PI / 180)) +
           ' A ' + R + ' ' + R + ' 0 0 1 ' +
           (W - 40 - R + R * Math.cos(SPAN * STEP * Math.PI / 180)) + ' ' +
           (CY + R * Math.sin(SPAN * STEP * Math.PI / 180))
      }));

      if (!view.length) {
        var none = svg('text', { class: 'wheel-empty', x: W / 2, y: CY, 'text-anchor': 'middle' });
        none.textContent = 'nothing matches';
        layer.appendChild(none);
        count.textContent = '0 of ' + all.length;
        return;
      }

      for (var k = -SPAN; k <= SPAN; k++) {
        var i = sel + k;
        if (i < 0 || i >= view.length) continue;
        var item = view[i];
        var a = k * STEP * Math.PI / 180;
        var x = (W - 40) - R + R * Math.cos(a);
        var y = CY + R * Math.sin(a);
        var dist = Math.abs(k);

        var g = svg('g', {
          class: 'wheel-item' + (k === 0 ? ' on' : ''),
          opacity: (1 - dist / (SPAN + 1.6)).toFixed(2),
          tabindex: k === 0 ? '0' : null
        });
        (function (idx) {
          g.addEventListener('click', function () { if (idx === sel) pick(); else { sel = idx; draw(); } });
        })(i);

        var label = svg('text', { class: 'wheel-label', x: x, y: y + 4, 'text-anchor': 'end' });
        label.textContent = opts.row ? opts.row(item) : String(item.name || item);
        g.appendChild(label);

        if (opts.meta) {
          var m = svg('text', { class: 'wheel-meta', x: x + 10, y: y + 4, 'text-anchor': 'start' });
          m.textContent = opts.meta(item);
          g.appendChild(m);
        }
        layer.appendChild(g);
      }

      // The pointer sits still; the entries move past it.
      layer.appendChild(svg('path', {
        class: 'wheel-pointer',
        d: 'M ' + (W - 30) + ' ' + (CY - 9) + ' L ' + (W - 14) + ' ' + CY + ' L ' + (W - 30) + ' ' + (CY + 9) + ' Z'
      }));

      count.textContent = (sel + 1) + ' of ' + view.length + (view.length === all.length ? '' : ' (filtered from ' + all.length + ')');
    }

    function applyFilter() {
      var q = (search.value || '').trim().toLowerCase();
      view = !q ? all.slice() : all.filter(function (it) {
        return opts.filter ? opts.filter(it, q) : String(it.name || '').toLowerCase().indexOf(q) !== -1;
      });
      sel = 0;                   // spin to the best match
      draw();
    }

    search.addEventListener('input', FHSE.dom.debounce(applyFilter, 90));
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); pick(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    });
    board.addEventListener('wheel', function (e) {
      e.preventDefault();
      move(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    var root = el('div', { class: 'wheelwrap' }, [
      el('div', { class: 'wheeltools' }, [search, count]),
      board,
      el('div', { class: 'wheelhint toolnote' },
        'Type to spin - Enter or click the pointer to add - arrows or scroll to nudge')
    ]);
    draw();
    root.focusSearch = function () { search.focus(); };
    return root;
  }

  FHSE.widgets = FHSE.widgets || {};
  FHSE.widgets.wheel = wheel;
})(window.FHSE);
