/* games/fear-and-hunger-2.js — profile for Fear & Hunger 2: Termina (RPG Maker MV).
 * Same engine as F&H1; Termina's System.json already labels params as Max Body / Max Mind,
 * adds a "Wheels" equip slot, and has a much larger phobia/affliction set.
 */
(function (FHSE) {
  'use strict';
  FHSE.games.register({
    id: 'fear-and-hunger-2',
    title: 'Fear & Hunger 2: Termina',
    engine: 'rpgmv',
    verified: true, // round-tripped against a real save of this game
    blurb: 'RPG Maker MV — saves live in \\www\\save\\fileN.rpgsave',
    accent: '#6a5312',

    requiredData: ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'],
    optionalData: ['Enemies'],
    saveHint: 'A save slot such as file1.rpgsave from your game\'s \\www\\save folder.',

    // Termina's title contains "Fear" too, so match on "termina" specifically.
    detect: function (data) { return /termina/i.test(data.gameTitle() || ''); },

    // Vitals renamed; params come straight from Termina's System.json (already "Max Body/Mind").
    labels: { hp: 'Body', mp: 'Mind' },

    /* Termina runs on a clock, and this is where you are on it.
     *
     * Read out of the game's own `::::DAYS_GO_BY_TOO_FAST` and `WakeUP` common events: the state is
     * exactly one of DAY1/2/3, exactly one of DAY_AFTERNOON/DUSK/EVENING, and the single matching
     * DAY{n}_{PHASE} marker -- WakeUP clears all nine of those before setting the current one, so
     * they track "now", not "has happened". Sleeping is one call to the advance event, which is why
     * resting costs you a phase. TIME_UP latches once Day 3 evening rolls over.
     *
     * A grid rather than twenty checkboxes, because most combinations are states the game can
     * never be in. */
    systems: [
      {
        name: 'Where you are in the run',
        note: 'Termina gives you three days, each split into afternoon, dusk and evening. Sleeping ' +
              'advances one square -- that is the cost of resting. Picking a square sets the day, ' +
              'the phase and the combined marker together, the way the game does.',
        grid: {
          rows: ['DAY1', 'DAY2', 'DAY3'],
          cols: ['DAY_AFTERNOON', 'DAY_DUSK', 'DAY_EVENING'],
          rowLabels: { DAY1: 'Day 1', DAY2: 'Day 2', DAY3: 'Day 3' },
          colLabels: { DAY_AFTERNOON: 'Afternoon', DAY_DUSK: 'Dusk', DAY_EVENING: 'Evening' },
          cell: '{row}_{col}',        // DAY1 + AFTERNOON -> DAY1_AFTERNOON
          colPrefix: 'DAY_',
          clear: ['TIME_UP']          // latches after the third evening; stepping back should lift it
        }
      }
    ],

    /* Termina uses F&H1's limb scheme (state + sprite switch), but names the switches after the
     * character's CLASS — occultist_arm1 for Marina, doctor_leg2 for Daan — so the ids differ
     * from F&H1's. Verified against this game's System.json. Both the character name and the class
     * name are listed where each has its own switches (Marina_legs #3572 as well as occultist_*). */
    limbs: {
      stateMatch: function (s) { return /^(arm cut|leg cut|fracture|arrow loss|headless)$/i.test(s.name); },
      exclude: /sawing/i,
      aliases: {
        // Levi's class is "Ex-Soldier", which has no switch block of its own; only levi_arms is
        // certain. The legacy mercenary_* block (36-39) is inherited from F&H1 and may also apply
        // to him — left out rather than guessed, so nothing unrelated gets cleared.
        1: ['levi'],
        3: ['marina', 'occultist'],
        4: ['daan', 'doctor'],
        5: ['abella', 'mechanic'],
        6: ['osaa', 'yellow'],
        7: ['kalev'],
        8: ['kiddemon'], 10: ['bloodgolem'],
        9: ['marriage'], 11: ['marriage'],
        13: ['marcoh', 'thug'],
        14: ['karin', 'journalist'],
        15: ['olivia', 'botanist'],
        16: ['ghoul1'], 17: ['ghoul2'], 18: ['ghoul3']
      }
    },

    // First match wins. Termina keeps F&H1's afflictions and adds Nausea, Concussion, and phobias.
    stateGroups: [
      { name: 'Limbs & body',          match: function (s) { return /arm cut|leg cut|fracture|headless|arrow loss|soul sucked|beheaded|concussion/i.test(s.name); } },
      { name: 'Bleeding',              match: function (s) { return /bleed/i.test(s.name); } },
      { name: 'Hunger',               match: function (s) { return /hunger|starv|food/i.test(s.name); } },
      { name: 'Fear & phobias',        match: function (s) { return /fear|terror|phobia|panic|dread/i.test(s.name); } },
      { name: 'Infection & sickness',  match: function (s) { return /infect|parasite|poison|weak|disease|nausea|contamin/i.test(s.name); } },
      { name: 'Mind & mood',           match: function (s) { return /depress|happy|confus|rage|fascinat|bloodlust|silence|trauma/i.test(s.name); } },
      { name: 'Combat & other',        match: function (s) { return /guard|defen|buff|counter|sleep|blind|stun|vulnerab|critical|evasion/i.test(s.name); } }
    ]
  });
})(window.FHSE);
