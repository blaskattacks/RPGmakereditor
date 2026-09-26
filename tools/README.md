# tools — offline extractors

Node scripts for pulling game-aware data out of an RPG Maker MV install. They run **outside** the
editor (the editor itself stays a static, no-build browser app) and are only needed when adding or
refreshing a game profile. Nothing here ships game assets — point them at your own installation.

## `decrypt-rpgmvp.js` — decrypt MV's encrypted assets

`.rpgmvp` files are ordinary PNGs behind a trivial obfuscation: a 16-byte `RPGMV` header, then the
real file's first 16 bytes XORed with `System.json`'s `encryptionKey`. Everything past byte 32 is
untouched.

```bash
node tools/decrypt-rpgmvp.js "<game>/www" <outDir> "<filenameRegex>"
```

Defaults to Fear & Hunger's hexen art (`^the_hexen`). Each output is checked for a valid PNG
signature and its IHDR dimensions are printed.

## `extract-hexen.js` — rebuild the hexen skill tree

Reconstructs Fear & Hunger's hexen table from the game's own event data.

```bash
node tools/extract-hexen.js "<game>/www" <cursorVarId> <outJson>
```

How it works — two events, cross-checked:

- The **navigator** event branches on `HEXEN_cursor` (var 166) in a fixed order and, inside each
  branch, moves the cursor picture and shows that node's name plate. That yields each node's
  on-screen position. Node ids are **branch-major**, not sequential: `1-4, 11-14, 21-25, 31-33,
  41-42, 51-53, 61-65`, so the *k*-th branch pairs with the *k*-th cursor position — never index
  the positions by node id.
- The **purchase** events branch on the same variable and give the authoritative `skillId`, the
  `SKILL_*` switch that records the purchase, the prerequisite switches tested on the way in, and
  the `*_soul` branch gate.

Plate **art names are legacy** — the game rebalanced skills without renaming images, so
`SKILL_backstab` now grants *En garde* and the `crows` plate sits on *Pyromancy trick*. The script
reports plate-vs-switch agreement (18/26 for F&H1) purely as a sanity signal; the skill id from the
purchase event is always the source of truth.

Output (`hexen-fh1.json`, 26 nodes) per node: `index, x, y, plate, skillId, skill,
purchasedSwitch(+Name), prereqSwitches[], branchSwitches[]`.

### Why the switch matters

Granting a hexen skill properly means **two** writes, not one: push the id into the actor's
`_skills`, *and* set that node's `SKILL_*` switch. Skipping the switch leaves the in-game hexen
table still offering the node for purchase and breaks anything downstream that gates on it.

Branch gates are `Endless_soul`, `Domination_soul`, `tormented_soul`, `Enlightened_soul`.
Hexen skills go to whichever character is selected — actors 1, 3, 4, 5, 6, 9, 11.

## `modswap.ps1` — install a file-replacement mod, reversibly

Double-click **`Mod swapper.bat`** for a menu, or drive it directly:

```bash
powershell -ExecutionPolicy Bypass -File tools/modswap.ps1 -Action install -Game "<game dir>" -Mod "<folder or .zip>"
powershell -ExecutionPolicy Bypass -File tools/modswap.ps1 -Action restore -Game "<game dir>" -Mod "<mod name>"
powershell -ExecutionPolicy Bypass -File tools/modswap.ps1 -Action status  -Game "<game dir>"
```

Mods for these games are usually packaged as a **mirror of the game's own folder tree** —
`www\data\Items.json`, `www\data\Map014.json` — which makes install and uninstall purely
mechanical. Originals go to `<game>\_SaveDelver-Backups\<mod>\` alongside a `manifest.json`
recording every path touched, whether it existed before, and SHA-256 of both the original and the
modded file.

Why the manifest rather than "copy the folder back":

- **Installing twice** would otherwise overwrite the pristine backup with already-modded files. It
  refuses unless you `-Force`, and even then never overwrites an existing backup file.
- **A mod that ADDS a file** has to be *deleted* on restore, not left behind. `existedBefore`
  records that.
- **A game update after you modded** means the file on disk matches neither hash; restore skips it
  with a warning rather than silently reverting you to a stale version. `-Force` overrides.

Per file the order is: **back the original up, verify it, then overwrite it**, and the manifest is
rewritten each time round. If an install dies halfway (denied permission, locked file, full disk)
the manifest already describes what was swapped, so `-Action restore` still undoes it. And because
the backup happens first, a file whose *backup* fails is never touched at all.

`-DryRun` prints the plan without writing. `-Action status` reports, per file, whether it is
currently modded, original, or changed since.

Game detection insists on an actual engine file (`www\js\rpg_core.js`, `js\rmmz_core.js`, …).
Matching on a `data` folder alone turned a Steam library scan into a list of Fallout, RimWorld and
most of Command & Conquer.

### You don't need the archive structure

RPG Maker's layout is fixed, so a loose `Items.json` isn't ambiguous — it belongs in the data
directory, which is `www\data` on MV and `data` on MZ. Hand `-Mod` a folder of **bare files** and
each is routed by name:

| File | Goes to |
|---|---|
| `System/Actors/Classes/Skills/States/Items/Weapons/Armors/Enemies/Troops/Animations/Tilesets/CommonEvents/MapInfos.json`, `MapNNN.json` | the game's data dir |
| `*.js` | the game's `js\plugins` |
| anything else | **skipped, and named in the output** |

Art and audio are deliberately *not* routed by extension — `img\pictures`, `img\characters`,
`img\faces` and a dozen more are all just `.png`, and guessing would put the file somewhere
plausible and wrong. Those need a `www\...` tree, which still works exactly as before; the two
modes are detected automatically. The dry run prints each routed file as
`www\data\Items.json   <- Items.json` so you can check the placement before anything is written.

So for a RAR you don't have to preserve anything: drag the files out of it into a folder and point
the tool at that. (RAR itself isn't readable — Windows has no built-in RAR support and there's no
bundled decompressor. Folders and `.zip` work directly.)

### A note on encoding

`modswap.ps1` is ASCII-only and saved **with a UTF-8 BOM**. Windows PowerShell 5.1 reads a
BOM-less file as ANSI, which mangles any non-ASCII character — an em dash in a comment was enough
to produce seven cascading parse errors pointing at an innocent line 200 further down. If you edit
this script, keep the BOM.

**Not a button in the editor, on purpose.** The web app can't do this: it's meant to run from
`file://`, and Chrome's File System Access API refuses write access to system directories like
`Program Files`, which is where these games live.

## `tests/` — run against a real installation

```bash
node tools/tests/test-codecs.js     # MV/MZ codec auto-detection + round-trips on real saves
node tools/tests/test-profiles.js   # every profile registers, ids unique, detect() not too greedy
node tools/tests/test-fh-edits.js   # limbs, party additions, inventory, equipment
node tools/tests/test-hexen.js      # every hexen node resolves to a real skill and switch
```

They load the browser modules under Node in the exact order `index.html` does — so a profile added
without a `<script>` tag fails the suite — and read saves and data from the paths at the top of
each file. Adjust those if your library isn't on `A:`.

Two helpers sit alongside them: `scan-escapes.js` finds JS string literals that lost a backslash
(a real hazard here — some shells collapse `\\` to `\`, silently turning `www\\data` into
`wwwdata`), and `png-bbox.js` reports a sprite's opaque bounding box, which is how the cursor
ring's centre offset (+40, +36.5) was measured.

## `extract-hexen-termina.js` — the same, for Termina

Termina shares almost nothing with F&H1's design beyond the name, which is why it gets its own
extractor rather than a flag:

| | Fear & Hunger | Termina |
|---|---|---|
| layout | one navigator event moving a cursor between 26 fixed screen positions | a whole **map** (`hexen`, Map031) with **one event per node** — 104 of them |
| position from | Show Picture coordinates, in navigator order | the node event's own grid position (17×19 tiles at 48px) |
| grants | always a skill | a skill **or** a parameter (`attack+1`, `mind capacity`) — 13 of the 104 |
| roots gated by | a `*_soul` switch | a god's **affliction level**, a variable: Fear, Gro-goroth, Sylvian, Rher, Vinushka, All-mer, at levels 1–3 |
| records the buyer | no | yes, in a `learns_<node>` variable — but only for the 17 the game defines |
| currency | Lesser soul | Soul stone (item #116) |

```bash
node tools/extract-hexen-termina.js "<game>/www" <outJs>
```

**Two things that bite.** Gates are found by walking the event's IF stack and anchoring on the
command that records the purchase; the naive "first conditional on the page" reading picks up the
`PartySize` menu branch instead of the real prerequisite.

And several Termina nodes flip *two* purchase switches, because the project inherited F&H1's
switch list — the lockpicking node sets both `SKILL_Lockpicking` (F&H1's) and `SKILL_lockpicking`
(the one Termina's tree actually tests). Taking whichever came first left dangling prerequisites
and unreachable nodes. The script collects every candidate and picks the one other nodes depend
on, falling back to the closest name match. `test-hexen.js` asserts both properties, so a
regression here fails loudly instead of silently mis-wiring the tree.

## `extract-usage.js` — where each switch and variable is used

RPG Maker stores **no notes** for switches or variables: `System.json` holds a bare name and
nothing more. (Only database entries like Items and Skills have a `note` field.) So the only way
to learn what `Sleep_cool_down` does is to see where the game writes and tests it.

```bash
node tools/extract-usage.js "<game>/www" <outJs> <profileId>
```

Scans every map and common event for Control Variables, Control Switches, conditional branches,
`\V[n]` interpolation in shown text, and `$gameVariables` / `$gameSwitches` script calls. Per entry
it records how often it is written and tested, the values it is set to / incremented by / compared against,
and which maps or common events touch it. Place names are pooled into a shared string table and
lists are capped at 10, because these ship to the browser.

The result is real documentation the game never wrote down — F&H's `HUNGER_MERC` is compared
against 63/68/78/88/108/128 inside a common event called *HUNGER LEVELS_Mercenary*, which are the
hunger-level breakpoints.

Sizes: F&H 218KB, Termina 419KB, Look Outside 124KB. Together that is too much to parse on every
startup, so `js/usage.js` injects only the one for the game being edited, via a `<script>` tag
rather than `fetch` (the editor is meant to run from `file://`, where fetch is blocked).
