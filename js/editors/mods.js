/* editors/mods.js -- the bridge to the mod swapper.
 *
 * This panel cannot install anything, and says so plainly. A page in a browser has no way to write
 * into a Steam game folder: the File System Access API is unavailable on file:// (which is how this
 * editor is meant to be opened), and Chrome refuses write access to system directories such as
 * Program Files regardless. Shipping a button that quietly failed on the one location every one of
 * these games installs to would be worse than no button.
 *
 * What it can do is remove the hunt: name the tool, work out where it lives from this page's own
 * URL, and put a ready-to-run command on the clipboard.
 */
(function (FHSE) {
  'use strict';
  var el, clear;

  /* Where this copy of SaveDelver sits on disk, derived from the page URL. Only knowable when
   * opened straight from a file:// path -- served over http the browser has no idea, so we say so
   * rather than inventing a path. */
  function projectPath() {
    var href = String(window.location.href);
    if (href.indexOf('file:///') !== 0) return null;
    var p = href.slice('file:///'.length).replace(/[?#].*$/, '').replace(/\/[^\/]*$/, '');
    try { p = decodeURIComponent(p); } catch (e) {}
    return p.replace(/\//g, '\\');
  }

  function copyable(ctx, label, text) {
    var box = el('div', { class: 'cmdbox' }, [
      el('code', {}, text),
      el('button', { class: 'btn sm ghost', onclick: function () {
        var done = function () { ctx.toast('Copied: ' + label); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { ctx.toast('Could not copy - select it by hand.', true); });
        } else {
          ctx.toast('Clipboard is blocked here - select the text by hand.', true);
        }
      } }, 'copy')
    ]);
    return box;
  }

  function render(root, ctx) {
    el = FHSE.dom.el; clear = FHSE.dom.clear;
    clear(root);

    var dir = projectPath();
    var local = !!dir;

    var p = el('div', { class: 'panel' });
    p.appendChild(el('h3', {}, ['Mods', el('span', { class: 'side' }, ctx.profile.title)]));

    p.appendChild(el('div', { class: 'banner note' }, [
      el('span', { class: 'i' }, 'i'),
      el('span', {}, [
        el('b', {}, 'This has to happen outside the browser. '),
        'A web page cannot write into a Steam game folder -- the browser blocks it, and these games ' +
        'live under Program Files, which is blocked hardest of all. The swapper is a small script ' +
        'instead. It backs your original files up before replacing anything, and can put them back.'
      ])
    ]));

    if (local) {
      p.appendChild(el('p', { class: 'toolnote' }, [
        'Double-click ', el('b', {}, 'Mod swapper.bat'), ' for a menu: it finds your installed RPG ',
        'Maker games, shows what is currently installed, and offers install / restore / status.'
      ]));
      p.appendChild(copyable(ctx, 'path to the swapper', dir + '\\tools\\Mod swapper.bat'));
    } else {
      /* Served over http, so this is very likely the hosted copy -- where the visitor has the page
       * but not the repository, and telling them to double-click a .bat they never downloaded
       * would just waste their time. */
      p.appendChild(el('div', { class: 'banner note' }, [
        el('span', { class: 'i' }, '!'),
        el('span', {}, [
          el('b', {}, 'Not available from the hosted site. '),
          'The swapper is a Windows script that ships with the downloadable copy of SaveDelver, ',
          'not with this page. Editing saves here works exactly the same either way -- it is only ',
          'the mod install, which touches files on your PC, that needs the local copy.'
        ])
      ]));
      p.appendChild(el('p', { class: 'toolnote' }, [
        'Grab the project folder, then run ', el('code', {}, 'tools\\Mod swapper.bat'),
        ' from it. Everything below describes what that script does.'
      ]));
    }

    p.appendChild(el('div', { class: 'stategrp' }, [
      el('div', { class: 'gname' }, 'What it does, in order'),
      el('ol', { class: 'steps' }, [
        el('li', {}, 'Works out where each file belongs. A mod packaged as a www\\... tree keeps its own paths; loose files are routed by name, since RPG Maker\'s layout is fixed.'),
        el('li', {}, 'Copies the current file out to _SaveDelver-Backups\\<mod>\\ first, and records its checksum.'),
        el('li', {}, 'Only then writes the mod\'s version over it.'),
        el('li', {}, 'Restore puts the originals back, and deletes any file the mod added.')
      ])
    ]));

    p.appendChild(el('p', { class: 'toolnote' }, [
      'It refuses to install twice over its own backup, warns instead of clobbering a file the game ',
      'has updated since, and writes its record after every file -- so an install that dies halfway ',
      'is still undoable. Run it with ', el('code', {}, '-DryRun'), ' to see the plan first.'
    ]));

    var save = ctx.save ? '' : ' Once the mod lets you save in-game, come back with a save file and the rest of the editor opens up.';
    p.appendChild(el('p', { class: 'toolnote' },
      'The usual reason to want this: these games ration saving, so a new run may have no save file ' +
      'to edit at all. A mod that lifts the limit fixes that at the source.' + save));

    root.appendChild(p);
  }

  FHSE.editors = FHSE.editors || {};
  FHSE.editors.mods = { render: render };
})(window.FHSE);
