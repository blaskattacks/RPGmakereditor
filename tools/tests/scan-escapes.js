/* Find JS string literals that lost a backslash.
 *
 * The bug this exists for: writing source through a shell heredoc collapses a doubled backslash to
 * a single one, so 'www\\data' becomes 'www\data' -- and \d is not an escape, so JS silently drops
 * the backslash and the string reads "wwwdata". Worse, 'www\\files' becomes \f, a real form feed,
 * which renders as a blob in the UI and is invisible in a diff.
 *
 * The signature is a backslash directly after an ALPHANUMERIC character: that is what a path
 * segment looks like (www\data, save\file1, tools\Mod swapper.bat). Deliberate escapes in prose
 * follow punctuation or a space instead ('...yet.\n\n', '?\n\n'), and a regex's \s follows a
 * bracket. Matching on the path shape rather than on "is this a valid escape" is what keeps this
 * quiet enough to be worth reading -- a checker that always reports three failures gets ignored,
 * and then it is not protecting anything.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const BS = String.fromCharCode(92); // a literal backslash, written without typing one

// Everything shipped to the browser, so a new file is covered the day it is added.
const FILES = [];
(function collect(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'tools' || e.name === '.claude' || e.name === 'vendor' || e.name === 'css') continue;
    const r = (rel ? rel + '/' : '') + e.name;
    if (e.isDirectory()) collect(path.join(dir, e.name), r);
    // The generated usage indexes are machine-written and huge; they never go through a heredoc.
    else if (/\.js$/.test(e.name) && !/^js\/games\/usage-/.test(r)) FILES.push(r);
  }
})(ROOT, '');

let problems = 0;
for (const f of FILES) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8');

  // 1. Real control characters that leaked into the source -- the form-feed case, caught directly.
  const ctrl = [...text].filter(c => {
    const n = c.charCodeAt(0);
    return n < 32 && c !== '\n' && c !== '\r' && c !== '\t';
  });

  /* 2. A lone backslash sitting between an alphanumeric and a letter: a path that lost its escape.
   *
   * This has to walk the literal rather than regex it, because escapes chain: in '\n\n' the first
   * escape's `n` would otherwise look like the alphanumeric preceding the second, and every piece
   * of prose in the project would be reported. A character produced BY an escape can never be the
   * start of a path segment, so consuming escapes as single units is what makes the check quiet. */
  const lines = text.split(/\r?\n/);
  const suspect = [];
  const isAlnum = c => /[A-Za-z0-9]/.test(c || '');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/'([^'\\]|\\.)*'/g)) {
      const lit = m[0], body = lit.slice(1, -1);
      let prev = '', prevFromEscape = false;
      for (let k = 0; k < body.length; k++) {
        if (body[k] !== BS) { prev = body[k]; prevFromEscape = false; continue; }
        const next = body[k + 1] || '';
        // A doubled backslash is a deliberate literal one, and cannot start a lost escape.
        if (next === BS) { prev = BS; prevFromEscape = true; k++; continue; }
        if (isAlnum(prev) && !prevFromEscape && /[a-zA-Z]/.test(next)) {
          suspect.push({ line: i + 1, lit, esc: prev + BS + next });
        }
        prev = next; prevFromEscape = true; k++;
      }
    }
  });

  if (ctrl.length || suspect.length) {
    problems++;
    console.log(`\n${f}`);
    if (ctrl.length) console.log(`  !! ${ctrl.length} raw control character(s): ${ctrl.map(c => 'U+' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(', ')}`);
    for (const s of suspect) console.log(`  L${s.line}  lost escape "${s.esc}" in  ${s.lit.slice(0, 90)}`);
  }
}
console.log(`\nscanned ${FILES.length} shipped file(s) -- ` + (problems ? `${problems} need repair` : 'all clean.'));
