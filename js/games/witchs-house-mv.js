/* games/witchs-house-mv.js — SKELETON profile for The Witch's House MV (RPG Maker MV).
 * Fummy's 2018 remake of the 2012 original, rebuilt in MV (hence the title).
 */
(function (FHSE) {
  'use strict';
  FHSE.games.skeleton({
    id: 'witchs-house-mv',
    title: "The Witch's House MV",
    engine: 'rpgmv',
    accent: '#3a2340',
    blurb: 'RPG Maker MV — saves live in \\www\\save\\fileN.rpgsave',
    detect: function (data) { return /witch.?s house/i.test(data.gameTitle() || ''); },
    caveat: 'A puzzle-adventure rather than an RPG — expect a small cast and few stats. The ' +
            'switches and variables views are the useful ones here.'
  });
})(window.FHSE);
