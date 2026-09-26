/* editors/hexen.js — the hexen skill tree as a clickable board, for both Fear & Hunger games.
 *
 * The board is DRAWN, not screenshotted: the game's own art stays in the game, and we render an
 * SVG from the node coordinates in js/games/hexen-*.js. That keeps the editor asset-free and makes
 * hit-testing exact — a node's circle IS its click target, so nothing can drift out of alignment
 * with a background image.
 *
 * The two games model the hexen very differently and this view covers both:
 *
 *   F&H1   26 nodes at fixed screen positions, laid out around an octagon of soul hubs. Every
 *          node grants a skill. Branches gate on a *_soul switch.
 *   F&H2   104 nodes on a map grid. A node may raise a PARAMETER instead of granting a skill,
 *          the roots gate on a god's affliction LEVEL (a variable, not a switch), and 17 nodes
 *          record which character bought them in a learns_* variable.
 *
 * Buying at the hexen writes more than the skill, so we write all of it:
 *   - the skill id into the actor's _skills (or the parameter into _paramPlus)
 *   - that node's purchase switch, which is what the in-game table reads
 *   - the learns_* variable, where the game defines one
 * Setting only the skill leaves the game still offering the node for sale.
 */
(function (FHSE) {
  'use strict';
  var el, clear, jx;
  var NS = 'http://www.w3.org/2000/svg';
  var DENSE = 40;           // above this many nodes, labels are opt-in rather than always drawn

  function svg(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    (Array.isArray(kids) ? kids : kids ? [kids] : []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function labelOf(n) { return n.skill || (n.param ? n.param.label + ' ' + (n.param.amount > 0 ? '+' : '') + n.param.amount : n.name); }

  /* Two INDEPENDENT facts per node:
   *   bought — the purchase switch. Global to the playthrough: it records that the node was
   *            bought, by whoever was active at the time.
   *   known  — this particular actor has the skill.
   * "bought but not known" is the normal state of a node another character bought; "known but not
   * bought" is a skill picked up outside the hexen. Neither is corruption.
   *
   * Parameter nodes have no per-actor record at all — a +1 Attack vanishes into _paramPlus — so
   * for those only `bought` is knowable, and the view says so rather than guessing. */
  function stateOf(n, actor, switches) {
    var skills = jx.arr(actor._skills) || [];
    return {
      known: n.skillId != null && skills.indexOf(n.skillId) !== -1,
      bought: n.sw != null && !!switches[n.sw],
      isParam: !!n.param
    };
  }
  function classOf(st, unlocked) {
    if (st.isParam) return st.bought ? 'learned' : (unlocked ? 'open' : 'locked');
    if (st.known) return st.bought ? 'learned' : 'elsewhere';
    if (st.bought) return 'bought';
    return unlocked ? 'open' : 'locked';
  }

  function render(root, ctx) {
    el = FHSE.dom.el; clear = FHSE.dom.clear; jx = FHSE.jx;
    clear(root);

    var table = (FHSE.hexen || {})[ctx.profile.id];
    if (!table) { root.appendChild(el('div', { class: 'panel' }, el('p', { class: 'empty' }, 'No hexen tree is mapped for this game.'))); return; }

    /* Without a save there is no character and nothing is bought, but the tree's SHAPE is still
     * worth reading: what each node grants, what it needs first, which branch it sits on. Render
     * the board read-only rather than refusing. */
    var readOnly = !ctx.save;
    var actor = ctx.actor;
    if (!readOnly && !actor) {
      root.appendChild(el('div', { class: 'panel' }, el('p', { class: 'empty' }, 'Pick a character first — hexen skills belong to one character.'))); return;
    }
    if (readOnly) actor = { _actorId: null, _name: null, _skills: [], _paramPlus: [] };

    var switches = ctx.save ? (jx.arr(ctx.save.switches._data) || []) : [];
    var vars = ctx.save ? (jx.arr(ctx.save.variables._data) || []) : [];
    var nodes = table.nodes;
    var dense = nodes.length > DENSE;
    var showAll = false;

    var bySwitch = {};
    nodes.forEach(function (n) { if (n.sw != null) bySwitch[n.sw] = n; });
    var prereqNodes = function (n) { return (n.pre || []).map(function (id) { return bySwitch[id]; }).filter(Boolean); };

    // Reachability follows the PURCHASE record (the tree opens per playthrough, not per character)
    // and, in Termina, the god-affliction level the root demands.
    var gateMet = function (n) {
      if (n.gateVar == null) return true;
      return (Number(vars[n.gateVar]) || 0) >= (n.gateValue || 0);
    };
    var unlockedOf = function (n) {
      if (!gateMet(n)) return false;
      return (n.pre || []).every(function (id) { return !!switches[id]; });
    };
    var heldByOthers = function (n) {
      if (n.skillId == null) return false;
      return ctx.roster().some(function (r) {
        return r.id !== actor._actorId && (jx.arr(r.actor._skills) || []).indexOf(n.skillId) !== -1;
      });
    };

    // ---------- header ----------
    var panel = el('div', { class: 'panel' });
    var head = el('h3', {}, ['The Hexen', el('span', { class: 'side' }, '')]);
    panel.appendChild(head);
    panel.appendChild(el('p', { class: 'toolnote' }, readOnly ? [
      el('b', {}, 'Reference only — no save loaded. '),
      'This is the tree\'s shape as the game defines it: hover any node for what it grants, what ',
      'it needs bought first, and which branch it belongs to. Load a save to buy or refund nodes. ',
      'Node positions come from the game\'s own data; the board is drawn here, not copied.'
    ] : [
      'Editing ', el('b', {}, actor._name || ('actor #' + actor._actorId)),
      '. Clicking a node buys or refunds it — writing the skill, its purchase switch, and the ',
      'learns_ variable where the game keeps one, so the table in-game agrees with your save. ',
      'Node positions come from the game\'s own data; the board is drawn here, not copied.'
    ]));

    var info = el('div', { class: 'hexinfo' });
    panel.appendChild(info);

    // ---------- board ----------
    var b = table.board;
    var board = svg('svg', { viewBox: '0 0 ' + b.w + ' ' + b.h, class: 'hexboard', preserveAspectRatio: 'xMidYMid meet' });

    if (table.hubs && table.hubs.length) {
      board.appendChild(svg('polygon', { class: 'hex-octagon', points: table.hubs.map(function (h) { return h.x + ',' + h.y; }).join(' ') }));
      table.hubs.forEach(function (h) { board.appendChild(svg('circle', { class: 'hex-hub', cx: h.x, cy: h.y, r: 9 })); });
    }

    var edgeLayer = svg('g', { class: 'hex-edges' });
    board.appendChild(edgeLayer);
    var nodeLayer = svg('g', {});
    board.appendChild(nodeLayer);
    panel.appendChild(el('div', { class: 'hexwrap' }, board));
    // Only shown at phone width, where the board keeps its size and pans instead of shrinking.
    panel.appendChild(el('p', { class: 'toolnote narrowonly' }, 'The board is wider than your screen — drag it sideways to reach the rest of the tree.'));

    // ---------- writes ----------
    /* Grant: skill (or parameter) + purchase switch + learns_ variable.
     * Revoke: undo those, but only clear the purchase switch when nobody else still has the skill,
     * or we'd erase a purchase that genuinely happened for another character. */
    function setNode(n, on) {
      if (n.param) {
        var pp = jx.arr(actor._paramPlus);
        var wasOn = n.sw != null && !!switches[n.sw];
        if (pp && n.param.id < pp.length && on !== wasOn) {
          pp[n.param.id] = (Number(pp[n.param.id]) || 0) + (on ? n.param.amount : -n.param.amount);
        }
        if (n.sw != null) switches[n.sw] = on;
      } else {
        var skills = jx.mutArr(actor._skills);
        var i = skills.indexOf(n.skillId);
        if (on) {
          if (n.skillId != null && i === -1) skills.push(n.skillId);
          if (n.sw != null) switches[n.sw] = true;
          if (n.learnsVar != null) vars[n.learnsVar] = actor._actorId;
        } else {
          if (i !== -1) skills.splice(i, 1);
          if (n.sw != null && !heldByOthers(n)) switches[n.sw] = false;
          if (n.learnsVar != null && vars[n.learnsVar] === actor._actorId) vars[n.learnsVar] = 0;
        }
      }
      ctx.markDirty();
    }

    // ---------- label placement ----------
    /* Collide real boxes, not per-side lists: a left-anchored label extends leftwards into the
     * space a right-anchored label from a node further left runs into. Width is estimated from
     * the character count, which avoids a measure-reflow-remeasure pass on every redraw. */
    var CX = b.w / 2, LINE = 15, CHAR_W = 5.7;
    function prefersLeft(n) {
      if (nodes.some(function (o) { return o !== n && Math.abs(o.y - n.y) < LINE && o.x > n.x && o.x - n.x < 95; })) return true;
      if (nodes.some(function (o) { return o !== n && Math.abs(o.y - n.y) < LINE && o.x < n.x && n.x - o.x < 95; })) return false;
      return n.x < CX;
    }
    function boxFor(n, left, y) {
      var w = labelOf(n).length * CHAR_W;
      var x = left ? n.x - 16 - w : n.x + 16;
      return { x0: x, x1: x + w, y0: y - 9, y1: y + 3 };
    }
    var hits = function (a, c) { return a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1; };

    function layoutLabels(list) {
      var placed = [];
      return list.slice().sort(function (a, c) { return a.y - c.y || a.x - c.x; }).reduce(function (acc, n) {
        var left = prefersLeft(n), y = n.y + 4, box = boxFor(n, left, y), ok = true;
        for (var guard = 0; guard < 16 && placed.some(function (p) { return hits(p, box); }); guard++) {
          if (guard === 0) left = !left;
          else y = n.y + 4 + (guard % 2 ? 1 : -1) * LINE * Math.ceil(guard / 2);
          box = boxFor(n, left, y);
          ok = guard < 15;
        }
        // On a crowded board some labels simply cannot fit; those fall back to hover text.
        if (placed.some(function (p) { return hits(p, box); })) ok = false;
        if (ok) placed.push(box);
        acc[n.i] = ok ? { left: left, x: left ? n.x - 16 : n.x + 16, y: y } : null;
        return acc;
      }, {});
    }

    // ---------- draw ----------
    function draw() {
      clear(nodeLayer); clear(edgeLayer);
      var counts = {}, learned = 0;

      nodes.forEach(function (n) {
        prereqNodes(n).forEach(function (p) {
          edgeLayer.appendChild(svg('line', {
            x1: p.x, y1: p.y, x2: n.x, y2: n.y,
            class: 'hex-edge' + (p.sw != null && switches[p.sw] ? ' met' : '')
          }));
        });
      });

      // Which nodes get a drawn label: everything on a small board, otherwise only the ones the
      // player has a stake in — unless they ask for all of them.
      var labelled = (!dense || showAll) ? nodes : nodes.filter(function (n) {
        var st = stateOf(n, actor, switches);
        return st.known || st.bought;
      });
      var lay = layoutLabels(labelled);

      nodes.forEach(function (n) {
        var st = stateOf(n, actor, switches);
        var unlocked = unlockedOf(n);
        var cls = classOf(st, unlocked);
        counts[cls] = (counts[cls] || 0) + 1;
        if (cls === 'learned') learned++;

        var g = svg('g', { class: 'hex-node ' + cls + (n.param ? ' isparam' : ''), tabindex: '0', role: 'button' });
        g.appendChild(svg('circle', { class: 'hex-hit', cx: n.x, cy: n.y, r: dense ? 15 : 20 }));
        if (n.param) {
          var s = dense ? 7 : 9;   // parameter nodes read as squares, so they're tellable at a glance
          g.appendChild(svg('rect', { class: 'hex-ring', x: n.x - s, y: n.y - s, width: s * 2, height: s * 2 }));
          if (st.bought) g.appendChild(svg('rect', { class: 'hex-fill', x: n.x - s / 2.2, y: n.y - s / 2.2, width: s / 1.1, height: s / 1.1 }));
        } else {
          g.appendChild(svg('circle', { class: 'hex-ring', cx: n.x, cy: n.y, r: dense ? 9 : 11 }));
          if (st.known) g.appendChild(svg('circle', { class: 'hex-fill', cx: n.x, cy: n.y, r: dense ? 4.5 : 5.5 }));
          else if (st.bought) g.appendChild(svg('circle', { class: 'hex-pip', cx: n.x, cy: n.y, r: 2.5 }));
        }

        var L = lay[n.i];
        if (L) {
          if (Math.abs(L.y - (n.y + 4)) > 2) {
            g.appendChild(svg('line', { class: 'hex-leader', x1: n.x + (L.left ? -12 : 12), y1: n.y, x2: L.x, y2: L.y - 4 }));
          }
          var label = svg('text', { class: 'hex-label', x: L.x, y: L.y, 'text-anchor': L.left ? 'end' : 'start' });
          label.textContent = labelOf(n);
          g.appendChild(label);
        }

        var explain = n.param
          ? (st.bought ? 'bought — the bonus was applied to whoever was active' : 'not bought')
          : { learned: 'this character has it, bought at the hexen',
              elsewhere: 'this character has it, but it was not bought here',
              bought: 'bought this playthrough — by a different character',
              open: 'available to buy', locked: 'not reachable yet' }[cls];
        var why = [];
        if (!gateMet(n)) why.push('needs ' + n.gateVarName + ' >= ' + n.gateValue + ' (currently ' + (Number(vars[n.gateVar]) || 0) + ')');
        var missing = prereqNodes(n).filter(function (p) { return !(p.sw != null && switches[p.sw]); });
        if (missing.length) why.push('needs ' + missing.map(labelOf).join(', '));
        var title = svg('title');
        title.textContent = labelOf(n) + '  (' + (n.skillId != null ? 'skill #' + n.skillId : 'parameter') + ' · ' + (n.swName || 'no switch') + ')' +
          '\n' + explain + (why.length ? '\n' + why.join('\n') : '') +
          (n.learnsVarName ? '\ntracks buyer in ' + n.learnsVarName : '');
        g.appendChild(title);

        function toggle() {
          var on = n.param ? !st.bought : !stateOf(n, actor, switches).known;
          if (on && !unlockedOf(n)) {
            if (!window.confirm(labelOf(n) + ' is not reachable yet:\n\n' + (why.join('\n') || 'prerequisites unmet') +
              '\n\nGive it to ' + (actor._name || 'this character') + ' anyway? The game will accept it, ' +
              'but the tree will look skipped.')) return;
          }
          setNode(n, on);
          draw();
          ctx.refreshRoster && ctx.refreshRoster();
        }
        if (!readOnly) {
          g.addEventListener('click', toggle);
          g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        } else {
          g.classList.add('ro');
          g.removeAttribute('tabindex');
        }
        nodeLayer.appendChild(g);
      });

      head.querySelector('.side').textContent = readOnly
        ? (nodes.length + ' nodes')
        : (learned + ' / ' + nodes.length + ' on this character');
      drawInfo(counts);
    }

    // ---------- side panel ----------
    function drawInfo(counts) {
      clear(info);
      if (readOnly) {
        // Nothing here is meaningful without a save: no gates to flip, no character to buy for.
        // Show only what the tree itself says, and label every node since none are "touched".
        showAll = true;
        var byBranch = {};
        nodes.forEach(function (n) { var k = n.soul || 'Tree'; byBranch[k] = (byBranch[k] || 0) + 1; });
        info.appendChild(el('div', { class: 'hexlegend' },
          Object.keys(byBranch).map(function (k) { return el('span', { class: 'k' }, k + ' ' + byBranch[k]); })
        ));
        var params = nodes.filter(function (n) { return n.param; }).length;
        if (params) {
          info.appendChild(el('p', { class: 'toolnote' },
            params + ' of the ' + nodes.length + ' nodes raise a parameter rather than granting a skill (drawn as squares).'));
        }
        return;
      }

      // F&H1 gates branches on *_soul switches; Termina gates roots on god-affliction levels.
      var gates = {};
      nodes.forEach(function (n) { if (n.gateSw != null && !gates[n.gateSw]) gates[n.gateSw] = n.gate; });
      if (Object.keys(gates).length) {
        var row = el('div', { class: 'hexgates' });
        Object.keys(gates).forEach(function (id) {
          var cb = el('input', { type: 'checkbox', checked: !!switches[id] });
          cb.addEventListener('change', function () { switches[id] = cb.checked; ctx.markDirty(); draw(); });
          row.appendChild(el('label', { class: 'tog' }, [cb, el('span', {}, gates[id]), el('span', { class: 'id' }, '#' + id)]));
        });
        info.appendChild(el('div', { class: 'stategrp' }, [
          el('div', { class: 'gname' }, 'Soul gates — whether the game lets you buy from a branch'), row
        ]));
      }
      var afflictions = {};
      nodes.forEach(function (n) { if (n.gateVar != null) afflictions[n.gateVar] = n.gateVarName; });
      if (Object.keys(afflictions).length) {
        var arow = el('div', { class: 'hexgates' });
        Object.keys(afflictions).forEach(function (id) {
          var inp = el('input', { type: 'number', value: Number(vars[id]) || 0, min: 0, style: { width: '58px' } });
          inp.addEventListener('change', function () {
            vars[id] = Math.max(0, Math.round(parseFloat(inp.value) || 0));
            inp.value = vars[id]; ctx.markDirty(); draw();
          });
          arow.appendChild(el('label', { class: 'fld inline' }, [afflictions[id].replace(/_affliction$/i, ''), inp]));
        });
        info.appendChild(el('div', { class: 'stategrp' }, [
          el('div', { class: 'gname' }, 'God afflictions — the level each branch of the tree opens at'), arow
        ]));
      }

      info.appendChild(el('div', { class: 'hexlegend' }, [
        el('span', { class: 'k learned' }, 'has it ' + (counts.learned || 0)),
        counts.elsewhere ? el('span', { class: 'k elsewhere' }, 'has it, not from here ' + counts.elsewhere) : null,
        counts.bought ? el('span', { class: 'k bought' }, 'bought by another character ' + counts.bought) : null,
        el('span', { class: 'k open' }, 'available ' + (counts.open || 0)),
        el('span', { class: 'k locked' }, 'locked ' + (counts.locked || 0))
      ]));

      var acts = el('div', { class: 'hexacts' }, [
        el('button', { class: 'btn sm ghost', onclick: function () {
          nodes.forEach(function (n) { setNode(n, true); });
          Object.keys(gates).forEach(function (id) { switches[id] = true; });
          ctx.toast('Bought all ' + nodes.length + ' hexen nodes for ' + (actor._name || 'this character') + '.');
          draw();
        } }, 'Buy everything'),
        el('button', { class: 'btn sm ghost', onclick: function () {
          if (!window.confirm('Refund every hexen node for ' + (actor._name || 'this character') + '?')) return;
          nodes.forEach(function (n) { setNode(n, false); });
          ctx.toast('Cleared the hexen tree.');
          draw();
        } }, 'Reset tree')
      ]);
      if (dense) {
        var cb = el('input', { type: 'checkbox', checked: showAll });
        cb.addEventListener('change', function () { showAll = cb.checked; draw(); });
        acts.appendChild(el('label', { class: 'tog' }, [cb, el('span', {}, 'label every node')]));
      }
      info.appendChild(acts);

      if (dense && !showAll) {
        info.appendChild(el('p', { class: 'toolnote' },
          'With ' + nodes.length + ' nodes, only the ones this playthrough has touched are labelled — ' +
          'hover any node for its name, or tick “label every node”.'));
      }
      if (counts.bought) {
        info.appendChild(el('p', { class: 'toolnote' },
          counts.bought + ' node(s) were bought this playthrough by a different character. That is normal — ' +
          'the purchase is recorded per save, but the skill only goes to whoever was active at the time. ' +
          'Clicking one gives it to ' + (actor._name || 'this character') + ' as well.'));
      }
      if (nodes.some(function (n) { return n.param; })) {
        info.appendChild(el('p', { class: 'toolnote' },
          'Square nodes raise a parameter rather than granting a skill. The game keeps no record of ' +
          'who received those, so they show only as bought or not — buying one here adds the bonus to ' +
          (actor._name || 'this character') + '.'));
      }
    }

    draw();
    root.appendChild(panel);
  }

  FHSE.editors = FHSE.editors || {};
  FHSE.editors.hexen = { render: render };
})(window.FHSE);
