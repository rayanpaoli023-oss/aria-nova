(function () {
  'use strict';
  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  var FULL = /^\s*\{\{([^}]+)\}\}\s*$/;
  var ANY = /\{\{([^}]+)\}\}/g;
  function interp(str, scope) {
    return str.replace(ANY, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }
  function walk(nodes, scope, out) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.nodeType === 3) {
        out.appendChild(document.createTextNode(n.nodeValue.indexOf('{{') > -1 ? interp(n.nodeValue, scope) : n.nodeValue));
        continue;
      }
      if (n.nodeType !== 1) continue;
      var tag = n.tagName.toLowerCase();
      if (tag === 'sc-for') {
        var m = FULL.exec(n.getAttribute('list') || '');
        var list = m ? lookup(scope, m[1]) : null;
        var as = n.getAttribute('as') || 'item';
        if (list && list.length) {
          for (var j = 0; j < list.length; j++) {
            var s2 = Object.create(scope);
            s2[as] = list[j];
            s2.$index = j;
            walk(n.childNodes, s2, out);
          }
        }
        continue;
      }
      if (tag === 'sc-if') {
        var mv = FULL.exec(n.getAttribute('value') || '');
        if (mv && lookup(scope, mv[1])) walk(n.childNodes, scope, out);
        continue;
      }
      var el = n.cloneNode(false);
      var attrs = Array.prototype.slice.call(n.attributes);
      for (var a = 0; a < attrs.length; a++) {
        var name = attrs[a].name, val = attrs[a].value;
        if (name.indexOf('hint-') === 0 || name === 'key') { el.removeAttribute(name); continue; }
        if (val.indexOf('{{') === -1) continue;
        var fm = FULL.exec(val);
        if (name.indexOf('on') === 0 && fm) {
          el.removeAttribute(name);
          var fn = lookup(scope, fm[1]);
          if (typeof fn === 'function') el.addEventListener(name.slice(2), fn);
          continue;
        }
        if (fm) {
          var v = lookup(scope, fm[1]);
          if (v === false || v == null) el.removeAttribute(name);
          else el.setAttribute(name, String(v));
        } else {
          el.setAttribute(name, interp(val, scope));
        }
      }
      if (tag === 'template') { out.appendChild(el); continue; }
      walk(n.childNodes, scope, el);
      out.appendChild(el);
    }
    return out;
  }
  window.DCLogic = function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  };
  window.DCLogic.prototype.setState = function (patch) {
    var p = typeof patch === 'function' ? patch(this.state) : patch;
    for (var k in p) this.state[k] = p[k];
    this.__render();
  };
  window.DCLogic.prototype.forceUpdate = function () { this.__render(); };
  window.DCMount = function (Component, tplId, rootId) {
    var tpl = document.getElementById(tplId);
    var root = document.getElementById(rootId);
    var inst = new Component({});
    var first = true;
    inst.__render = function () {
      var y = window.scrollY;
      if (!first) document.documentElement.classList.add('an-ready');
      var frag = walk(tpl.content.childNodes, inst.renderVals(), document.createDocumentFragment());
      root.replaceChildren(frag);
      if (!first) window.scrollTo(0, y);
      first = false;
    };
    inst.__render();
  };
})();
