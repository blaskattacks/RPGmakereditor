/* usage.js — "where is this used?" for switches and variables.
 *
 * RPG Maker stores no notes for either: System.json holds a bare name and nothing more. The index
 * built by tools/extract-usage.js is the next best thing — how often each one is written and
 * tested, the values it gets set to and compared against, and which maps or common events touch
 * it. That's often enough to work out what an opaque name like `Sleep_cool_down` actually does.
 *
 * Loaded LAZILY, per game. The three indexes together are ~760KB, which is not worth parsing on
 * every startup for a game you aren't editing. A dynamically appended <script> is used rather than
 * fetch() because the editor is meant to run straight from file://, where fetch is blocked but
 * script loading still works.
 */
(function (FHSE) {
  'use strict';

  var loading = {};

  function load(profileId) {
    if (!profileId) return Promise.resolve(null);
    if (FHSE.usage && FHSE.usage[profileId]) return Promise.resolve(FHSE.usage[profileId]);
    if (loading[profileId]) return loading[profileId];

    var file = ({
      'fear-and-hunger': 'usage-fh1.js',
      'fear-and-hunger-2': 'usage-fh2.js',
      'look-outside': 'usage-lo.js'
    })[profileId];
    if (!file) return Promise.resolve(null);

    loading[profileId] = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'js/games/' + file;
      s.async = true;
      s.onload = function () { resolve((FHSE.usage || {})[profileId] || null); };
      s.onerror = function () { resolve(null); };   // never block the editor on this
      document.head.appendChild(s);
    });
    return loading[profileId];
  }

  function get(profileId, kind, id) {
    var u = (FHSE.usage || {})[profileId];
    if (!u) return null;
    var rec = (kind === 'switch' ? u.switches : u.vars)[id];
    if (!rec) return null;
    return { rec: rec, places: (rec.at || []).map(function (i) { return u.places[i]; }), total: rec.n || 0 };
  }

  // One-line gist, for a title tooltip.
  function summary(profileId, kind, id) {
    var g = get(profileId, kind, id);
    if (!g) return 'No event in this game reads or writes this — it may be unused, or driven by a plugin.';
    var r = g.rec, bits = [];
    if (kind === 'switch') {
      if (r.on) bits.push('turned on ' + r.on + 'x');
      if (r.off) bits.push('turned off ' + r.off + 'x');
    } else {
      if (r.w) bits.push('written ' + r.w + 'x');
      if (r.s) bits.push('shown in text ' + r.s + 'x');
    }
    if (r.t) bits.push('tested ' + r.t + 'x');
    bits.push('across ' + g.total + ' place' + (g.total === 1 ? '' : 's'));
    var out = bits.join(', ');
    if (kind !== 'switch') {
      if ((r.set || []).length) out += '\nset to: ' + r.set.join(', ');
      if ((r.add || []).length) out += '\nincremented by: ' + r.add.join(', ');
      if ((r.cmp || []).length) out += '\ncompared: ' + r.cmp.join(', ');
    }
    out += '\nseen in: ' + g.places.slice(0, 6).join(' · ');
    if (g.total > g.places.length) out += ' …';
    return out;
  }

  /* Expandable detail under a row. Returns the panel element, or null when nothing is known. */
  function detail(profileId, kind, id) {
    var el = FHSE.dom.el;
    var g = get(profileId, kind, id);
    var box = el('div', { class: 'usagebox' });
    if (!g) {
      box.appendChild(el('p', { class: 'empty' },
        'No event reads or writes this one. It may be unused, set by a plugin, or only referenced ' +
        'from a script call this index does not follow.'));
      return box;
    }
    var r = g.rec;
    var stat = el('div', { class: 'ustats' });
    var add = function (label, v) { if (v) stat.appendChild(el('span', {}, [el('b', {}, String(v)), ' ' + label])); };
    if (kind === 'switch') { add('turned on', r.on); add('turned off', r.off); }
    else { add('written', r.w); add('shown in text', r.s); }
    add('tested', r.t);
    stat.appendChild(el('span', {}, [el('b', {}, String(g.total)), ' place' + (g.total === 1 ? '' : 's')]));
    box.appendChild(stat);

    if (kind !== 'switch') {
      var line = function (label, list) {
        if (!list || !list.length) return;
        box.appendChild(el('div', { class: 'uline' }, [
          el('span', { class: 'k' }, label),
          el('span', { class: 'v' }, list.join(', '))
        ]));
      };
      line('set to', r.set);
      line('incremented by', r.add);
      line('compared', r.cmp);
    }
    box.appendChild(el('div', { class: 'uline' }, [
      el('span', { class: 'k' }, 'seen in'),
      el('span', { class: 'v' }, g.places.join(' · ') + (g.total > g.places.length ? '  (+' + (g.total - g.places.length) + ' more)' : ''))
    ]));
    return box;
  }

  FHSE.usage = FHSE.usage || {};
  FHSE.usageInfo = { load: load, get: get, summary: summary, detail: detail, available: function (id) { return !!(FHSE.usage || {})[id]; } };
})(window.FHSE);
