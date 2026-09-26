/* util.js — namespace + tiny DOM helpers shared across the app. Loads first. */
window.FHSE = window.FHSE || {};
(function (FHSE) {
  'use strict';

  function append(node, children) {
    if (children == null) return;
    if (Array.isArray(children)) { children.forEach(function (c) { append(node, c); }); return; }
    if (children instanceof Node) { node.appendChild(children); return; }
    node.appendChild(document.createTextNode(String(children)));
  }

  /* Make a non-button element behave like one for everybody, not just mouse users.
   *
   * A div with an onclick is invisible to the keyboard: it is not in the tab order and Enter does
   * nothing, so a whole surface built from them cannot be operated at all without a pointer. That
   * is what happened to the game picker and the character list. Anything clickable that cannot be
   * a real <button> (because it contains block content, or is an SVG group) goes through here.
   *
   * Space is treated like Enter because that is what a native button does, and the keydown has to
   * preventDefault or Space scrolls the page instead. */
  function clickable(node, handler) {
    if (!node.hasAttribute('role')) node.setAttribute('role', 'button');
    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
    node.addEventListener('click', handler);
    node.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      handler.call(node, e);
    });
    return node;
  }

  // el('div', {class:'x', onclick:fn, text:'hi'}, [childNodes])
  // Use `onactivate` rather than `onclick` on anything that is not a real button: it wires the
  // click AND the keyboard, and marks the element up as a button for assistive tech.
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'onactivate' && typeof v === 'function') { clickable(n, v); continue; }
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'value') n.value = v;
        else if (k === 'checked') n.checked = !!v;
        else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
        else if (k === 'dataset' && typeof v === 'object') Object.assign(n.dataset, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (v === true) n.setAttribute(k, '');
        else n.setAttribute(k, v);
      }
    }
    append(n, children);
    return n;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  // Trigger a browser download of `text` as `name`.
  function download(name, text) {
    var blob = new Blob([text], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  // Read a File as text (Promise).
  function readText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error('read failed')); };
      r.readAsText(file);
    });
  }

  // Read a File as an ArrayBuffer (Promise) — for binary saves (MZ .rmmzsave).
  function readBinary(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error('read failed')); };
      r.readAsArrayBuffer(file);
    });
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  FHSE.dom = { el: el, append: append, clear: clear, clickable: clickable, download: download, readText: readText, readBinary: readBinary, debounce: debounce };

  /* A reusable searchable "add" control.
   * opts: { placeholder, items:[], filter(item,q)->bool, row(item)->Node, onPick(item) } */
  function adder(opts) {
    var wrap = el('div', { class: 'adder' });
    var input = el('input', { type: 'search', placeholder: opts.placeholder || 'Search to add…' });
    var menu = el('div', { class: 'menu', hidden: true });
    wrap.appendChild(input); wrap.appendChild(menu);
    var hi = -1, shown = [];

    function close() { menu.hidden = true; hi = -1; }
    function draw() {
      var q = (input.value || '').trim().toLowerCase();
      clear(menu);
      shown = opts.items.filter(function (it) { return opts.filter(it, q); }).slice(0, 60);
      if (!shown.length) { menu.appendChild(el('div', { class: 'none' }, q ? 'No matches' : 'Type to search…')); menu.hidden = false; return; }
      shown.forEach(function (it, i) {
        var row = opts.row(it);
        row.classList.add('opt');
        row.addEventListener('mousedown', function (e) { e.preventDefault(); pick(it); });
        row.addEventListener('mouseenter', function () { setHi(i); });
        menu.appendChild(row);
      });
      menu.hidden = false;
    }
    function setHi(i) {
      var os = menu.querySelectorAll('.opt');
      if (hi >= 0 && os[hi]) os[hi].classList.remove('hi');
      hi = i;
      if (os[hi]) { os[hi].classList.add('hi'); os[hi].scrollIntoView({ block: 'nearest' }); }
    }
    function pick(it) { opts.onPick(it); input.value = ''; close(); input.focus(); }

    input.addEventListener('focus', draw);
    input.addEventListener('input', draw);
    input.addEventListener('blur', function () { setTimeout(close, 140); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHi(Math.min(hi + 1, shown.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(Math.max(hi - 1, 0)); }
      else if (e.key === 'Enter') { if (hi >= 0 && shown[hi]) { e.preventDefault(); pick(shown[hi]); } }
      else if (e.key === 'Escape') { close(); }
    });
    return wrap;
  }

  FHSE.widgets = { adder: adder };
})(window.FHSE);
