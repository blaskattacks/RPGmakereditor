/* mvdata.js — indexes an RPG Maker MV project's database JSON into id->name lookups.
 *
 * The database files (System, Actors, Classes, Skills, States, Items, Weapons, Armors)
 * are the game's own www\data\*.json. Array databases are 1-indexed with a null at [0].
 */
(function (FHSE) {
  'use strict';

  // Database file base-names this loader understands.
  var DB = ['System', 'Actors', 'Classes', 'Skills', 'States', 'Items', 'Weapons', 'Armors', 'Enemies'];

  function MVData() { this.db = {}; }

  MVData.prototype.set = function (name, json) { this.db[name] = json; return this; };
  MVData.prototype.has = function (name) { return this.db[name] != null; };

  // Generic id -> display name for an array database.
  MVData.prototype._name = function (dbName, id, prefix) {
    var list = this.db[dbName];
    var e = list && list[id];
    if (e && e.name != null && e.name !== '') return e.name;
    return (prefix || dbName) + ' #' + id;
  };
  MVData.prototype.skill  = function (id) { return this._name('Skills', id, 'Skill'); };
  MVData.prototype.state  = function (id) { return this._name('States', id, 'State'); };
  MVData.prototype.item   = function (id) { return this._name('Items', id, 'Item'); };
  MVData.prototype.weapon = function (id) { return this._name('Weapons', id, 'Weapon'); };
  MVData.prototype.armor  = function (id) { return this._name('Armors', id, 'Armor'); };
  MVData.prototype.actor  = function (id) { return this._name('Actors', id, 'Actor'); };
  MVData.prototype.klass  = function (id) { return this._name('Classes', id, 'Class'); };

  MVData.prototype.obj = function (dbName, id) { var l = this.db[dbName]; return l && l[id]; };

  // Non-null entries of an array database (each keeps its own .id).
  MVData.prototype.list = function (dbName) {
    var l = this.db[dbName] || [], out = [];
    for (var i = 1; i < l.length; i++) if (l[i] && l[i].name != null && String(l[i].name).trim() !== '') out.push(l[i]);
    return out;
  };

  // ---- System.json helpers ----
  MVData.prototype.system = function () { return this.db.System || {}; };
  MVData.prototype.gameTitle = function () { return this.system().gameTitle || ''; };
  MVData.prototype.terms = function () { return this.system().terms || {}; };
  MVData.prototype.paramLabels = function () { return (this.terms().params || []).slice(0, 8); };
  MVData.prototype.skillTypes = function () { return this.system().skillTypes || []; };
  MVData.prototype.equipTypes = function () { return this.system().equipTypes || []; };
  MVData.prototype.elements   = function () { return this.system().elements || []; };
  MVData.prototype.switchName = function (id) {
    var n = (this.system().switches || [])[id];
    return (n && String(n).trim() !== '') ? n : '';
  };
  MVData.prototype.variableName = function (id) {
    var n = (this.system().variables || [])[id];
    return (n && String(n).trim() !== '') ? n : '';
  };

  // MV exp curve — keep _level and _exp consistent when the user edits a level.
  MVData.prototype.expForLevel = function (classId, level) {
    var c = (this.db.Classes || [])[classId];
    if (!c || !c.expParams) return null;
    var basis = c.expParams[0], extra = c.expParams[1], accA = c.expParams[2], accB = c.expParams[3];
    return Math.round(
      basis * (Math.pow(level - 1, 0.9 + accA / 250)) * level *
      (level + 1) / (6 + Math.pow(level, 2) / 50 / accB) + (level - 1) * extra
    );
  };

  MVData.DB = DB;
  FHSE.MVData = MVData;
})(window.FHSE);
