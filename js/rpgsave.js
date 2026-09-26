/* rpgsave.js — engine-aware save codecs, with auto-detection.
 *
 * RPG Maker MV  (.rpgsave)  = LZString.compressToBase64(JsonEx.stringify(state))  — ASCII text.
 * RPG Maker MZ  (.rmmzsave) = pako.deflate(JsonEx.stringify(state)) as a binary string, written
 *                             UTF-8-encoded to disk.
 *
 * Each codec exposes:
 *   id     : 'rpgmv' | 'rpgmz'
 *   ext    : the save extension the engine writes
 *   decode(input) -> object tree      (input: ArrayBuffer, or a string for MV)
 *   encode(obj)   -> a string suitable for `new Blob([str])` (Blob UTF-8-encodes it, which
 *                    reproduces each engine's on-disk bytes).
 *
 * The app always reads saves as an ArrayBuffer and calls decodeAuto(), which sniffs the real
 * format rather than trusting the game profile. That keeps an unverified profile with a wrong
 * `engine` guess from being a correctness bug — the file itself is the source of truth.
 * Editing stays engine-agnostic: we mutate the plain tree and re-serialize, preserving markers.
 */
(function (FHSE) {
  'use strict';

  function asText(input) {
    if (typeof input === 'string') return input;
    return new TextDecoder('utf-8').decode(input);
  }

  // A decoded tree is only accepted as a save if it carries the shape RPG Maker writes.
  // Guards the try-each-codec fallback against a lucky parse of something that isn't a save.
  function looksLikeSave(o) {
    if (!o || typeof o !== 'object') return false;
    return ['party', 'actors', 'switches', 'variables', 'system', 'map'].some(function (k) {
      return o[k] && typeof o[k] === 'object';
    });
  }

  // ---- RPG Maker MV: LZString base64 text ----
  var rpgmv = {
    id: 'rpgmv',
    ext: '.rpgsave',
    label: 'RPG Maker MV',
    decode: function (input) {
      var s = asText(input).trim();
      if (!s) throw new Error('Empty save file.');
      var json = (typeof LZString !== 'undefined') ? LZString.decompressFromBase64(s) : null;
      if (json == null || json === '') {
        try { json = s; JSON.parse(s); } // some tools store uncompressed JSON
        catch (e) { throw new Error('Could not decompress this file — is it a valid MV .rpgsave?'); }
      }
      var obj;
      try { obj = JSON.parse(json); }
      catch (e2) { throw new Error('Decompressed data was not valid JSON: ' + e2.message); }
      if (!looksLikeSave(obj)) throw new Error('Decoded, but this does not look like an RPG Maker save.');
      return obj;
    },
    encode: function (obj) { return LZString.compressToBase64(JSON.stringify(obj)); }
  };

  // ---- RPG Maker MZ: pako/zlib deflate, stored as a UTF-8-encoded binary string ----
  var rpgmz = {
    id: 'rpgmz',
    ext: '.rmmzsave',
    label: 'RPG Maker MZ',
    decode: function (input) {
      if (typeof pako === 'undefined') throw new Error('pako library not loaded.');
      var binStr = asText(input);                                           // undo the UTF-8 write
      var bytes = Uint8Array.from(binStr, function (c) { return c.charCodeAt(0) & 0xff; });
      var json;
      try { json = pako.inflate(bytes, { to: 'string' }); }
      catch (e) { throw new Error('Could not inflate this file — is it a valid MZ .rmmzsave?'); }
      var obj;
      try { obj = JSON.parse(json); }
      catch (e2) { throw new Error('Inflated data was not valid JSON: ' + e2.message); }
      if (!looksLikeSave(obj)) throw new Error('Decoded, but this does not look like an RPG Maker save.');
      return obj;
    },
    encode: function (obj) {
      var bytes = pako.deflate(JSON.stringify(obj), { level: 1 }); // Uint8Array
      var bs = '';
      for (var i = 0; i < bytes.length; i += 0x8000) {
        bs += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return bs; // Blob([bs]) UTF-8-encodes back to the on-disk format
    }
  };

  var ALL = [rpgmv, rpgmz];

  /* Which codec to try first. Only an ordering hint — decodeAuto tries the other either way.
   * Extension is the strongest signal; failing that, a leading 0x78 is zlib's CMF byte, which
   * LZString's base64 alphabet output never starts with. */
  function preferredOrder(input, filename, profileEngine) {
    var name = (filename || '').toLowerCase();
    var first = null;
    if (/\.rmmzsave$/.test(name)) first = rpgmz;
    else if (/\.rpgsave$/.test(name)) first = rpgmv;
    else if (typeof input !== 'string' && input && input.byteLength) {
      first = (new Uint8Array(input, 0, 1)[0] === 0x78) ? rpgmz : rpgmv;
    }
    if (!first) first = FHSE.codecs[profileEngine] || rpgmv;
    return [first].concat(ALL.filter(function (c) { return c !== first; }));
  }

  /* Decode without trusting the profile. Returns { codec, save }. Throws with the
   * first (most likely) codec's message if nothing decodes. */
  function decodeAuto(input, filename, profileEngine) {
    var order = preferredOrder(input, filename, profileEngine), firstErr = null;
    for (var i = 0; i < order.length; i++) {
      try { return { codec: order[i], save: order[i].decode(input) }; }
      catch (e) { if (!firstErr) firstErr = e; }
    }
    throw firstErr || new Error('Could not read this save file.');
  }

  FHSE.codecs = { rpgmv: rpgmv, rpgmz: rpgmz, all: ALL, decodeAuto: decodeAuto, looksLikeSave: looksLikeSave };
  FHSE.rpgsave = rpgmv; // back-compat alias
})(window.FHSE);
