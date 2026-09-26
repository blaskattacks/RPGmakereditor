/* games/fear-and-hunger.js — profile for Fear & Hunger (RPG Maker MV).
 * Copy this file to add Fear & Hunger 2: Termina (same engine) or other games.
 */
(function (FHSE) {
  'use strict';
  FHSE.games.register({
    id: 'fear-and-hunger',
    title: 'Fear & Hunger',
    engine: 'rpgmv',
    verified: true, // round-tripped against a real save of this game
    blurb: 'RPG Maker MV — saves live in \\www\\save\\fileN.rpgsave',
    accent: '#8a1c1c',

    // www\data files needed to interpret a save (base-names, no extension).
    requiredData: ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'],
    optionalData: ['Enemies'],
    saveHint: 'A save slot such as file1.rpgsave from your game\'s \\www\\save folder.',

    // Soft check — warns (does not block) if the loaded data isn\'t this game.
    // Termina's title also contains "fear", so exclude it here.
    detect: function (data) { var t = data.gameTitle() || ''; return /fear\s*&?\s*hunger/i.test(t) && !/termina|:\s*2|hunger 2/i.test(t); },

    // F&H renames the core vitals and params.
    labels: { hp: 'Body', mp: 'Mind' },
    paramLabels: ['Max Body', 'Max Mind', 'Attack', 'Defense', 'M.Attack', 'M.Defense', 'Agility', 'Luck'],

    /* Dismemberment lives in two places. The state (Arm cut #3, Leg cut #14…) carries the mechanical
     * penalty; a switch swaps the walking sprite for a limbless one ($cahara1_arm1, $knight_legsoff).
     * Restoring a limb means clearing BOTH — clearing the state alone leaves the character maimed
     * on screen. Switch ids verified against this game's System.json: mercenary 36-39, girl 168-171,
     * knight 248-251, darkpriest 252-255, outlander 256-259, captain 261-264, moonless 270-272.
     * F&H names these after the character's CLASS, not the name the game shows you (Cahara,
     * D'arce, Ragnvaldr), so the aliases are listed explicitly rather than derived. */
    limbs: {
      stateMatch: function (s) { return /^(arm cut|leg cut|fracture|arrow loss|headless)$/i.test(s.name); },
      // The *_sawing_* switches are a separate mechanic (sawing a limb off deliberately) — not ours.
      exclude: /sawing/i,
      aliases: {
        1: ['mercenary'],   // Cahara
        2: ['girl'],        // Marina
        3: ['knight'],      // D'arce
        4: ['darkpriest'],
        5: ['outlander'],   // Ragnvaldr
        6: ['captain'],     // Le'garde
        7: ['moonless'],
        9: ['marriage'], 11: ['marriage'],
        10: ['bloodgolem'], 8: ['kiddemon'],
        16: ['ghoul1'], 17: ['ghoul2'], 18: ['ghoul3'],
        19: ['skeleton1'], 20: ['skeleton2'], 21: ['skeleton3']
      }
    },

    // How the character editor groups states (matched by name so it survives id shifts;
    // first match wins, so order matters).
    stateGroups: [
      { name: 'Limbs & body',          match: function (s) { return /arm cut|leg cut|fracture|headless|arrow loss|soul sucked|beheaded/i.test(s.name); } },
      { name: 'Bleeding',              match: function (s) { return /bleed/i.test(s.name); } },
      { name: 'Hunger',               match: function (s) { return /hunger|starv|food/i.test(s.name); } },
      { name: 'Fear',                 match: function (s) { return /fear|terror|phobia|panic|dread/i.test(s.name); } },
      { name: 'Infection & sickness',  match: function (s) { return /infect|parasite|poison|weak|disease/i.test(s.name); } },
      { name: 'Mind & mood',           match: function (s) { return /depress|happy|confus|rage|fascinat|bloodlust|silence/i.test(s.name); } },
      { name: 'Combat & other',        match: function (s) { return /guard|defen|buff|counter|sleep|blind|stun|vulnerab|critical|evasion/i.test(s.name); } }
    ]
  });
})(window.FHSE);
