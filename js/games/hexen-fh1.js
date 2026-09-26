/* games/hexen-fh1.js — Fear & Hunger's hexen skill tree, extracted from the game's own
 * event data by tools/extract-hexen.js. Coordinates are CENTRES on the game's 816x624 board
 * (the events record sprite upper-left; the cursor ring's centre is +40,+36.5 inside its sprite).
 *
 * The editor draws its own board from these numbers rather than shipping the game's art, so
 * nothing here is a game asset - just node positions, skill ids and switch ids.
 *
 * Per node: i = HEXEN_cursor index (branch-major: 1-4, 11-14, 21-25, ...), skillId = what it
 * actually grants, sw = the SKILL_* switch recording the purchase, pre = prerequisite switches,
 * gateSw = the *_soul branch gate. Plate ART names are legacy and deliberately not used.
 */
(function (FHSE) {
  'use strict';
  FHSE.hexen = FHSE.hexen || {};
  FHSE.hexen['fear-and-hunger'] = {
    "board": {
      "w": 816,
      "h": 624
    },
    "cursorVar": 166,
    "hubs": [
      {
        "x": 129,
        "y": 224
      },
      {
        "x": 262,
        "y": 95
      },
      {
        "x": 531,
        "y": 95
      },
      {
        "x": 668,
        "y": 224
      },
      {
        "x": 668,
        "y": 410
      },
      {
        "x": 531,
        "y": 539
      },
      {
        "x": 262,
        "y": 539
      },
      {
        "x": 129,
        "y": 410
      }
    ],
    "souls": {
      "Endless": [
        1,
        2,
        3,
        4,
        11,
        12,
        13,
        14
      ],
      "Domination": [
        21,
        22,
        23,
        24,
        25,
        31,
        32,
        33
      ],
      "Tormented": [
        41,
        42,
        51,
        52,
        53
      ],
      "Enlightened": [
        61,
        62,
        63,
        64,
        65
      ]
    },
    "nodes": [
      {
        "i": 1,
        "x": 281,
        "y": 144,
        "skillId": 72,
        "skill": "Lockpicking",
        "sw": 1185,
        "swName": "SKILL_Lockpicking",
        "pre": [],
        "gate": "Endless_soul",
        "gateSw": 1182,
        "b": 0,
        "soul": "Endless"
      },
      {
        "i": 2,
        "x": 331,
        "y": 170,
        "skillId": 70,
        "skill": "Steal",
        "sw": 1187,
        "swName": "SKILL_steal",
        "pre": [
          1185
        ],
        "gate": "Endless_soul",
        "gateSw": 1182,
        "b": 0,
        "soul": "Endless"
      },
      {
        "i": 3,
        "x": 409,
        "y": 138,
        "skillId": 21,
        "skill": "Necromancy",
        "sw": 1199,
        "swName": "SKILL_necromancy",
        "pre": [
          1198
        ],
        "gate": null,
        "gateSw": null,
        "b": 0,
        "soul": "Endless"
      },
      {
        "i": 4,
        "x": 457,
        "y": 138,
        "skillId": 51,
        "skill": "Blood golem",
        "sw": 1198,
        "swName": "SKILL_blood_golem",
        "pre": [],
        "gate": null,
        "gateSw": null,
        "b": 0,
        "soul": "Endless"
      },
      {
        "i": 11,
        "x": 273,
        "y": 198,
        "skillId": 146,
        "skill": "En garde",
        "sw": 1186,
        "swName": "SKILL_backstab",
        "pre": [
          1185
        ],
        "gate": "Endless_soul",
        "gateSw": 1182,
        "b": 1,
        "soul": "Endless"
      },
      {
        "i": 12,
        "x": 323,
        "y": 223,
        "skillId": 71,
        "skill": "Dash",
        "sw": 1188,
        "swName": "SKILL_sprint",
        "pre": [
          1187,
          1186
        ],
        "gate": "Endless_soul",
        "gateSw": 1182,
        "b": 1,
        "soul": "Endless"
      },
      {
        "i": 13,
        "x": 449,
        "y": 193,
        "skillId": 12,
        "skill": "Hurting",
        "sw": 1197,
        "swName": "SKILL_hurting",
        "pre": [
          1198,
          1200
        ],
        "gate": null,
        "gateSw": null,
        "b": 1,
        "soul": "Endless"
      },
      {
        "i": 14,
        "x": 509,
        "y": 175,
        "skillId": 199,
        "skill": "Pyromancy trick",
        "sw": 1200,
        "swName": "SKILL_pyromancy_trick",
        "pre": [],
        "gate": "Endless_soul",
        "gateSw": 1182,
        "b": 1,
        "soul": "Endless"
      },
      {
        "i": 21,
        "x": 179,
        "y": 246,
        "skillId": 68,
        "skill": "Defence stance",
        "sw": 1189,
        "swName": "SKILL_defencestance",
        "pre": [],
        "gate": "Domination_soul",
        "gateSw": 1181,
        "b": 2,
        "soul": "Domination"
      },
      {
        "i": 22,
        "x": 234,
        "y": 247,
        "skillId": 67,
        "skill": "Counter",
        "sw": 1190,
        "swName": "SKILL_counter",
        "pre": [
          1189
        ],
        "gate": "Domination_soul",
        "gateSw": 1181,
        "b": 2,
        "soul": "Domination"
      },
      {
        "i": 23,
        "x": 471,
        "y": 264,
        "skillId": 150,
        "skill": "Black orb",
        "sw": 1201,
        "swName": "SKILL_blackorb",
        "pre": [
          1197
        ],
        "gate": null,
        "gateSw": null,
        "b": 2,
        "soul": "Domination"
      },
      {
        "i": 24,
        "x": 586,
        "y": 259,
        "skillId": 55,
        "skill": "Pheromones",
        "sw": 1202,
        "swName": "SKILL_pheromones",
        "pre": [],
        "gate": null,
        "gateSw": null,
        "b": 2,
        "soul": "Domination"
      },
      {
        "i": 25,
        "x": 256,
        "y": 297,
        "skillId": 136,
        "skill": "Leg sweep",
        "sw": 1191,
        "swName": "SKILL_legsweep",
        "pre": [
          1189,
          1211
        ],
        "gate": "Domination_soul",
        "gateSw": 1181,
        "b": 2,
        "soul": "Domination"
      },
      {
        "i": 31,
        "x": 203,
        "y": 300,
        "skillId": 66,
        "skill": "Fast attack",
        "sw": 1211,
        "swName": "SKILL_fast_stance",
        "pre": [
          1189
        ],
        "gate": "Domination_soul",
        "gateSw": 1181,
        "b": 3,
        "soul": "Domination"
      },
      {
        "i": 32,
        "x": 567,
        "y": 310,
        "skillId": 151,
        "skill": "Healing whispers",
        "sw": 1204,
        "swName": "SKILL_healing",
        "pre": [
          1202,
          1203
        ],
        "gate": null,
        "gateSw": null,
        "b": 3,
        "soul": "Domination"
      },
      {
        "i": 33,
        "x": 626,
        "y": 301,
        "skillId": 238,
        "skill": "Loving whispers",
        "sw": 1203,
        "swName": "SKILL_loving_whispers",
        "pre": [],
        "gate": null,
        "gateSw": null,
        "b": 3,
        "soul": "Domination"
      },
      {
        "i": 41,
        "x": 182,
        "y": 370,
        "skillId": 78,
        "skill": "Devour",
        "sw": 1192,
        "swName": "SKILL_devour",
        "pre": [],
        "gate": "tormented_soul",
        "gateSw": 1183,
        "b": 4,
        "soul": "Tormented"
      },
      {
        "i": 42,
        "x": 235,
        "y": 379,
        "skillId": 79,
        "skill": "Marksmanship",
        "sw": 1194,
        "swName": "SKILL_marksmanship",
        "pre": [
          1192,
          1193
        ],
        "gate": "tormented_soul",
        "gateSw": 1183,
        "b": 4,
        "soul": "Tormented"
      },
      {
        "i": 51,
        "x": 204,
        "y": 420,
        "skillId": 283,
        "skill": "War cry",
        "sw": 1193,
        "swName": "SKILL_war_cry",
        "pre": [],
        "gate": "tormented_soul",
        "gateSw": 1183,
        "b": 5,
        "soul": "Tormented"
      },
      {
        "i": 52,
        "x": 475,
        "y": 416,
        "skillId": 48,
        "skill": "Locust swarm",
        "sw": 1208,
        "swName": "SKILL_locustswarm",
        "pre": [
          1206,
          1207
        ],
        "gate": null,
        "gateSw": null,
        "b": 5,
        "soul": "Tormented"
      },
      {
        "i": 53,
        "x": 586,
        "y": 377,
        "skillId": 148,
        "skill": "Blood portal",
        "sw": 1205,
        "swName": "SKILL_portal",
        "pre": [],
        "gate": null,
        "gateSw": null,
        "b": 5,
        "soul": "Tormented"
      },
      {
        "i": 61,
        "x": 265,
        "y": 473,
        "skillId": 115,
        "skill": "Counter-magic",
        "sw": 1195,
        "swName": "SKILL_dispel",
        "pre": [],
        "gate": "Enlightened_soul",
        "gateSw": 1184,
        "b": 6,
        "soul": "Enlightened"
      },
      {
        "i": 62,
        "x": 310,
        "y": 497,
        "skillId": 74,
        "skill": "Greater blood magic",
        "sw": 1196,
        "swName": "SKILL_greater",
        "pre": [],
        "gate": "Enlightened_soul",
        "gateSw": 1184,
        "b": 6,
        "soul": "Enlightened"
      },
      {
        "i": 63,
        "x": 407,
        "y": 499,
        "skillId": 149,
        "skill": "Flock of crows",
        "sw": 1209,
        "swName": "SKILL_flock_of_crows",
        "pre": [
          1207
        ],
        "gate": null,
        "gateSw": null,
        "b": 6,
        "soul": "Enlightened"
      },
      {
        "i": 64,
        "x": 459,
        "y": 483,
        "skillId": 56,
        "skill": "Mastery over insects",
        "sw": 1207,
        "swName": "SKILL_mastery",
        "pre": [],
        "gate": null,
        "gateSw": null,
        "b": 6,
        "soul": "Enlightened"
      },
      {
        "i": 65,
        "x": 547,
        "y": 450,
        "skillId": 122,
        "skill": "Needle worm",
        "sw": 1206,
        "swName": "SKILL_needleworm",
        "pre": [],
        "gate": null,
        "gateSw": null,
        "b": 6,
        "soul": "Enlightened"
      }
    ]
  };
})(window.FHSE);
