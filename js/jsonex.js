/* jsonex.js — helpers for navigating RPG Maker MV's JsonEx save format.
 *
 * MV's JsonEx (legacy variant, used by Fear & Hunger) encodes:
 *   - class instances as objects carrying a "@" class-name and a "@c" circular id,
 *   - arrays wrapped as { "@c": id, "@a": [ ...real array... ] },
 *   - repeat references as { "@r": id }.
 *
 * We never reconstruct classes: we parse the plain tree, edit leaf values / push
 * primitives into existing "@a" arrays, and re-stringify. The "@"/"@c"/"@r" markers
 * ride along untouched, so the game reloads the save faithfully. These helpers hide
 * the "@a" wrapping so editors can treat wrapped and plain arrays the same way.
 */
(function (FHSE) {
  'use strict';

  function isMeta(key) { return key.charCodeAt(0) === 64; /* '@' */ }

  // Return the live underlying array for a plain array OR a { "@a": [...] } wrapper.
  // Returns null when the value is neither.
  function arr(v) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && Array.isArray(v['@a'])) return v['@a'];
    return null;
  }

  // Like arr() but throws if there is no array to mutate — use when an edit must land.
  function mutArr(v, what) {
    var a = arr(v);
    if (!a) throw new Error('Expected a JsonEx array' + (what ? ' for ' + what : ''));
    return a;
  }

  // Own enumerable keys of an object, excluding JsonEx meta keys (@, @c, @a, @r).
  function keys(o) {
    if (!o || typeof o !== 'object') return [];
    return Object.keys(o).filter(function (k) { return !isMeta(k); });
  }

  // Class name marker of an encoded object ("" if none).
  function className(o) { return (o && typeof o === 'object' && o['@']) || ''; }

  FHSE.jx = { isMeta: isMeta, arr: arr, mutArr: mutArr, keys: keys, className: className };
})(window.FHSE);
