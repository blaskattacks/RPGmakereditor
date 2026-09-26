#!/usr/bin/env node
/* Run every suite and summarise.
 *
 * Suites that need a game installed skip themselves rather than failing, so this is meaningful on
 * a machine with all three games and on a bare CI runner with none -- it just checks fewer things
 * on the latter. The exit code is what matters: non-zero only if something actually FAILED.
 *
 *   node tools/tests/run-all.js
 */
const fs = require('fs'), path = require('path'), cp = require('child_process');

const DIR = __dirname;
const files = fs.readdirSync(DIR).filter(f => /^test-.*\.js$/.test(f)).sort();

let pass = 0, fail = 0, skipped = 0, broke = 0;
const rows = [];

for (const f of files) {
  const r = cp.spawnSync(process.execPath, [path.join(DIR, f)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/(\d+) passed, (\d+) failed/);
  const p = m ? +m[1] : 0, x = m ? +m[2] : 0;
  pass += p; fail += x;

  let status;
  if (r.status !== 0 && !m) { status = 'BROKE'; broke++; }
  else if (x > 0) status = `${x} FAILED`;
  else if (p === 0) { status = 'skipped'; skipped++; }
  else status = `${p} ok`;

  rows.push([f, status]);
  // Show the detail for anything that went wrong, and nothing otherwise.
  if (status === 'BROKE' || x > 0) console.log(out.trimEnd() + '\n');
}

const w = Math.max(...rows.map(r => r[0].length));
for (const [f, s] of rows) console.log('  ' + f.padEnd(w + 2) + s);

// The lint is not a suite, but a failure here is still a failure.
const esc = cp.spawnSync(process.execPath, [path.join(DIR, 'scan-escapes.js')], { encoding: 'utf8' });
const escBad = /need repair/.test(esc.stdout || '');
if (escBad) console.log('\n' + (esc.stdout || '').trimEnd());
console.log('  ' + 'scan-escapes.js'.padEnd(w + 2) + (escBad ? 'LINT FAILED' : 'clean'));

console.log(`\n${pass} checks passed, ${fail} failed` +
  (skipped ? `, ${skipped} suite(s) skipped (game not installed)` : '') +
  (broke ? `, ${broke} suite(s) errored` : ''));

process.exit(fail || broke || escBad ? 1 : 0);
