/* games/_shared.js — pieces reused by more than one game profile.
 *
 * `genericStateGroups` is a best-effort grouping built from RPG Maker's stock state names plus
 * the vocabulary horror games reach for. It is a *heuristic*: a state it doesn't recognise simply
 * falls into the editor's collapsed "Other" bucket, which is why an unverified profile can ship
 * without anyone having read that game's States.json. A profile that has been checked against the
 * real data file should replace this with its own groups.
 *
 * Order matters — the characters editor takes the first match.
 */
(function (FHSE) {
  'use strict';

  FHSE.genericStateGroups = [
    { name: 'Injuries & bleeding', match: function (s) { return /bleed|wound|fracture|broken|mangl|amputat|dismember|\bcut\b|burn|acid|\bpain\b|bruis|injur|scar|gash|laceration/i.test(s.name); } },
    { name: 'Survival',            match: function (s) { return /hunger|hungry|starv|thirst|\bfood\b|\btired\b|exhaust|fatigue|sleepy|rested|stamina|cold|freezing|warmth/i.test(s.name); } },
    { name: 'Disease & poison',    match: function (s) { return /poison|venom|toxic|disease|infect|\bsick\b|nausea|fever|parasit|spore|\brot\b|plague|contagi|mutat/i.test(s.name); } },
    // Buffs and immunities come before the mind group so "SleepImmune" doesn't read as an affliction.
    { name: 'Buffs & resistances', match: function (s) { return /\bbuff\b|\+\d|immune|immunity|\bresist|regen|\bbless|shield|barrier|haste|protect|empower|strengthen|fortif|overdrive|surge/i.test(s.name); } },
    { name: 'Fear & mind',         match: function (s) { return /fear|terror|panic|dread|phobia|horror|insan|madness|\bmad\b|stress|trauma|despair|hopeless|depress|guilt|anx|confus|charm|rage|bloodlust|berserk|hypno|catatonic|drowsy|sleep|dream|nightmare/i.test(s.name); } },
    { name: 'Debuffs & control',   match: function (s) { return /\bdebuff\b|-\d|weak|slow|blind|silence|mute|stun|paraly|petrif|frozen|\bfroze|bind|snare|\bnet\b|constrict|root|disarm|curse|doom|vulnerab|expos/i.test(s.name); } },
    { name: 'Combat & mechanics',  match: function (s) { return /guard|defen[cs]e|counter|substitut|knockout|\bdead\b|\bdeath\b|dying|incapacit|immortal|invincib|\bhide\b|stealth|encounter|escape|provoke|marked|aggro|\bturn\b/i.test(s.name); } }
  ];

  /* What a parameter can actually reach.
   *
   * A parameter bonus is not itself capped -- the resulting VALUE is, in
   * Game_BattlerBase.param, which clamps (base + plus) to [paramMin, paramMax]. So "max this out"
   * means choosing a bonus that lands the total exactly on the ceiling; anything beyond is thrown
   * away by the engine.
   *
   * These are MV/MZ's defaults for an actor. Both Fear & Hunger games replace paramMax through
   * YEP_BaseParamControl, and its configured formulas come out at exactly the same numbers
   * (`customMax || (user.isActor() ? 9999 : 999999)` and so on); Look Outside has no override at
   * all. Verified against all three. A profile can still override if a game turns out to differ.
   */
  FHSE.paramCaps = {
    max: [9999, 9999, 999, 999, 999, 999, 999, 999],
    min: [1, 0, 1, 1, 1, 1, 1, 1]
  };

  /* Skeleton profiles share these — every RPG Maker MV/MZ project ships this database set. */
  FHSE.standardData = {
    required: ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors'],
    optional: ['Enemies']
  };
})(window.FHSE);

/* ---- limb / dismemberment support ----
 *
 * Fear & Hunger tracks a lost limb in TWO places: a state on the actor (Arm cut, Leg cut…) and a
 * switch that swaps the character's sprite for a limbless one ($cahara1_arm1, $knight_legsoff…).
 * Clearing only the state leaves the switch set, so the character keeps walking around maimed —
 * which is why "remove the affliction" alone doesn't restore a limb. `FHSE.limbs` finds both.
 *
 * A profile opts in with a `limbs` block:
 *   { stateMatch(state)->bool, aliases:{actorId:[switchPrefix,…]}, exclude:RegExp }
 * `aliases` is per-game because F&H names these switches after the character's CLASS
 * (mercenary_arm1), not the name shown in-game (Cahara).
 */
(function (FHSE) {
  'use strict';

  // What may follow the character's name in a limb switch: _arm1, _Rleg, _legsoff, _head…
  var LIMB_SUFFIX = /^[_ ]?(r|l)?[_ ]?(arm|leg|head|hand|foot)s?(off)?[0-9]*$/i;

  // <alias>_arm1 / <alias>_Rleg / <alias>_legsoff — the naming F&H uses for limb sprite swaps.
  // Compares the prefix literally and tests only the remainder, so no alias needs escaping.
  function switchMatchesAlias(name, alias) {
    var lower = String(name).toLowerCase(), a = String(alias).toLowerCase();
    if (!a || lower.indexOf(a) !== 0) return false;
    return LIMB_SUFFIX.test(String(name).slice(a.length));
  }

  FHSE.limbs = {
    // Aliases to try for an actor: the profile's explicit map first, else fall back to guessing
    // from the actor's own name and class name (lowercased, spaces/apostrophes stripped).
    aliasesFor: function (profile, actorId, data) {
      var cfg = (profile && profile.limbs) || {};
      var explicit = cfg.aliases && cfg.aliases[actorId];
      if (explicit && explicit.length) return { list: explicit, guessed: false };
      var guesses = [];
      var actor = data.obj('Actors', actorId);
      var norm = function (s) { return String(s || '').toLowerCase().replace(/['\s]+/g, ''); };
      if (actor) {
        if (actor.name) guesses.push(norm(actor.name));
        var klass = data.obj('Classes', actor.classId);
        if (klass && klass.name) guesses.push(norm(klass.name));
      }
      return { list: guesses.filter(Boolean), guessed: true };
    },

    // Every switch id that belongs to this actor's limbs, with its current value.
    switchesFor: function (profile, actorId, data, switchValues) {
      var cfg = (profile && profile.limbs) || {};
      var aliases = FHSE.limbs.aliasesFor(profile, actorId, data);
      var names = (data.system().switches) || [];
      var out = [];
      for (var id = 1; id < names.length; id++) {
        var n = names[id];
        if (!n) continue;
        if (cfg.exclude && cfg.exclude.test(n)) continue; // e.g. the separate "sawing" mechanic
        for (var i = 0; i < aliases.list.length; i++) {
          if (switchMatchesAlias(n, aliases.list[i])) { out.push({ id: id, name: n, on: !!switchValues[id] }); break; }
        }
      }
      return { switches: out, guessed: aliases.guessed, aliases: aliases.list };
    },

    // The limb states this profile considers dismemberment, from the game's States.json.
    statesFor: function (profile, data) {
      var cfg = (profile && profile.limbs) || {};
      if (!cfg.stateMatch) return [];
      return data.list('States').filter(cfg.stateMatch);
    }
  };
})(window.FHSE);
