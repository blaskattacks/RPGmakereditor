# SaveDelver — a game-aware RPG Maker save editor

A save editor in the spirit of [saveeditonline.com](https://www.saveeditonline.com/), but it
actually *understands* the game. Instead of showing raw ID numbers, it maps everything to real
names using the game's own data files, so you can edit a character's **skills, abilities,
afflictions, lost limbs, stats, and equipment** directly.

**Tested** games — a real save has been opened, edited and reloaded: **Fear & Hunger**,
**Fear & Hunger 2: Termina** (RPG Maker MV) and **Look Outside** (RPG Maker MZ).

**Skeleton** profiles ship for **OMORI**, **The Coffin of Andy and Leyley**, **The Witch's House
MV**, **Ib** (2022 remake) and **Little One**. These are marked `SKELETON` in the picker: nobody
has round-tripped a real save through them yet, so their labels and state grouping are unchecked.
The names you see are still read from the game's own data files, so they're accurate either way.

And if your game has no profile at all, the two **Any RPG Maker MV / MZ game** entries work
anyway — see *Adding another game* below.

Everything runs **100% in your browser**. Your save file is never uploaded anywhere.

**▶ [Open SaveDelver](https://blaskattacks.github.io/RPGmakereditor/)** — or download the repo and
double-click `index.html`. Both are the same tool; see *Hosted or local?* below for the one
difference.

---

## How to use it

1. **Back up your save first.** Always keep a copy of the original save (`.rpgsave` / `.rmmzsave`).
2. Open **[the hosted copy](https://blaskattacks.github.io/RPGmakereditor/)**, or **`index.html`**
   from a downloaded copy (double-click it — no install, no server needed).
3. Pick your game (**Fear & Hunger**, **Termina**, or **Look Outside**).
4. Give it the files it asks for:
   - **The save file** — a slot such as `file1.rpgsave` / `file1.rmmzsave` (see locations below).
   - **The game's data files** — click the **“Select your … folder”** button (the app names the
     right folder: `www\data` for the F&H games, `data` for Look Outside), or drag the individual
     `.json` files onto the checklist. These let the editor show real names instead of numbers.
5. Click **Open editor** and make your changes.
   - **No save file?** You can still click **Browse game data** -- the editor opens in a read-only
     reference mode showing the skill tree, switches and variables. These games ration saving, so
     if you cannot save in-game yet, `tools/Mod swapper.bat` installs a mod that lifts the limit
     (backing up your originals first).
6. Click **Download**, then copy the downloaded file back into your save folder (F&H: `www\save`;
   Look Outside: `save`), replacing the slot you edited.

### Where saves live

```
…\Steam\steamapps\common\Fear & Hunger\www\save\file1.rpgsave           (MV)
…\Steam\steamapps\common\Fear & Hunger 2 Termina\www\save\file1.rpgsave   (MV)
…\Steam\steamapps\common\Look Outside\save\file1.rmmzsave               (MZ — note: no www)
```

> Tip: if the folder picker is blocked when opening straight from disk, just drag the eight
> `.json` files (`System, Actors, Classes, Skills, States, Items, Weapons, Armors`) onto the
> checklist instead — that always works.

---

## What you can edit

The character list is grouped **In your party** (leader first, then marching order) and **Elsewhere
in this save**, and the editor opens on the party leader. A save keeps a record for every character
the story has touched, so opening on "the lowest actor id" landed on someone you were not playing --
Levi instead of Marcoh in Termina, the Mercenary instead of the Dark Priest in Fear & Hunger. If you
do select someone outside the party, the panel says so and lists who your party actually is.


- **Characters** — name, nickname, class, level (exp kept in sync), current HP/MP/TP (labelled
  per game — Body/Mind for F&H, Health/Stamina/Ammo for Look Outside), and all eight parameter
  bonuses. Each vital shows its **maximum** and there is a **Max all vitals** button, computed the
  way the engine does: the class curve at that level, plus the actor bonus, plus every equipped
  item. Gear matters — one Look Outside character is wearing a weapon worth +999 max HP.
- **Skills & abilities** — add any skill from a searchable list, remove learned ones. Raising a
  character's **level** also offers the skills their class teaches on the way up: the engine grants
  those during `levelUp`, which setting `_level` in an editor never runs, so a levelled-up character
  would otherwise silently miss them. Barely matters in F&H (16 class learnings in the whole game)
  and matters a lot in Look Outside (116 — the Creep alone teaches 17).
- **States** — afflictions, **sickness** (Infection, Parasites, Spore Poison), Hunger/Fear/Survival
  levels, and mental states — grouped per game and toggleable. Adding a state writes the same turn
  and step counters the engine itself would (`minTurns` / `stepsToRemove`), so it wears off normally.
- **Limbs & dismemberment** *(Fear & Hunger 1 & 2)* — its own panel, because a lost limb is stored
  **twice**: as a state (the mechanical penalty) *and* as a switch that swaps in a limbless walking
  sprite (`$cahara1_arm1`, `$knight_legsoff`). Clearing the state alone leaves the character maimed
  on screen. **Restore every limb** clears both halves at once. The switch ids are verified per
  character against each game's own `System.json` — F&H names them after the character's *class*
  (`mercenary_arm1` for Cahara, `occultist_leg1` for Marina), and the separate `*_sawing_*`
  mechanic is deliberately left alone.
- **Equipment** — every equip slot the game defines (five for F&H, seven for Look Outside).
- **Party** — gold, full inventory (items / weapons / armors) picked from a **radial wheel**, and the
  active roster. The wheel shows a window of entries curving past a fixed pointer rather than all
  200-odd at once; typing spins it to the best match, Enter adds, and arrows or the scroll wheel
  nudge it when you would know the thing on sight but cannot name it.
  Each bag also has two bulk buttons: **top up what you already hold to 99**, and **give me every
  entry at 99** (which asks first -- it pulls in key and quest items too, so it is really a testing
  tool). 99 is the engine ceiling: Game_Party.maxItems returns 99 in both MV and MZ, so a bigger
  number would just be clamped. The roster
  offers the **whole cast**, not just characters this playthrough has met: RPG Maker builds a
  missing actor on demand, so someone you've never encountered joins at their default level and
  gear. They're marked `fresh` vs `in save` so you know which is which.
- **The Hexen** *(both Fear & Hunger games)* — the skill tree as a clickable board. Clicking a node
  grants the skill **and** sets its purchase switch, which is what the in-game table reads to know
  a node was bought; writing only the skill leaves the game still offering it for sale. Prerequisite
  edges are drawn, locked nodes are dimmed, and buying out of order asks first. The board is **drawn
  from the extracted coordinates, not from the game's art** — nothing is copied out of your install,
  and a node's circle *is* its click target, so nothing can drift out of alignment.
  The two games' trees are built completely differently and both are supported: F&H1's 26 nodes
  around an octagon of soul hubs, and Termina's 104-node map where a node may raise a **parameter**
  instead of granting a skill (drawn as a square), the roots gate on a **god's affliction level**
  (editable right there), and 17 nodes record who bought them in a `learns_*` variable, which gets
  written too. With 104 nodes only the ones your playthrough has touched are labelled by default —
  hover for the rest, or tick *label every node*.
  Note the two independent facts it shows: the purchase switch is global to the playthrough, while
  the skill itself only sits on whoever was active at the time — so "bought by another character"
  is a normal state, not damage. Removing a skill only clears the purchase switch when no other
  character still has it.
- **Where you are in the run** *(Termina)* — the game keeps its 3-day clock purely in switches:
  one of DAY1/2/3, one of afternoon/dusk/evening, and the matching combined marker. Shown as a
  3x3 grid, because most combinations are states the game can never be in; picking a square sets
  all three the way the game does. **Sleeping costs one phase** — that is literally one call to the
  `::::DAYS_GO_BY_TOO_FAST` event.
- **Game systems** *(Look Outside)* — the mechanics a game keeps scattered across ~1000 switches and
  variables, gathered into named groups instead of numbered rows: **crafting recipes** (all 16, plus
  the kit that has to be found first), the **cooking** sub-skill, **Eugene's shop** level and takings,
  the **exploration/danger** clock and darkness, and the **transformation**. Groups are matched by
  name, not id, so a patch renumbering things doesn't silently mis-target them. Values that aren't
  scalars are shown read-only — `roomExploration` is a 457-entry array of per-room flags, and a
  number box would destroy it — and transient display state (whatever the shop UI last drew) is
  left out entirely, since editing it does nothing.
- **Variables & switches** — searchable, showing the game's real names (e.g. `HUNGER`,
  `coin_flip`), so you can flip story flags and counters. RPG Maker stores **no notes** for these —
  System.json holds a bare name and nothing else — so each row carries an **ⓘ** that reports where
  the game actually uses it: how often it's written and tested, the values it's set to and compared
  against, and which maps or common events touch it. That turns an opaque name into something
  readable: `HUNGER_MERC` is compared against 63/68/78/88/108/128 inside *HUNGER LEVELS_Mercenary*
  — those are the hunger breakpoints — while `PICTURE_fade_in` turns out to be a two-use cutscene
  flag and `Sleep_cool_down` a real mechanic tested 66 times across 13 maps.

## You only pick the data folder once

Two separate things are kept in this browser's own storage (IndexedDB). Nothing leaves your machine.

**The data library, per game, kept indefinitely.** A game's `data` folder doesn't change between
playthroughs, so the first time you provide it the editor remembers it — and every later visit
fills the checklist in for you, leaving only the save file to drop. It's saved the moment a game's
required set is complete, *not* when you open the editor, so picking the folder and then closing
the tab still counts. Each game is remembered separately, so editing one never evicts another. The
intake says what it remembered and offers **forget them**; dropping a fresh folder replaces it,
which is what you want after the game updates.

**The session in progress, so a crash costs nothing.** Your save and every edit are kept as you
work. Come back and the picker offers **Restore** or **Discard**. A restored session shows a banner
reminding you those edits only ever existed in the browser: download the file and load it once
in-game before relying on it. This one is a single slot — starting a new edit replaces it — and it
survives a download, so a later crash can still recover.

Where storage is unavailable (a private window, blocked site data, or a browser that disallows
IndexedDB on `file://`) every call degrades quietly and the editor works exactly as before, just
without remembering anything.

Fields the editor doesn't touch are preserved exactly, so custom-plugin data stays intact.

---

## Hosted or local?

The same static files either way, and in both cases **your save never leaves your machine** — the
editor makes no network requests at all, so there is no server to send it to. You can check that
claim: `node tools/tests/test-hosting.js` fails the build if any shipped file so much as mentions
an external URL.

|                                          | Hosted | Downloaded |
| ---------------------------------------- | :----: | :--------: |
| Editing saves, skill trees, everything    | ✅ | ✅ |
| The `www\data` folder picker              | ✅ (better) | ⚠️ sometimes blocked on `file://` — drag the JSON files instead |
| Session recovery if the tab dies          | ✅ (better) | ⚠️ browsers restrict IndexedDB on `file://` |
| **The mod swapper** (`tools\Mod swapper.bat`) | ❌ | ✅ |

The mod swapper is the only real difference. It installs a mod that lifts these games' saving
limits, and a web page cannot write into a Steam folder — browsers block the File System Access
API for system directories like `Program Files` outright. So it is a small Windows script that
ships with the download, and the hosted **Mods** tab says so rather than offering a button that
would silently fail.

### Hosting your own copy

There is no build step. Any static host works — copy the repo and serve it:

```bash
python -m http.server 8921      # then open http://localhost:8921
```

Serve it over **HTTPS** if it is public: the clipboard helpers need a secure context, and the
browser storage APIs are happier there too. The initial load is ~290 KB; the per-game usage indexes
(another ~760 KB total) are fetched lazily, only for the game actually opened.

---

## Running the tests

```bash
node tools/tests/test-profiles.js       # one suite
for f in tools/tests/test-*.js; do node "$f"; done   # all of them
node tools/tests/scan-escapes.js        # lint for the lost-backslash bug
```

Many suites check the editor against the **real data files a game ships**, which is the point of
them — a profile that matches nothing in `System.json` is exactly the bug worth catching. Those
suites find your installs automatically (Steam libraries across all drives) and **skip cleanly**
when a game is not present, so the suite runs whether you own three of these games or none:

```bash
SAVEDELVER_FH1="D:/Games/Fear & Hunger/www" node tools/tests/test-fh-edits.js
SAVEDELVER_STEAM="D:/SteamLibrary/steamapps/common" node tools/tests/test-systems.js
```

With all three games installed the suite is **375 checks across fifteen files**; with none, 73 of
them still run.

---

## What is *not* in this repo

**No game files.** No art, no audio, no scripts, no `data/*.json` — nothing from any game. The
editor reads the copy you already own. `.gitignore` is set up to keep saves and game data out even
if you run the tools in place.

`js/games/usage-*.js` and `hexen-fh*.js` are *indexes* derived from game event data — names, ids,
reference counts and node coordinates, the same reference material a wiki publishes. See `LICENSE`.

---

## Adding another game

Each game is a small profile in `js/games/` — `fear-and-hunger.js`, `fear-and-hunger-2.js` (MV) and
`look-outside.js` (MZ) are working examples. To add a game, copy one, adjust the title / `detect` /
labels / state groups, and add a `<script>` tag for it in `index.html`. The codecs, data loader,
and every editor are shared, so a same-engine game mostly just needs its labels and state groupings.
For a different engine, also set `engine` (`rpgmv`/`rpgmz`), `saveExt`, and `dataFolderLabel`.

A profile can also declare `systems`: named groups of switches and variables that make up one
mechanic, matched by name pattern. The shared systems editor renders them, picks the right control
per value type, and refuses to offer arrays or objects as scalars. `look-outside.js` is the worked
example.

---

## How it works (technical)

- **RPG Maker MV** (`.rpgsave`): `LZString.compressToBase64(JsonEx.stringify(state))` — text,
  re-encoded with the exact `lz-string` the game ships (`js/vendor/lz-string.js`).
- **RPG Maker MZ** (`.rmmzsave`): pako/zlib-deflated JSON stored as a UTF-8-wrapped binary string —
  read as binary, re-encoded with the game's own `pako` (`js/vendor/pako.min.js`).
- **The codec is detected from the save file, not from the profile.** Saves are always read as an
  ArrayBuffer and `decodeAuto()` sniffs the real format (extension, then a leading `0x78` zlib
  header, then simply trying both), and rejects anything that decodes to a non-save. A profile's
  `engine` is only an ordering hint — so a skeleton that guesses the wrong engine still opens and
  re-saves the file correctly, and the download is named with the extension that actually applies.
- It never reconstructs game classes: it edits leaf values in place and leaves JsonEx's
  `@`/`@c`/`@a`/`@r` markers untouched. (Integer-valued floats like HP `100.0` come back as `100`
  — the same number; the game rewrites them on its next save.)
- No build step, no dependencies, no network. Just static files.

## Project layout

```
index.html             app shell + views
css/style.css          dark theme
js/vendor/lz-string.js MV compressor (vendored)
js/vendor/pako.min.js  MZ compressor (vendored)
js/util.js             DOM helpers + the searchable "adder" widget
js/widgets/wheel.js    radial item picker (search spins it)
js/cache.js            IndexedDB crash-recovery for the session in progress
js/usage.js            lazy loader + UI for the "where is this used?" index
js/jsonex.js           JsonEx @a/@c navigation helpers
js/rpgsave.js          engine-aware codecs (MV lz-string · MZ pako)
js/mvdata.js           indexes the game's data JSON into id→name lookups
js/gameRegistry.js     registry + skeleton() helper for unverified profiles
js/games/_shared.js    generic state grouping + limb (state↔switch) resolution
js/games/_generic.js   the "Any RPG Maker MV / MZ game" catch-alls
js/games/*.js          profiles: F&H, Termina (MV) · Look Outside (MZ) · skeletons
js/games/hexen-fh*.js  extracted hexen trees, F&H1 + Termina (coordinates + ids, no art)
js/games/usage-*.js    switch/variable usage indexes (lazy-loaded, not in index.html)
js/editors/*.js        characters · hexen · party · systems · variables · switches
tools/modswap.ps1      reversible mod installer (backup -> swap -> restore)
js/app.js              controller: picker → intake → editor → download
tools/                 offline extractors (decrypt .rpgmvp, rebuild the hexen tree)
```

---

## Licence

MIT — see [LICENSE](LICENSE). Unaffiliated with, and unendorsed by, the developers of any game
listed here.
