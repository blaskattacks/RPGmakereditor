/* games/ib.js — SKELETON profile for Ib (the 2022 RPG Maker MV remake by kouri).
 * The 2012 original was RPG Maker 2000, whose saves this editor cannot read.
 */
(function (FHSE) {
  'use strict';
  FHSE.games.skeleton({
    id: 'ib',
    title: 'Ib (2022 remake)',
    engine: 'rpgmv',
    accent: '#5c2a2a',
    blurb: 'RPG Maker MV — saves live in \\www\\save\\fileN.rpgsave',
    // Anchored to the start of the title: a bare /\bib\b/ matches any title merely containing
    // "Ib". A miss here only costs a soft warning, so erring tight is the safe direction.
    detect: function (data) { return /^\s*ib\b/i.test(data.gameTitle() || ''); },
    caveat: 'This profile is for the 2022 MV remake only. The 2012 original was made in RPG Maker ' +
            '2000, which uses a completely different save format that this editor cannot read.'
  });
})(window.FHSE);
