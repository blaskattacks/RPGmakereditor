/* games/little-one.js — SKELETON profile for Little One (RPG Maker MV).
 * Read from the installed game's own www\data: 4 actors, 150 skills, 60 states, 178 named switches.
 * Unverified only because the game has no save folder yet — nothing has been round-tripped.
 */
(function (FHSE) {
  'use strict';
  FHSE.games.skeleton({
    id: 'little-one',
    title: 'Little One',
    engine: 'rpgmv',
    accent: '#54452c',
    blurb: 'RPG Maker MV — saves live in \\www\\save\\fileN.rpgsave',
    detect: function (data) { return /little one/i.test(data.gameTitle() || ''); },
    caveat: 'Grouping is the shared heuristic — this game\'s States.json has not been read closely ' +
            'yet, so expect a fuller "Other" bucket than the tuned profiles have.'
  });
})(window.FHSE);
