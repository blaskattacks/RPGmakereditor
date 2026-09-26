/* games/_generic.js — catch-all profiles for RPG Maker games with no dedicated profile.
 *
 * These carry no game knowledge at all, and don't need any: vitals and parameter names come from
 * the game's own System.json terms, item/skill/state names from its other data files, and the
 * codec is sniffed from the save. States are grouped by the shared heuristic, with anything
 * unrecognised collapsed into "Other". That makes these a working editor for essentially any
 * unmodified MV or MZ project — a dedicated profile just adds better labels and grouping.
 */
(function (FHSE) {
  'use strict';

  FHSE.games.skeleton({
    id: 'generic-mv',
    title: 'Any RPG Maker MV game',
    engine: 'rpgmv',
    accent: '#2f5d73',
    generic: true,
    blurb: 'No profile needed — reads every name from the game\'s own data files',
    saveHint: 'A save slot such as file1.rpgsave, usually from the game\'s \\www\\save folder.'
  });

  FHSE.games.skeleton({
    id: 'generic-mz',
    title: 'Any RPG Maker MZ game',
    engine: 'rpgmz',
    accent: '#3d6b52',
    generic: true,
    blurb: 'No profile needed — reads every name from the game\'s own data files',
    saveHint: 'A save slot such as file1.rmmzsave, usually from the game\'s \\save folder.'
  });
})(window.FHSE);
