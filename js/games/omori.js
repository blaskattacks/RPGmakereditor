/* games/omori.js — SKELETON profile for OMORI (RPG Maker MV). Not yet checked against a real save.
 * Engine confirmed: OMOCAT moved the project from VX Ace to MV during development, and the shipped
 * game keeps MV's layout (www\save\fileN.rpgsave).
 */
(function (FHSE) {
  'use strict';
  FHSE.games.skeleton({
    id: 'omori',
    title: 'OMORI',
    engine: 'rpgmv',
    accent: '#1d1d2b',
    blurb: 'RPG Maker MV — saves live in \\www\\save\\fileN.rpgsave',
    saveHint: 'A slot such as file1.rpgsave from the game\'s \\www\\save folder (alongside global.rpgsave).',
    detect: function (data) { return /omori/i.test(data.gameTitle() || ''); },

    caveat: 'OMORI is a heavily modified MV project with a custom emotion/battle system, so some ' +
            'mechanics live in plugin data this editor leaves untouched. Names still come from its ' +
            'own data files, so everything shown is real.',

    /* OMORI's emotion system (Happy/Sad/Angry and their escalations) surfaces as states, so it gets
     * its own group ahead of the shared heuristic — a miss here only sends a state to "Other". */
    stateGroups: [
      { name: 'Emotions', match: function (s) { return /happy|ecstatic|manic|\bsad\b|depress|miserable|angry|enraged|furious|afraid|stressed|\bfear/i.test(s.name); } }
    ].concat(FHSE.genericStateGroups)
  });
})(window.FHSE);
