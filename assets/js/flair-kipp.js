/* Riddlewerk: KIPP's flair. On wide screens a narrow KIPP board stands in the page margin beside the
   KIPP page's hero, or beside the KIPP card on the home page as it scrolls into view: two cells wide,
   drawn as the game's board draws them (src/game/Board.tsx and look.ts), a red and a blue marble at
   the top, the blue hole partway down the right lane, a slanted wall at the foot of the left lane and
   the red hole beside it. The arrow key for "tilt down" lights, and both marbles roll at once, tick by
   tick at the game's own pace: the blue one drops into its hole, the red one runs into the slanted
   wall, turns round the corner and drops into its own. The holes ring green; after a while the board
   fades away. Every move is the game's rule (KONZEPT.md: a deflector turns a marble a quarter, a
   marble drops into the first hole of its colour). Decoration only: aria-hidden, no pointer events,
   out of the flow, and nothing at all on narrow screens or with reduced motion. */
(function () {
  'use strict';

  if (!window.matchMedia || !window.matchMedia('(min-width: 900px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NS = 'http://www.w3.org/2000/svg';
  /* The board's palette (src/game/look.ts). */
  var B = {
    floor: '#1A2133', floorEdge: '#232C42', hole: '#05070D', deflect: '#7C8BB0', deflectTop: '#C7D2FE', shade: '#0E1320',
    tray: '#0E1320', trayEdge: '#2A3350', key: '#2A3043', keyLift: '#151926', amber: '#F59E0B', right: '#34D399'
  };
  var MARBLE = { R: ['#F43F5E', '#9F1239'], B: ['#3B82F6', '#1E40AF'] };
  /* The game's tick timing: the first tick 95 ms, each next 0.84 times as long, down to 42 ms; a drop 180 ms. */
  var TICK_FIRST = 95, TICK_EASE = 0.84, TICK_MIN = 42, DROP = 180;
  /* Seconds: cells laid, marbles set, the key lit, the roll's start, how long it all stays lit. */
  var LAY = 0.05, SET = 0.3, KEY_AT = 0.5, HOLD = 7;

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  var f = function (n) { return n.toFixed(2); };
  var clamp = function (t) { return Math.max(0, Math.min(1, t)); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* The times (ms from the tilt's start) at which each tick ends. */
  function ticks(n) {
    var t = [0];
    for (var i = 0; i < n; i++) t.push(t[i] + Math.max(TICK_MIN, TICK_FIRST * Math.pow(TICK_EASE, i)));
    return t;
  }

  /* A marble of a cell of side s at (0, 0): shadow, ball, its mark, the highlight. */
  function marble(parent, kind, s) {
    var g = el('g', {}, parent);
    var m = MARBLE[kind];
    var r = s * 0.38;
    el('circle', { cx: f(s * 0.03), cy: f(s * 0.06), r: f(r), fill: '#000000', opacity: '0.35' }, g);
    el('circle', { r: f(r), fill: m[0], stroke: m[1], 'stroke-width': f(Math.max(1, s * 0.035)) }, g);
    var k = s * 0.14;
    if (kind === 'R') el('circle', { r: f(k), fill: m[1], opacity: '0.6' }, g);
    else el('path', { d: 'M0 ' + f(-k * 1.2) + 'L' + f(k * 1.2) + ' 0L0 ' + f(k * 1.2) + 'L' + f(-k * 1.2) + ' 0Z', fill: m[1], opacity: '0.6' }, g);
    el('circle', { cx: f(-r * 0.38), cy: f(-r * 0.42), r: f(r * 0.24), fill: '#FFFFFF', opacity: '0.5' }, g);
    return g;
  }

  /* Draws the board in a box beside `content`, inside `host`, and plays it. */
  function run(host, content) {
    var view = document.documentElement.clientWidth;
    var hostBox = host.getBoundingClientRect();
    var box = content.getBoundingClientRect();
    var room = view - box.right;
    if (room < 90) return;
    var s = Math.max(30, Math.min(58, (room - 30) / 2.4));
    var pad = s * 0.14;
    var keyH = s * 0.9;
    var avail = Math.min(box.height, window.innerHeight * 1.1) - keyH - s;
    var rows = Math.max(5, Math.min(9, Math.floor(avail / s)));
    var W = 2 * s + pad * 2;
    var H = rows * s + pad * 2;
    var width = Math.round(W + 8);
    var height = Math.round(H + keyH + s * 0.5);
    var left = Math.round(box.right + Math.max(8, (room - width) / 2) - hostBox.left);
    var top = Math.round(box.top - hostBox.top + s * 0.3);

    // The board: two lanes. Left: the red marble at the top, a slanted wall "\" at the foot. Right:
    // the blue marble at the top, the blue hole two cells above the foot, the red hole at the foot.
    var blueHole = rows - 3;
    var holes = [{ x: 1, y: blueHole, kind: 'B' }, { x: 1, y: rows - 1, kind: 'R' }];
    // Their ways over the tilt down, one cell a tick (src/kipp/board.ts): blue drops into its hole,
    // red reaches the slanted wall, turns right and drops into its hole.
    var blueWay = [];
    for (var y = 0; y <= blueHole; y++) blueWay.push([1, y]);
    var redWay = [];
    for (var y2 = 0; y2 <= rows - 1; y2++) redWay.push([0, y2]);
    redWay.push([1, rows - 1]);
    var nTicks = Math.max(blueWay.length, redWay.length) - 1;
    var times = ticks(nTicks);

    var wrap = document.createElement('div');
    wrap.className = 'flair-kipp';
    wrap.setAttribute('aria-hidden', 'true');
    // Where it stands, as custom properties (the page's CSP allows no inline styles).
    wrap.style.setProperty('--flair-left', left + 'px');
    wrap.style.setProperty('--flair-top', top + 'px');
    var svg = el('svg', { width: String(width), height: String(height), viewBox: '0 0 ' + width + ' ' + height, focusable: 'false' });
    var root = el('g', { transform: 'translate(4 0)' }, svg);
    var tray = el('rect', { x: '0', y: '0', width: f(W), height: f(H), rx: f(s * 0.36), fill: B.tray, stroke: B.trayEdge, 'stroke-width': f(Math.max(1.5, s * 0.035)), opacity: '0' }, root);
    var grid = el('g', { transform: 'translate(' + f(pad) + ' ' + f(pad) + ')' }, root);
    var g = Math.max(1, s * 0.04);
    var cells = [];
    for (var r = 0; r < rows; r++)
      for (var c = 0; c < 2; c++) {
        var cell = el('g', { opacity: '0', transform: 'translate(' + f(c * s) + ' ' + f(r * s) + ')' }, grid);
        el('rect', { x: f(g), y: f(g), width: f(s - 2 * g), height: f(s - 2 * g), rx: f(s * 0.14), fill: B.floor, stroke: B.floorEdge, 'stroke-width': '1' }, cell);
        cells.push({ node: cell, at: (r * 2 + c) * LAY });
      }
    // The slanted wall at the foot of the left lane.
    var dw = el('g', { opacity: '0', transform: 'translate(0 ' + f((rows - 1) * s) + ')' }, grid);
    el('line', { x1: f(s * 0.18), y1: f(s * 0.24), x2: f(s * 0.82), y2: f(s * 0.88), stroke: B.shade, 'stroke-width': f(s * 0.2), 'stroke-linecap': 'round' }, dw);
    el('line', { x1: f(s * 0.18), y1: f(s * 0.18), x2: f(s * 0.82), y2: f(s * 0.82), stroke: B.deflect, 'stroke-width': f(s * 0.18), 'stroke-linecap': 'round' }, dw);
    el('line', { x1: f(s * 0.18), y1: f(s * 0.15), x2: f(s * 0.82), y2: f(s * 0.79), stroke: B.deflectTop, 'stroke-width': f(s * 0.05), 'stroke-linecap': 'round' }, dw);
    // The holes: a rim in the marble's colour round a dark well; filled, the well takes the marble's edge.
    var wells = holes.map(function (h) {
      var hg = el('g', { opacity: '0', transform: 'translate(' + f((h.x + 0.5) * s) + ' ' + f((h.y + 0.5) * s) + ')' }, grid);
      var rim = el('circle', { r: f(s * 0.36), fill: MARBLE[h.kind][0], opacity: '0.9' }, hg);
      var well = el('circle', { r: f(s * 0.29), fill: B.hole }, hg);
      var ring = el('circle', { r: f(s * 0.46), fill: 'none', stroke: B.right, 'stroke-width': f(Math.max(2, s * 0.05)), opacity: '0' }, hg);
      return { h: h, node: hg, rim: rim, well: well, ring: ring };
    });
    var laid = (rows * 2) * LAY + 0.2;
    // The two marbles, each in a group moved along its way.
    var red = { way: redWay, node: el('g', { opacity: '0' }, grid) };
    var blue = { way: blueWay, node: el('g', { opacity: '0' }, grid) };
    var redBall = marble(red.node, 'R', s);
    var blueBall = marble(blue.node, 'B', s);
    red.ball = redBall;
    blue.ball = blueBall;
    // The app's "tilt down" key under the board, lit as the board tilts.
    var key = el('g', { opacity: '0', transform: 'translate(' + f(W / 2 - s * 0.85) + ' ' + f(H + s * 0.3) + ')' }, root);
    var keyFace = el('rect', { width: f(s * 1.7), height: f(keyH), rx: f(s * 0.28), fill: B.key, stroke: 'none' }, key);
    el('rect', { y: f(keyH - s * 0.08), width: f(s * 1.7), height: f(s * 0.08), rx: f(s * 0.04), fill: B.keyLift }, key);
    el('path', { d: 'M' + f(s * 0.85) + ' ' + f(keyH * 0.24) + 'V' + f(keyH * 0.74) + 'M' + f(s * 0.62) + ' ' + f(keyH * 0.52) + 'L' + f(s * 0.85) + ' ' + f(keyH * 0.76) + 'L' + f(s * 1.08) + ' ' + f(keyH * 0.52), stroke: B.amber, 'stroke-width': f(Math.max(2, s * 0.07)), fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, key);
    wrap.appendChild(svg);
    host.appendChild(wrap);

    var setAt = laid;
    var keyAt = setAt + SET + KEY_AT;
    var rollAt = keyAt + 0.35;
    var rollEnd = rollAt + (times[nTicks] + DROP) / 1000;
    var total = rollEnd + HOLD;
    var t0 = null;

    /* Where a marble is (in cells) ms into the roll, and how far it has dropped (0 to 1). */
    function at(m, ms) {
      var last = m.way.length - 1;
      var k = 0;
      while (k < last && ms >= times[k + 1]) k++;
      if (k >= last) {
        var d = clamp((ms - times[last]) / DROP);
        return { x: m.way[last][0], y: m.way[last][1], drop: d };
      }
      var p = (ms - times[k]) / (times[k + 1] - times[k]);
      return { x: m.way[k][0] + (m.way[k + 1][0] - m.way[k][0]) * p, y: m.way[k][1] + (m.way[k + 1][1] - m.way[k][1]) * p, drop: 0 };
    }

    function frame(now) {
      if (t0 === null) t0 = now;
      var t = (now - t0) / 1000;
      tray.setAttribute('opacity', f(clamp(t / 0.3)));
      cells.forEach(function (c) { c.node.setAttribute('opacity', f(clamp((t - c.at) / 0.25))); });
      dw.setAttribute('opacity', f(clamp((t - laid + 0.2) / 0.3)));
      wells.forEach(function (w) { w.node.setAttribute('opacity', f(clamp((t - laid + 0.1) / 0.3))); });
      var ms = Math.max(0, (t - rollAt) * 1000);
      [red, blue].forEach(function (m, i) {
        var p = ease(clamp((t - setAt - i * 0.12) / SET));
        var pos = at(m, ms);
        var sc = (0.4 + 0.6 * p) * (1 - pos.drop * 0.85);
        m.node.setAttribute('opacity', f(Math.min(p * 1.5, 1) * (1 - pos.drop)));
        m.node.setAttribute('transform', 'translate(' + f((pos.x + 0.5) * s) + ' ' + f((pos.y + 0.5) * s) + ') scale(' + f(sc) + ')');
      });
      // A hole is filled once its marble has dropped, and rings green.
      wells.forEach(function (w) {
        var m = w.h.kind === 'R' ? red : blue;
        var done = at(m, ms).drop >= 1 && t > rollAt;
        w.well.setAttribute('fill', done ? MARBLE[w.h.kind][1] : B.hole);
        w.rim.setAttribute('opacity', done ? '0.5' : '0.9');
        w.ring.setAttribute('opacity', done ? f(clamp((t - rollEnd + 0.1) / 0.3) * 0.95) : '0');
      });
      var lit = clamp((t - keyAt) / 0.2) * (1 - clamp((t - rollEnd) / 0.4));
      key.setAttribute('opacity', f(clamp((t - setAt) / 0.4)));
      keyFace.setAttribute('fill', lit > 0.5 ? '#3A2E14' : B.key);
      keyFace.setAttribute('stroke', lit > 0.5 ? B.amber : 'none');
      keyFace.setAttribute('stroke-width', f(Math.max(1.5, s * 0.04)));
      if (t < total) {
        requestAnimationFrame(frame);
        return;
      }
      wrap.classList.add('is-gone');
      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, 1200);
    }
    requestAnimationFrame(frame);
  }

  var flair = document.body.getAttribute('data-flair');

  /* The KIPP page: in the margin beside the hero, once its pictures have come in. */
  if (flair === 'kipp') {
    var hero = document.querySelector('.dhero');
    var grid = hero && hero.querySelector('.wrap');
    if (hero && grid) {
      setTimeout(function () {
        // The hero's content box: the wrap without its side padding.
        var pad = parseFloat(getComputedStyle(grid).paddingRight) || 0;
        var probe = { getBoundingClientRect: function () { var r = grid.getBoundingClientRect(); return { top: r.top, right: r.right - pad, height: r.height }; } };
        run(hero, probe);
      }, 900);
    }
    return;
  }

  /* The home page: in the margin beside the KIPP card, the first time the card is well in view
     below the sticky header, whichever way the page is scrolled. */
  var card = document.getElementById('kipp');
  var section = card && card.closest('section');
  if (!card || !section || !('IntersectionObserver' in window)) return;
  var seen = new IntersectionObserver(
    function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      seen.disconnect();
      run(section, card);
    },
    { threshold: 0.35, rootMargin: '-90px 0px -10% 0px' }
  );
  seen.observe(card);
})();
