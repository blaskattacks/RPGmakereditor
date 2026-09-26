/* games/hexen-fh2.js — Fear & Hunger 2: Termina's hexen tree, extracted from the game's own
 * map data by tools/extract-hexen-termina.js. Coordinates are pixel CENTRES derived from each
 * node event's grid position on the "hexen" map (17x19 tiles at 48px).
 *
 * The board is drawn by the editor from these numbers - no game art is shipped.
 *
 * Termina differs from F&H1 in three ways worth knowing:
 *   - a node may raise a PARAMETER (attack+1, mind capacity) instead of granting a skill
 *   - the game records WHO bought each node in a learns_<node> variable, so a full edit writes
 *     the skill, the SKILL_* switch and that variable
 *   - prerequisites are the switch tested at the top of the node's interactive page
 */
(function (FHSE) {
  'use strict';
  FHSE.hexen = FHSE.hexen || {};
  FHSE.hexen['fear-and-hunger-2'] = {
    "board": {
      "w": 816,
      "h": 912,
      "tile": 48
    },
    "mapId": 31,
    "soulItem": 116,
    "nodes": [
      {
        "i": 205,
        "x": 744,
        "y": 24,
        "name": "necromancy",
        "skillId": 21,
        "skill": "Necromancy",
        "param": null,
        "sw": 1225,
        "swName": "SKILL_necromancy",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": 266,
        "gateVarName": "grogoroth_affliction",
        "gateValue": 1
      },
      {
        "i": 230,
        "x": 360,
        "y": 72,
        "name": "lunar_meteorite",
        "skillId": 642,
        "skill": "Lunar meteorite",
        "param": null,
        "sw": 1451,
        "swName": "SKILL_lunar_meteorite",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 231,
        "x": 456,
        "y": 72,
        "name": "lunar_storm",
        "skillId": 805,
        "skill": "Lunar storm",
        "param": null,
        "sw": 1449,
        "swName": "SKILL_lunar_storm",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 18,
        "x": 168,
        "y": 168,
        "name": "longinus",
        "skillId": 521,
        "skill": "Longinus",
        "param": null,
        "sw": 2099,
        "swName": "SKILL_blood_spear_return",
        "learnsVar": 1873,
        "learnsVarName": "learns_blood_spear",
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 25,
        "x": 408,
        "y": 168,
        "name": "reveal_aura",
        "skillId": 516,
        "skill": "Reveal aura",
        "param": null,
        "sw": 2089,
        "swName": "SKILL_reveal_aura",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": 263,
        "gateVarName": "Rher_affliction",
        "gateValue": 1
      },
      {
        "i": 126,
        "x": 24,
        "y": 216,
        "name": "dash",
        "skillId": 71,
        "skill": "Dash",
        "param": null,
        "sw": 1956,
        "swName": "SKILL_dash",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1954
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 22,
        "x": 360,
        "y": 216,
        "name": "min_capacity",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 1,
          "label": "Max MP",
          "amount": 25
        },
        "sw": 2091,
        "swName": "SKILL_mind_capacity",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2089
        ],
        "gateVar": 263,
        "gateVarName": "Rher_affliction",
        "gateValue": 2
      },
      {
        "i": 62,
        "x": 456,
        "y": 216,
        "name": "mindread",
        "skillId": 315,
        "skill": "Mind read",
        "param": null,
        "sw": 1229,
        "swName": "SKILL_mind_read",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2089
        ],
        "gateVar": 263,
        "gateVarName": "Rher_affliction",
        "gateValue": 2
      },
      {
        "i": 73,
        "x": 504,
        "y": 216,
        "name": "mdefence_plus1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 5,
          "label": "M.Defense",
          "amount": 1
        },
        "sw": 2087,
        "swName": "SKILL_mdefence",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1231
        ],
        "gateVar": 264,
        "gateVarName": "sylvian_affliction",
        "gateValue": 2
      },
      {
        "i": 23,
        "x": 600,
        "y": 216,
        "name": "pheromones",
        "skillId": 55,
        "skill": "Pheromones",
        "param": null,
        "sw": 1231,
        "swName": "SKILL_pheromones",
        "learnsVar": 1869,
        "learnsVarName": "learns_pheromones",
        "pre": [],
        "gateVar": 264,
        "gateVarName": "sylvian_affliction",
        "gateValue": 1
      },
      {
        "i": 17,
        "x": 216,
        "y": 264,
        "name": "blood_sword",
        "skillId": 519,
        "skill": "Blood sword",
        "param": null,
        "sw": 2095,
        "swName": "SKILL_blood_sword",
        "learnsVar": 1872,
        "learnsVarName": "learns_blood_sword",
        "pre": [],
        "gateVar": 262,
        "gateVarName": "Alll-mer_affliction",
        "gateValue": 1
      },
      {
        "i": 57,
        "x": 408,
        "y": 264,
        "name": "golden_gates",
        "skillId": 515,
        "skill": "Golden gates",
        "param": null,
        "sw": 2093,
        "swName": "SKILL_goldengates",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1229
        ],
        "gateVar": 263,
        "gateVarName": "Rher_affliction",
        "gateValue": 3
      },
      {
        "i": 76,
        "x": 504,
        "y": 264,
        "name": "healing_whispers",
        "skillId": 218,
        "skill": "Healing whispers",
        "param": null,
        "sw": 2085,
        "swName": "SKILL_healing_whispers",
        "learnsVar": 1871,
        "learnsVarName": "learns_healing_whispers",
        "pre": [
          1233
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 24,
        "x": 552,
        "y": 264,
        "name": "loving_whispers",
        "skillId": 238,
        "skill": "Loving whispers",
        "param": null,
        "sw": 1233,
        "swName": "SKILL_loving",
        "learnsVar": 1870,
        "learnsVarName": "learns_loving_whispers",
        "pre": [
          1231
        ],
        "gateVar": 264,
        "gateVarName": "sylvian_affliction",
        "gateValue": 2
      },
      {
        "i": 26,
        "x": 600,
        "y": 264,
        "name": "heartflower",
        "skillId": 512,
        "skill": "Heart flower",
        "param": null,
        "sw": 1994,
        "swName": "SKILL_heartflower",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": 264,
        "gateVarName": "sylvian_affliction",
        "gateValue": 2
      },
      {
        "i": 74,
        "x": 648,
        "y": 264,
        "name": "brainflower",
        "skillId": 511,
        "skill": "Brain flower",
        "param": null,
        "sw": 2043,
        "swName": "SKILL_brain_flower",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": 264,
        "gateVarName": "sylvian_affliction",
        "gateValue": 2
      },
      {
        "i": 45,
        "x": 216,
        "y": 312,
        "name": "defence_plus1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 3,
          "label": "Defense",
          "amount": 1
        },
        "sw": 2202,
        "swName": "SKILL_defence_plus",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2095
        ],
        "gateVar": 262,
        "gateVarName": "Alll-mer_affliction",
        "gateValue": 2
      },
      {
        "i": 40,
        "x": 264,
        "y": 312,
        "name": "inverse_Crown",
        "skillId": 522,
        "skill": "Inverse crown of thorns",
        "param": null,
        "sw": 2204,
        "swName": "SKILL_inverse",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2202
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 20,
        "x": 312,
        "y": 312,
        "name": "resurrection",
        "skillId": 520,
        "skill": "Resurrection",
        "param": null,
        "sw": 2097,
        "swName": "SKILL_resurrection",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2099
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 75,
        "x": 504,
        "y": 312,
        "name": "m_attack+1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 4,
          "label": "M.Attack",
          "amount": 1
        },
        "sw": 2041,
        "swName": "SKILL_mattack_plus2",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2039
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 77,
        "x": 552,
        "y": 312,
        "name": "m_attack+1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 4,
          "label": "M.Attack",
          "amount": 1
        },
        "sw": 2039,
        "swName": "SKILL_mattack_plus",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2038
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 82,
        "x": 600,
        "y": 312,
        "name": "greater_photosynthesis",
        "skillId": 508,
        "skill": "Greater photosynthesis",
        "param": null,
        "sw": 2038,
        "swName": "SKILL_greater_photosynthesis",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2036
        ],
        "gateVar": 265,
        "gateVarName": "vinushka_affliction",
        "gateValue": 3
      },
      {
        "i": 219,
        "x": 648,
        "y": 312,
        "name": "photosynthesis",
        "skillId": 507,
        "skill": "Photosynthesis",
        "param": null,
        "sw": 2036,
        "swName": "SKILL_photosynthesis",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2032
        ],
        "gateVar": 265,
        "gateVarName": "vinushka_affliction",
        "gateValue": 2
      },
      {
        "i": 29,
        "x": 696,
        "y": 312,
        "name": "roots_that_reap",
        "skillId": 505,
        "skill": "Roots that reap",
        "param": null,
        "sw": 2032,
        "swName": "SKILL_roots",
        "learnsVar": 1868,
        "learnsVarName": "learns_roots_that_reap",
        "pre": [],
        "gateVar": 265,
        "gateVarName": "vinushka_affliction",
        "gateValue": 1
      },
      {
        "i": 10,
        "x": 168,
        "y": 360,
        "name": "mastery",
        "skillId": 313,
        "skill": "Mastery over vermin",
        "param": null,
        "sw": 1223,
        "swName": "SKILL_mastery",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1221
        ],
        "gateVar": 261,
        "gateVarName": "Fear_affliction",
        "gateValue": 2
      },
      {
        "i": 46,
        "x": 216,
        "y": 360,
        "name": "mischief_of_rats",
        "skillId": 525,
        "skill": "Mischief of rats",
        "param": null,
        "sw": 2206,
        "swName": "SKILL_mischief",
        "learnsVar": 1876,
        "learnsVarName": "learns_mischief_of_rats",
        "pre": [
          1223
        ],
        "gateVar": 261,
        "gateVarName": "Fear_affliction",
        "gateValue": 3
      },
      {
        "i": 30,
        "x": 600,
        "y": 360,
        "name": "spontaneous",
        "skillId": 506,
        "skill": "Spontaneous combustion",
        "param": null,
        "sw": 2034,
        "swName": "SKILL_spontaneous",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1237
        ],
        "gateVar": 265,
        "gateVarName": "vinushka_affliction",
        "gateValue": 3
      },
      {
        "i": 28,
        "x": 648,
        "y": 360,
        "name": "combustion",
        "skillId": 190,
        "skill": "Combustion",
        "param": null,
        "sw": 1237,
        "swName": "SKILL_combustion",
        "learnsVar": 1867,
        "learnsVarName": "learns_combustion",
        "pre": [
          1235
        ],
        "gateVar": 265,
        "gateVarName": "vinushka_affliction",
        "gateValue": 2
      },
      {
        "i": 27,
        "x": 696,
        "y": 360,
        "name": "Pyromancy",
        "skillId": 199,
        "skill": "Pyromancy trick",
        "param": null,
        "sw": 1235,
        "swName": "SKILL_pyromancy",
        "learnsVar": 1866,
        "learnsVarName": "learns_pyromancy_trick",
        "pre": [],
        "gateVar": 265,
        "gateVarName": "vinushka_affliction",
        "gateValue": 1
      },
      {
        "i": 8,
        "x": 120,
        "y": 408,
        "name": "rot",
        "skillId": 294,
        "skill": "Rot",
        "param": null,
        "sw": 1221,
        "swName": "SKILL_rot",
        "learnsVar": 1874,
        "learnsVarName": "learns_rot",
        "pre": [],
        "gateVar": 261,
        "gateVarName": "Fear_affliction",
        "gateValue": 1
      },
      {
        "i": 16,
        "x": 168,
        "y": 408,
        "name": "agility_plus1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 6,
          "label": "Agility",
          "amount": 1
        },
        "sw": 1253,
        "swName": "SKILL_agility_plus",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1221
        ],
        "gateVar": 261,
        "gateVarName": "Fear_affliction",
        "gateValue": 2
      },
      {
        "i": 15,
        "x": 264,
        "y": 408,
        "name": "devour",
        "skillId": 494,
        "skill": "Devour",
        "param": null,
        "sw": 1962,
        "swName": "SKILL_devour",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1960
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 50,
        "x": 312,
        "y": 408,
        "name": "sisu",
        "skillId": 498,
        "skill": "Sisu",
        "param": null,
        "sw": 2208,
        "swName": "SKILL_sisu",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1962
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 218,
        "x": 552,
        "y": 408,
        "name": "chains_of_torment",
        "skillId": 799,
        "skill": "Chains of torment",
        "param": null,
        "sw": 2026,
        "swName": "SKILL_chains_of_torment",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2024
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 87,
        "x": 600,
        "y": 408,
        "name": "attack+1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 2,
          "label": "Attack",
          "amount": 1
        },
        "sw": 2028,
        "swName": "SKILL_attack_plus3",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2024
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 31,
        "x": 696,
        "y": 408,
        "name": "scorched_earth",
        "skillId": 504,
        "skill": "Scorched earth",
        "param": null,
        "sw": 2030,
        "swName": "SKILL_scorched_earth",
        "learnsVar": 1865,
        "learnsVarName": "learns_scorched_earth",
        "pre": [],
        "gateVar": 266,
        "gateVarName": "grogoroth_affliction",
        "gateValue": 2
      },
      {
        "i": 14,
        "x": 168,
        "y": 456,
        "name": "flesh_puppetry",
        "skillId": 314,
        "skill": "Flesh puppetry",
        "param": null,
        "sw": 1227,
        "swName": "SKILL_flesh_puppetry",
        "learnsVar": 1875,
        "learnsVarName": "learns_flesh_puppetry",
        "pre": [
          1221
        ],
        "gateVar": 261,
        "gateVarName": "Fear_affliction",
        "gateValue": 2
      },
      {
        "i": 159,
        "x": 216,
        "y": 456,
        "name": "bloodlust",
        "skillId": 495,
        "skill": "Bloodlust",
        "param": null,
        "sw": 1960,
        "swName": "SKILL_bloodlust",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1958
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 221,
        "x": 264,
        "y": 456,
        "name": "diplomacy",
        "skillId": 483,
        "skill": "Diplomacy",
        "param": null,
        "sw": 2210,
        "swName": "SKILL_diplomacy",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1954
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 38,
        "x": 552,
        "y": 456,
        "name": "attack+1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 2,
          "label": "Attack",
          "amount": 1
        },
        "sw": 2027,
        "swName": "SKILL_attack_plus2",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2024
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 112,
        "x": 600,
        "y": 456,
        "name": "black_orb",
        "skillId": 150,
        "skill": "Black orb",
        "param": null,
        "sw": 2024,
        "swName": "SKILL_black_orb",
        "learnsVar": 1864,
        "learnsVarName": "learns_black_orb",
        "pre": [
          1241
        ],
        "gateVar": 266,
        "gateVarName": "grogoroth_affliction",
        "gateValue": 3
      },
      {
        "i": 34,
        "x": 648,
        "y": 456,
        "name": "blood_golem",
        "skillId": 51,
        "skill": "Blood golem",
        "param": null,
        "sw": 1241,
        "swName": "SKILL_blood_golem",
        "learnsVar": 1863,
        "learnsVarName": "learns_blood_golem",
        "pre": [
          1225
        ],
        "gateVar": 266,
        "gateVarName": "grogoroth_affliction",
        "gateValue": 2
      },
      {
        "i": 13,
        "x": 696,
        "y": 456,
        "name": "necromancy",
        "skillId": 21,
        "skill": "Necromancy",
        "param": null,
        "sw": 1225,
        "swName": "SKILL_necromancy",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": 266,
        "gateVarName": "grogoroth_affliction",
        "gateValue": 1
      },
      {
        "i": 225,
        "x": 792,
        "y": 456,
        "name": "chains_of_torment",
        "skillId": 799,
        "skill": "Chains of torment",
        "param": null,
        "sw": 2026,
        "swName": "SKILL_chains_of_torment",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2024
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 49,
        "x": 216,
        "y": 504,
        "name": "war_cry",
        "skillId": 496,
        "skill": "War cry",
        "param": null,
        "sw": 1958,
        "swName": "SKILL_war_cry",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 125,
        "x": 264,
        "y": 504,
        "name": "escape_plan",
        "skillId": 291,
        "skill": "Escape plan",
        "param": null,
        "sw": 1954,
        "swName": "SKILL_escape_plan",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1952
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 133,
        "x": 312,
        "y": 504,
        "name": "weaponcraft",
        "skillId": 372,
        "skill": "Weaponcraft",
        "param": null,
        "sw": 1551,
        "swName": "SKILL_weaponcraft",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 116,
        "x": 456,
        "y": 504,
        "name": "analyze",
        "skillId": 369,
        "skill": "Analyze",
        "param": null,
        "sw": 1543,
        "swName": "SKILL_analyze",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1934
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 115,
        "x": 504,
        "y": 504,
        "name": "magna_medicinal",
        "skillId": 368,
        "skill": "Magna-medicinal",
        "param": null,
        "sw": 1936,
        "swName": "SKILL_reverse_medicinal",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1934
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 113,
        "x": 552,
        "y": 504,
        "name": "masterchef",
        "skillId": 455,
        "skill": "Masterchef",
        "param": null,
        "sw": 1942,
        "swName": "SKILL_masterchef",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1940
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 96,
        "x": 600,
        "y": 504,
        "name": "toxicology",
        "skillId": 459,
        "skill": "Toxicology",
        "param": null,
        "sw": 1948,
        "swName": "SKILL_toxicology",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1946
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 35,
        "x": 648,
        "y": 504,
        "name": "black_smog",
        "skillId": 500,
        "skill": "Black smog",
        "param": null,
        "sw": 2022,
        "swName": "SKILL_black_smog",
        "learnsVar": 1862,
        "learnsVarName": "learns_black_smog",
        "pre": [
          1239
        ],
        "gateVar": 266,
        "gateVarName": "grogoroth_affliction",
        "gateValue": 2
      },
      {
        "i": 32,
        "x": 696,
        "y": 504,
        "name": "hurting",
        "skillId": 12,
        "skill": "Hurting",
        "param": null,
        "sw": 1239,
        "swName": "SKILL_hurting",
        "learnsVar": 1861,
        "learnsVarName": "learns_hurting",
        "pre": [],
        "gateVar": 266,
        "gateVarName": "grogoroth_affliction",
        "gateValue": 1
      },
      {
        "i": 124,
        "x": 264,
        "y": 552,
        "name": "lockpicking",
        "skillId": 480,
        "skill": "Lockpicking",
        "param": null,
        "sw": 1952,
        "swName": "SKILL_lockpicking",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1950
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 121,
        "x": 312,
        "y": 552,
        "name": "trapcraft",
        "skillId": 371,
        "skill": "Trapcraft",
        "param": null,
        "sw": 1549,
        "swName": "SKILL_trapcraft",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 141,
        "x": 360,
        "y": 552,
        "name": "marksmanship",
        "skillId": 326,
        "skill": "Marksmanship",
        "param": null,
        "sw": 731,
        "swName": "MarksmanshipAVAILABLE",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          732
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 99,
        "x": 456,
        "y": 552,
        "name": "greater_occulstism",
        "skillId": 440,
        "skill": "Greater occultism",
        "param": null,
        "sw": 1930,
        "swName": "SKILL_greater_occultism",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1248
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 103,
        "x": 504,
        "y": 552,
        "name": "precision_stance",
        "skillId": 486,
        "skill": "Precision stance",
        "param": null,
        "sw": 1934,
        "swName": "SKILL_precision_stance",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1541
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 114,
        "x": 552,
        "y": 552,
        "name": "melee_proficiency",
        "skillId": 456,
        "skill": "Melee proficiency",
        "param": null,
        "sw": 1940,
        "swName": "SKILL_melee_proficiency",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1938
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 157,
        "x": 600,
        "y": 552,
        "name": "undergrowth_awareness",
        "skillId": 460,
        "skill": "Undergrowth awareness",
        "param": null,
        "sw": 1946,
        "swName": "SKILL_undergrowth_awareness",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1944
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 200,
        "x": 648,
        "y": 552,
        "name": "poison_tip",
        "skillId": 462,
        "skill": "Poison tip",
        "param": null,
        "sw": 2214,
        "swName": "SKILL_poison_tip",
        "learnsVar": 1891,
        "learnsVarName": "learns_poison_tip",
        "pre": [
          1944
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 37,
        "x": 264,
        "y": 600,
        "name": "persuade",
        "skillId": 482,
        "skill": "Persuade",
        "param": null,
        "sw": 1950,
        "swName": "SKILL_persuade",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 122,
        "x": 312,
        "y": 600,
        "name": "shortcircuit",
        "skillId": 373,
        "skill": "Short circuit",
        "param": null,
        "sw": 1547,
        "swName": "SKILL_short_circuit",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1545
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 140,
        "x": 360,
        "y": 600,
        "name": "executioner",
        "skillId": 325,
        "skill": "Executioner",
        "param": null,
        "sw": 732,
        "swName": "ExecutionerAVAILABLE",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          733
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 118,
        "x": 456,
        "y": 600,
        "name": "advanced_occultism",
        "skillId": 337,
        "skill": "Advanced occultism",
        "param": null,
        "sw": 1248,
        "swName": "SKILL_advanced_occultism",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1926
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 117,
        "x": 504,
        "y": 600,
        "name": "medicinal",
        "skillId": 367,
        "skill": "Medicinal",
        "param": null,
        "sw": 1541,
        "swName": "SKILL_medicinal",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1932
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 155,
        "x": 552,
        "y": 600,
        "name": "slow_metabolism",
        "skillId": 454,
        "skill": "Slow metabolism",
        "param": null,
        "sw": 1938,
        "swName": "SKILL_slow_metabolism",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 36,
        "x": 600,
        "y": 600,
        "name": "advanced_botanism",
        "skillId": 461,
        "skill": "Advanced botanism",
        "param": null,
        "sw": 1944,
        "swName": "SKILL_advanced_botanism",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 146,
        "x": 120,
        "y": 648,
        "name": "perfect_guard",
        "skillId": 637,
        "skill": "Perfect guard",
        "param": null,
        "sw": 2079,
        "swName": "SKILL_Pefect_guard",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1966
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 164,
        "x": 168,
        "y": 648,
        "name": "bobandweave",
        "skillId": 465,
        "skill": "Bob and weave",
        "param": null,
        "sw": 1968,
        "swName": "SKILL_bob_and_weave",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1966
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 158,
        "x": 216,
        "y": 648,
        "name": "bare-fisted",
        "skillId": 468,
        "skill": "Bare-fisted proficiency",
        "param": null,
        "sw": 1966,
        "swName": "SKILL_barefisted",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 123,
        "x": 312,
        "y": 648,
        "name": "wrenchtoss",
        "skillId": 388,
        "skill": "Wrench toss",
        "param": null,
        "sw": 1545,
        "swName": "SKILL_wrench_toss",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 139,
        "x": 360,
        "y": 648,
        "name": "gunslinger",
        "skillId": 324,
        "skill": "Gunslinger",
        "param": null,
        "sw": 733,
        "swName": "GunslingerAVAILABLE",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1924
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 98,
        "x": 408,
        "y": 648,
        "name": "premonitions",
        "skillId": 445,
        "skill": "Premonitions",
        "param": null,
        "sw": 1928,
        "swName": "SKILL_premonitions",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1246
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 120,
        "x": 456,
        "y": 648,
        "name": "warding_sigil",
        "skillId": 441,
        "skill": "Warding sigil",
        "param": null,
        "sw": 1926,
        "swName": "SKILL_warding_sigil",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1246
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 97,
        "x": 504,
        "y": 648,
        "name": "diagnosis",
        "skillId": 487,
        "skill": "Diagnosis",
        "param": null,
        "sw": 1932,
        "swName": "SKILL_diagnosis",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 171,
        "x": 120,
        "y": 696,
        "name": "adrenaline_rush",
        "skillId": 467,
        "skill": "Adrenaline rush",
        "param": null,
        "sw": 1972,
        "swName": "SKILL_adrenalinerush",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1968
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 129,
        "x": 168,
        "y": 696,
        "name": "counter_stance",
        "skillId": 466,
        "skill": "Counter stance",
        "param": null,
        "sw": 1970,
        "swName": "SKILL_counterstance",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1966
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 135,
        "x": 360,
        "y": 696,
        "name": "gunproficiency",
        "skillId": 323,
        "skill": "Gun proficiency",
        "param": null,
        "sw": 1924,
        "swName": "SKILL_gun_proficiency",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 119,
        "x": 456,
        "y": 696,
        "name": "engrave",
        "skillId": 335,
        "skill": "Engrave",
        "param": null,
        "sw": 1246,
        "swName": "SKILL_engrave",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 208,
        "x": 600,
        "y": 696,
        "name": "steal",
        "skillId": 473,
        "skill": "Steal",
        "param": null,
        "sw": 2012,
        "swName": "SKILL_steal",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 206,
        "x": 648,
        "y": 696,
        "name": "intimidate",
        "skillId": 470,
        "skill": "Intimidate",
        "param": null,
        "sw": 2010,
        "swName": "SKILL_intimidiate",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2012
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 211,
        "x": 696,
        "y": 696,
        "name": "killing_intent",
        "skillId": 471,
        "skill": "Killing intent",
        "param": null,
        "sw": 2014,
        "swName": "SKILL_killing_intent",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2010,
          2012
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 170,
        "x": 120,
        "y": 744,
        "name": "fast_stance",
        "skillId": 464,
        "skill": "Fast stance",
        "param": null,
        "sw": 1974,
        "swName": "SKILL_fast_stance",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1972
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 228,
        "x": 408,
        "y": 744,
        "name": "red_arc",
        "skillId": 798,
        "skill": "Red arc",
        "param": null,
        "sw": 1455,
        "swName": "SKILL_red_arc",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 207,
        "x": 648,
        "y": 744,
        "name": "explosives",
        "skillId": 472,
        "skill": "Explosives",
        "param": null,
        "sw": 2018,
        "swName": "SKILL_explosives",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2012
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 182,
        "x": 216,
        "y": 792,
        "name": "defense+1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 3,
          "label": "Defense",
          "amount": 1
        },
        "sw": 1980,
        "swName": "SKILL_defence_plus1",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1978
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 178,
        "x": 264,
        "y": 792,
        "name": "attack+1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 2,
          "label": "Attack",
          "amount": 1
        },
        "sw": 1978,
        "swName": "SKILL_attack_plus1",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1976
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 177,
        "x": 312,
        "y": 792,
        "name": "agility_plus1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 6,
          "label": "Agility",
          "amount": 1
        },
        "sw": 1976,
        "swName": "SKILL_agility_plus1",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 197,
        "x": 504,
        "y": 792,
        "name": "danse_macabre",
        "skillId": 444,
        "skill": "La Danse Macabre",
        "param": null,
        "sw": 2002,
        "swName": "SKILL_dansemacabre",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 223,
        "x": 600,
        "y": 792,
        "name": "spice_forge",
        "skillId": 447,
        "skill": "Spice forge",
        "param": null,
        "sw": 2212,
        "swName": "SKILL_spice_forge",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2006
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 215,
        "x": 792,
        "y": 792,
        "name": "bribe",
        "skillId": 437,
        "skill": "Bribe",
        "param": null,
        "sw": 2016,
        "swName": "SKILL_bribe",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2012
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 188,
        "x": 216,
        "y": 840,
        "name": "m.attack+1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 4,
          "label": "M.Attack",
          "amount": 1
        },
        "sw": 1984,
        "swName": "SKILL_m_attack_plus1",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1982
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 185,
        "x": 264,
        "y": 840,
        "name": "m.defense+1",
        "skillId": null,
        "skill": null,
        "param": {
          "id": 5,
          "label": "M.Defense",
          "amount": 1
        },
        "sw": 1982,
        "swName": "SKILL_m_defence_plus1",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1976
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 145,
        "x": 360,
        "y": 840,
        "name": "bury_the_trauma",
        "skillId": 475,
        "skill": "Bury the trauma",
        "param": null,
        "sw": 1986,
        "swName": "SKILL_point_blank",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 147,
        "x": 456,
        "y": 840,
        "name": "blood_sacrifice",
        "skillId": 450,
        "skill": "Blood sacrifice",
        "param": null,
        "sw": 1996,
        "swName": "SKILL_bloodsacrifice",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 194,
        "x": 552,
        "y": 840,
        "name": "meditation",
        "skillId": 338,
        "skill": "Meditation",
        "param": null,
        "sw": 2006,
        "swName": "SKILL_meditation",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2002
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 203,
        "x": 600,
        "y": 840,
        "name": "greater_meditation",
        "skillId": 446,
        "skill": "Greater meditation",
        "param": null,
        "sw": 2008,
        "swName": "SKILL_greater_meditation",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          2006
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 191,
        "x": 312,
        "y": 888,
        "name": "order_charge",
        "skillId": 476,
        "skill": "Order, Charge!",
        "param": null,
        "sw": 1990,
        "swName": "SKILL_order_charge",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1964
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 190,
        "x": 360,
        "y": 888,
        "name": "order_engarde",
        "skillId": 146,
        "skill": "En garde",
        "param": null,
        "sw": 1964,
        "swName": "SKILL_engarde",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1986
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 229,
        "x": 408,
        "y": 888,
        "name": "moth_swarm",
        "skillId": 802,
        "skill": "Moth swarm",
        "param": null,
        "sw": 1453,
        "swName": "SKILL_moth_swarm",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 181,
        "x": 456,
        "y": 888,
        "name": "masturbation",
        "skillId": 451,
        "skill": "Masturbation",
        "param": null,
        "sw": 1998,
        "swName": "SKILL_masturbation",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1996
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 195,
        "x": 504,
        "y": 888,
        "name": "greater_bloodmagic",
        "skillId": 449,
        "skill": "Greater blood magic",
        "param": null,
        "sw": 2000,
        "swName": "SKILL_greaterblood",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [
          1998
        ],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      },
      {
        "i": 199,
        "x": 792,
        "y": 888,
        "name": "counter-magic_unused",
        "skillId": 115,
        "skill": "Counter-magic",
        "param": null,
        "sw": 2004,
        "swName": "SKILL_counter-magic",
        "learnsVar": null,
        "learnsVarName": null,
        "pre": [],
        "gateVar": null,
        "gateVarName": null,
        "gateValue": null
      }
    ]
  };
})(window.FHSE);
