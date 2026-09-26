/* gameRegistry.js — registry of supported games. Adding a game = register a profile.
 *
 * Profile shape:
 *   { id, title, engine, blurb, accent, requiredData:[], optionalData:[], saveHint,
 *     detect(mvData)->bool, labels:{hp,mp,tp}, paramLabels:[8], stateGroups:[{name,match(state)}],
 *     verified:bool, caveat:'', generic:bool }
 *
 * `verified` records whether the profile has been round-tripped against a real save of that game.
 * Verified profiles (the ones a save was actually opened, edited and reloaded with) get no banner;
 * skeletons declare themselves in the UI so nobody mistakes a plausible guess for a checked fact.
 *
 * A skeleton is safe because the app leans on the game's own files rather than on the profile:
 * the codec is sniffed from the save (see rpgsave.js), param labels fall back to System.json's
 * terms, and unrecognised states land in the editor's "Other" bucket. `engine` is only an
 * ordering hint, so getting it wrong costs nothing.
 */
(function (FHSE) {
  'use strict';
  var games = [];

  function register(profile) {
    if (!profile || !profile.id) throw new Error('game profile needs an id');
    if (games.some(function (g) { return g.id === profile.id; })) {
      throw new Error('duplicate game profile id: ' + profile.id);
    }
    games.push(profile);
    return profile;
  }

  /* Register an unverified profile, filling in everything a stock RPG Maker project implies.
   * Callers supply what is actually known about the game — usually just id/title/engine/blurb
   * and where its saves live. */
  function skeleton(p) {
    var engine = p.engine === 'rpgmz' ? 'rpgmz' : 'rpgmv';
    var ext = p.saveExt || (engine === 'rpgmz' ? '.rmmzsave' : '.rpgsave');
    var folder = p.dataFolderLabel || (engine === 'rpgmz' ? 'data' : 'www\\data');
    return register({
      id: p.id,
      title: p.title,
      engine: engine,
      blurb: p.blurb || ((engine === 'rpgmz' ? 'RPG Maker MZ' : 'RPG Maker MV') + ' — saves are ' + ext + ' files'),
      accent: p.accent || '#4a4a58',
      saveExt: ext,
      dataFolderLabel: folder,
      requiredData: p.requiredData || FHSE.standardData.required,
      optionalData: p.optionalData || FHSE.standardData.optional,
      saveHint: p.saveHint || ('A save slot such as file1' + ext + '.'),
      detect: p.detect || null,
      labels: p.labels || null,          // null -> editor falls back to HP/MP/TP
      paramLabels: p.paramLabels || null, // null -> falls back to System.json terms.params
      stateGroups: p.stateGroups || FHSE.genericStateGroups,
      verified: false,
      generic: !!p.generic,
      caveat: p.caveat || ''
    });
  }

  FHSE.games = {
    register: register,
    skeleton: skeleton,
    all: function () { return games.slice(); },
    get: function (id) { return games.filter(function (g) { return g.id === id; })[0] || null; }
  };
})(window.FHSE);
