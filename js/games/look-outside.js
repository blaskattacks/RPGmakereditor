/* games/look-outside.js — profile for Look Outside (RPG Maker MZ).
 * Demonstrates the multi-engine support: engine 'rpgmz', .rmmzsave saves, a root-level data folder,
 * and its own vitals/param labels (Health / Stamina / Ammo).
 */
(function (FHSE) {
  'use strict';
  FHSE.games.register({
    id: 'look-outside',
    title: 'Look Outside',
    engine: 'rpgmz',
    verified: true, // round-tripped against a real save of this game
    blurb: 'RPG Maker MZ — saves live in \\save\\fileN.rmmzsave',
    accent: '#3f5d3a',

    saveExt: '.rmmzsave',
    dataFolderLabel: 'data',
    requiredData: ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'],
    optionalData: ['Enemies'],
    saveHint: 'A save slot such as file1.rmmzsave from your game\'s \\save folder.',

    detect: function (data) { return /look\s*outside/i.test(data.gameTitle() || ''); },

    // Look Outside renames the vitals; params come straight from its System.json
    // (Max HP, Max Stm, Attack, Defense, Ballistics, Bull.Defense, Agility, Luck).
    labels: { hp: 'Health', mp: 'Stamina', tp: 'Ammo' },

    /* Side systems the game keeps in switches and variables. Matched by NAME so they survive a
     * patch renumbering ids, and verified against a real save. Deliberately NOT declared here:
     * shopItem / shopDesc / shopItemName / shopPrice / exploreMeterDisplay — those hold whatever
     * the UI last drew, so editing them does nothing useful. roomExploration IS included, but the
     * editor shows it read-only: it is a 400-entry array of per-room flags, not a number. */
    systems: [
      {
        name: 'Crafting recipes',
        note: 'Recipes the game has taught you. The crafting kit itself must be found before any ' +
              'of them can be used.',
        switches: /^(recipe |foundCraftingKit$)/i,
        strip: /^recipe /i
      },
      {
        name: 'Cooking',
        note: 'A sub-skill of its own — the level rises as experience reaches the amount needed.',
        variables: [
          { re: /^cookingSkill$/i, label: 'Cooking level', min: 0 },
          { re: /^cookingExp$/i, label: 'Experience', min: 0 },
          { re: /^cookingExpNeed$/i, label: 'Needed for next level', min: 0 }
        ]
      },
      {
        name: 'Shop',
        note: 'Eugene\'s shop levels up as you spend there, which widens the stock.',
        switches: /^(EugenesShopOpen|primeShop|openedShopBackdoor)$/i,
        variables: [
          { re: /^shopLevel$/i, label: 'Shop level', min: 0 },
          { re: /^shopMoneySpent$/i, label: 'Money spent here', min: 0 },
          { re: /^shopNbRestocks$/i, label: 'Restocks so far', min: 0 },
          { re: /^shopResalePrice$/i, label: 'Resale rate', step: 0.05, min: 0, hint: 'fraction of value you get back when selling' }
        ]
      },
      {
        name: 'Exploration & danger',
        note: 'The survival clock. Minutes explored drive the danger meter; darkness affects what ' +
              'you can see.',
        variables: [
          { re: /^exploredMinutes$/i, label: 'Minutes explored', min: 0 },
          { re: /^countdownExploreMinutes$/i, label: 'Countdown minutes', min: 0 },
          { re: /^fightExploreMinutes$/i, label: 'Minutes spent fighting', min: 0 },
          { re: /^exploreRatio$/i, label: 'Explore ratio', min: 0 },
          { re: /^dangerBonus$/i, label: 'Danger bonus' },
          { re: /^darknessLevel$/i, label: 'Darkness level', min: 0 },
          { re: /^roomExploration$/i, label: 'Rooms explored' }
        ]
      },
      {
        name: 'Transformation',
        note: 'Looking outside has consequences.',
        switches: /^playerTransformingIntoTree$/i,
        variables: [{ re: /^playerTurningIntoTree$/i, label: 'Turning into a tree', min: 0 }]
      }
    ],

    // Survival-horror afflictions. First match wins; anything unmatched (mostly internal /
    // enemy / boss-mechanic states) falls into a collapsed "Other" bucket in the editor.
    stateGroups: [
      { name: 'Injuries & bleeding', match: function (s) { return /mangl|bleed|fracture|\bstun\b|\bburn|acid|\bpain\b|wound|amputat|paralys|concussion|broken|dismember|\bcut\b|boils|melt|seizure|numb/i.test(s.name); } },
      { name: 'Survival',            match: function (s) { return /hungr|starv|\btired\b|exhaust|listless|smelly|rested|on break|thirst|fatigue|\bbreak\b/i.test(s.name); } },
      { name: 'Disease & infection', match: function (s) { return /poison|spore|disease|infect|\bsick\b|nausea|fever|parasit|\brot\b|mutat|contagi|mycelium/i.test(s.name); } },
      // Buffs / resistances / immunities go before the mental group so "SleepImmune" etc. don't look like afflictions.
      { name: 'Buffs, resist & debuffs', match: function (s) { return /attack ?[+\-]\d|defen[cs]e ?[+\-]\d|maxlife|maxstamina|dodge ?\+|phys ?resist|gun ?resist|dot resist|\bresist\b|immune|res$|weaken|shielded|\bbless\b|overdrive|beastmode|combat surge|sharpen|song of|double time|nitro|second wind|\bprayer\b|attackcount|extraaction/i.test(s.name); } },
      { name: 'Fear & mind',         match: function (s) { return /fear|panic|terror|\brage\b|confus|charm|\bmad\b|lonely|drowsy|sleep|dread|insan|stress|phobia|hopeless|despair|depress|guilt|catatonic|bloodlust|freak|soothe|\bcalm\b/i.test(s.name); } },
      { name: 'Combat & control',    match: function (s) { return /guard|protect|provoke|counter|vulnerab|immortal|\bhide\b|frozen|regen|substitut|encounter|money|marked|petrif|time stop|constrict|\bnet\b|engulf|swarm|stalk|blind/i.test(s.name); } }
    ]
  });
})(window.FHSE);
