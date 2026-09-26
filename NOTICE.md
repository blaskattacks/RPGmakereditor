# Notices and attribution

SaveDelver's own source is MIT — see [LICENSE](LICENSE). This file covers everything else.

## No game files are distributed here

SaveDelver ships **no art, no audio, no scripts and no data files from any game**. It reads the
copy of the game you already own, on your own machine, and nothing it reads is uploaded anywhere —
the editor makes no network requests at all. `.gitignore` is configured to keep saves and game data
out of this repository even if you run the extraction tools in place.

## Bundled third-party libraries

`js/vendor/` contains two unmodified upstream libraries, under their own licences. They are the
same compressors the games themselves ship, which is why a re-encoded save is byte-compatible.

| Library | Copyright | Licence |
| --- | --- | --- |
| [lz-string](https://github.com/pieroxy/lz-string) | © 2013 pieroxy | MIT |
| [pako](https://github.com/nodeca/pako) | © 2014–2017 Vitaly Puzrin and Andrei Tuputcyn | MIT |

## Derived reference data

`js/games/usage-*.js` and `js/games/hexen-fh*.js` are **indexes** built from the event data of
games the author owns: switch and variable names, numeric ids, reference counts, and node
coordinates. They contain no game code, artwork or text.

They exist so the editor can label things correctly — RPG Maker stores no notes for a switch or a
variable, so `Sleep_cool_down` means nothing until you can see what reads and writes it. This is
the same kind of reference material a community wiki publishes.

If you are a rights holder and would like one removed, please open an issue.

## Trademarks

The games are the property of their respective developers:

- **Fear & Hunger** and **Fear & Hunger 2: Termina** — Miro Haverinen
- **Look Outside** — Francis Coulombe

This project is unaffiliated with, and unendorsed by, any of them. Game names are used only to
identify which save format and data layout a profile targets.
