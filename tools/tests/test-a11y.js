/* Can the editor be operated without a mouse, and can its text be read?
 *
 * Both of these regressed silently once already. A `div` with an onclick looks identical to a
 * button on screen and is invisible to the keyboard, and a colour token drifts dim one nudge at a
 * time until the hints nobody re-measured are under AA. Neither shows up in a screenshot.
 *
 * So this checks the two things by construction: every clickable thing is reachable, and every
 * foreground/background pair the stylesheet actually declares clears its WCAG threshold.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (l, ok, d) => { ok ? (pass++, console.log(`  PASS  ${l}`)) : (fail++, console.log(`  FAIL  ${l}${d ? ' — ' + d : ''}`)); };

const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
const jsFiles = [];
(function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'vendor') continue;
    const r = (rel ? rel + '/' : '') + e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), r);
    else if (/\.js$/.test(e.name) && !/^games\/usage-/.test(r)) jsFiles.push({ r: 'js/' + r, text: fs.readFileSync(path.join(dir, e.name), 'utf8') });
  }
})(path.join(ROOT, 'js'), '');

// ---------------------------------------------------------------- 1. keyboard reachability
console.log('=== every clickable thing is reachable without a mouse ===');

/* A non-button element given an `onclick` is the bug. `onactivate` is the helper that wires the
 * click AND Enter/Space AND role/tabindex, so it is the only correct way to do this. */
const CLICKABLE_TAGS = "(div|span|li|td|tr|p|section|article|h[1-6])";
const bad = [];
for (const { r, text } of jsFiles) {
  const re = new RegExp("el\\('" + CLICKABLE_TAGS + "'[^\\n]*?onclick:", 'g');
  text.split('\n').forEach((line, i) => {
    if (line.trim().startsWith('*') || line.trim().startsWith('//')) return;  // a comment describing it
    re.lastIndex = 0;
    if (re.test(line)) bad.push(`${r}:${i + 1}`);
  });
}
check('no non-button element uses a bare onclick', bad.length === 0,
  bad.join(', ') + ' — use onactivate so the keyboard reaches it too');

const util = jsFiles.find(f => f.r === 'js/util.js').text;
check('clickable() sets a role', /setAttribute\('role', 'button'\)/.test(util));
check('clickable() sets tabindex', /setAttribute\('tabindex', '0'\)/.test(util));
check('clickable() handles Enter', /'Enter'/.test(util));
check('clickable() handles Space (native buttons do)', /' '|Spacebar/.test(util));
check('clickable() stops Space scrolling the page', /preventDefault/.test(util));

// The two surfaces that were unreachable, named so a regression is obvious.
const app = jsFiles.find(f => f.r === 'js/app.js').text;
check('the game picker cards are activatable', /class: 'card'[^\n]*onactivate|onactivate[^\n]*class: 'card'/.test(app)
  || /'card' \+ \(g\.generic[^\n]*onactivate/.test(app));
check('the character list items are activatable', /char-item[\s\S]{0,200}onactivate/.test(app));
check('the data-file checklist rows are activatable', /crow miss[\s\S]{0,200}onactivate/.test(app));

// ---------------------------------------------------------------- 2. focus is visible
console.log('\n=== focus is visible ===');
check('a :focus-visible ring is defined', /:focus-visible\s*\{[^}]*outline:/.test(css));
/* The old bug: a bare `input:focus { outline: none }` also silenced every checkbox, which has no
 * border for the replacement border-color to land on. */
const bareReset = /(^|[^-\w])input:focus\s*(,|\{)/m.test(css) && /input:focus[^{]*\{[^}]*outline:\s*none/.test(css);
check('no unscoped input:focus that strips the ring', !bareReset,
  'a bare input:focus also hits checkboxes, which have no border to recolour');
check('the ring is offset so it clears the control it rings', /outline-offset/.test(css));

// ---------------------------------------------------------------- 3. contrast
console.log('\n=== contrast, computed from the tokens the stylesheet declares ===');
const tok = {};
for (const m of css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) tok[m[1]] = m[2];
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = h => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const l1 = L(a), l2 = L(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

// Every ground a foreground token can land on in this app.
const GROUNDS = ['--bg', '--bg-2', '--bg-3', '--panel'].map(k => tok[k]).concat(['#151212']); // .lrow stripe
const TEXT = ['--ink', '--ink-dim', '--ink-faint', '--accent-text'];
for (const k of TEXT) {
  const worst = Math.min(...GROUNDS.map(g => ratio(tok[k], g)));
  check(`${k} reads as text on every ground (${worst.toFixed(2)} >= 4.5)`, worst >= 4.5, tok[k]);
}
// The focus ring and the field border are UI boundaries: 3:1, per WCAG 2.2 SC 1.4.11.
for (const [k, grounds, need] of [
  ['--focus', GROUNDS, 3.0],
  ['--field-line', [tok['--bg'], tok['--panel']], 3.0],
]) {
  const worst = Math.min(...grounds.map(g => ratio(tok[k], g)));
  check(`${k} is a visible boundary (${worst.toFixed(2)} >= ${need})`, worst >= need, tok[k]);
}
/* --accent-2 is the brand red and is NOT required to pass as text — it is a fill and a stroke.
 * The guard is that it must not creep back into a `color:` rule, which is what --accent-text is
 * for. (h1 is large text, where 3:1 is the bar, so the masthead is allowed.) */
/* `border-color:` and `accent-color:` both END in "color:", so the property has to be anchored to
 * the start of a declaration or every red border in the file reads as a red word. */
const asText = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
  .filter(m => /(^|[;{]|\s)color:\s*var\(--accent-2\)/.test(m[2]))
  .map(m => m[1].trim().split('\n').pop().trim())
  .filter(s => !/masthead/.test(s));
check('the brand red is not used as body text anywhere', asText.length === 0,
  asText.join(' | ') + ' — use --accent-text');

// ---------------------------------------------------------------- 4. motion + narrow screens
console.log('\n=== motion and small screens ===');
check('prefers-reduced-motion is honoured', /@media \(prefers-reduced-motion: reduce\)/.test(css));
check('the card lift is cancelled under it',
  /prefers-reduced-motion[\s\S]{0,300}transform:\s*none/.test(css));
/* The hexen board is 816 units wide; scaled to a phone its labels hit ~4px. It must keep a size
 * and pan instead. */
const boardW = 816, MIN_LEGIBLE = 8;
const mw = css.match(/\.hexboard\s*\{[^}]*min-width:\s*(\d+)px/);
check('the hexen board keeps a min-width at phone size', !!mw, 'labels would render at ~4px');
if (mw) {
  const labelPx = 11 * (+mw[1]) / boardW;
  check(`its 11-unit labels stay legible (${labelPx.toFixed(1)}px >= ${MIN_LEGIBLE}px)`, labelPx >= MIN_LEGIBLE);
  check('and its container scrolls instead of clipping', /\.hexwrap\s*\{[^}]*overflow-x:\s*auto/.test(css));
}

// ---------------------------------------------------------------- 5. announcements
console.log('\n=== the app can be heard, not just seen ===');
check('the toast is a live region', /role: 'status'|role="status"/.test(app),
  'otherwise every confirmation and error is silent to a screen reader');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
