/* games/coffin-andy-leyley.js — SKELETON profile for The Coffin of Andy and Leyley (RPG Maker MV).
 * Engine: sources disagree (one wiki says MZ), but the game ships a www\ folder and writes
 * fileN.rpgsave, which is MV. The codec is sniffed from the save anyway, so this is only a hint.
 */
(function (FHSE) {
  'use strict';
  FHSE.games.skeleton({
    id: 'coffin-andy-leyley',
    title: 'The Coffin of Andy and Leyley',
    engine: 'rpgmv',
    accent: '#4a1030',
    blurb: 'RPG Maker MV — saves are fileN.rpgsave under %AppData%',
    saveHint: 'A slot such as file1.rpgsave — this game keeps saves in %AppData%\\CoffinAndyLeyley, ' +
              'not in its install folder.',
    detect: function (data) { return /coffin|leyley/i.test(data.gameTitle() || ''); },

    caveat: 'This game ships its data files encrypted as .k9a rather than plain .json, so the ' +
            'www\\data folder will look empty to the picker. You need a modding tool such as Burial ' +
            'to decrypt them first — without the .json files the editor still opens the save, but ' +
            'everything shows as raw ID numbers.'
  });
})(window.FHSE);
