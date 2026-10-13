/* Riddlewerk: WÜRFEL's flair. On wide screens a narrow WÜRFEL board stands in the page margin beside
   the WÜRFEL page's hero, or beside the WÜRFEL card on the home page as it scrolls into view: two
   lanes of slate tiles seen from the game's camera (40° from straight down, src/game/view3d.ts), a
   yellow paint spot near the top of the left lane, a yellow stamp tile further down and the goal at
   its foot. A clean cube stands at the top and tips over its front edge, one cell a beat, at the
   game's own pace (220 ms a roll, src/game/look.ts). Its bottom face lands on the spot and picks up
   the yellow; rolling on, the yellow face comes round the back, over the top and down the front,
   until it lands on the stamp tile and stamps it; two more rolls and the cube stands on the goal,
   which rings green. Every move is the game's rule (KONZEPT.md: rolling down, the front face goes
   under, the bottom one round the back). After a while the board fades away. Decoration only:
   aria-hidden, no pointer events, out of the flow, and nothing at all on narrow screens or with
   reduced motion. */
(function () {
  'use strict';

  if (!window.matchMedia || !window.matchMedia('(min-width: 900px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NS = 'http://www.w3.org/2000/svg';
  /* The board's palette (src/game/look.ts). */
  var B = { top: '#26314D', rim: '#3A4870', side: '#1E2844', front: '#19213A', clean: '#E2E8F0', edge: '#0B1020', goal: '#34D399' };
  var Y = { fill: '#FACC15', edge: '#A16207' };
  /* The game's roll: 220 ms a tip over the edge; a beat between rolls so each one reads. */
  var ROLL = 220, REST = 420;
  /* Seconds: tiles laid, the cube set down, how long it all stays after the goal. */
  var LAY = 0.04, SET = 0.4, HOLD = 6;
  /* The camera: tilted 40° from straight down, looking along the lanes, no turn. */
  var TILT = (40 * Math.PI) / 180, CT = Math.cos(TILT), ST = Math.sin(TILT);
  var ROWS = 8, SPOT = 1, STAMP = 5, GOAL = 7, THICK = 0.24;
  var LIGHT = (function () { var l = [-0.4, 0.55, 0.75], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  var f = function (n) { return n.toFixed(2); };
  var clamp = function (t) { return Math.max(0, Math.min(1, t)); };
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var c = function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); };
    return 'rgb(' + c((n >> 16) & 255) + ',' + c((n >> 8) & 255) + ',' + c(n & 255) + ')';
  }

  /* Draws the board in a box beside `content`, inside `host`, and plays it. */
  function run(host, content) {
    var view = document.documentElement.clientWidth;
    var hostBox = host.getBoundingClientRect();
    var box = content.getBoundingClientRect();
    var room = view - box.right;
    if (room < 100) return;
    var s = Math.max(30, Math.min(56, (room - 30) / 2.6));
    var width = Math.round(2 * s + s * 0.6);
    var height = Math.round((ROWS + 0.4) * s * CT + s * (1.4 + THICK) * ST + s * 0.6);
    var left = Math.round(box.right + Math.max(8, (room - width) / 2) - hostBox.left);
    var top = Math.round(box.top - hostBox.top + s * 0.3);
    var ox = s * 0.3, oy = s * 1.3 * ST + s * 0.3;

    /* A board point (x right, y towards the viewer, z up; one cell is 1) on the drawing. */
    function at(p) { return [ox + p[0] * s, oy + (p[1] * CT - p[2] * ST) * s]; }
    function poly(pts) { return 'M' + pts.map(function (p) { var q = at(p); return f(q[0]) + ' ' + f(q[1]); }).join('L') + 'Z'; }

    var wrap = document.createElement('div');
    wrap.className = 'flair-wuerfel';
    wrap.setAttribute('aria-hidden', 'true');
    // Where it stands, as custom properties (the page's CSP allows no inline styles).
    wrap.style.setProperty('--flair-left', left + 'px');
    wrap.style.setProperty('--flair-top', top + 'px');
    var svg = el('svg', { width: String(width), height: String(height), viewBox: '0 0 ' + width + ' ' + height, focusable: 'false' });

    // The tiles: slabs with a gap round each, far rows first so the near ones' fronts lie over them.
    var tiles = [];
    var g = 0.05;
    for (var r = 0; r < ROWS; r++)
      for (var c = 0; c < 2; c++) {
        var t = el('g', { opacity: '0' }, svg);
        el('path', { d: poly([[c + g, r + 1 - g, 0], [c + 1 - g, r + 1 - g, 0], [c + 1 - g, r + 1 - g, -THICK], [c + g, r + 1 - g, -THICK]]), fill: B.front }, t);
        el('path', { d: poly([[c + g, r + g, 0], [c + 1 - g, r + g, 0], [c + 1 - g, r + 1 - g, 0], [c + g, r + 1 - g, 0]]), fill: B.top, stroke: B.rim, 'stroke-width': f(Math.max(1, s * 0.03)), 'stroke-linejoin': 'round' }, t);
        tiles.push({ node: t, at: (r * 2 + c) * LAY });
      }
    var laid = ROWS * 2 * LAY + 0.25;
    // On the left lane: the yellow spot, the yellow stamp tile (a frame that fills once stamped), the goal.
    var deco = el('g', { opacity: '0' }, svg);
    function ring(cx, cy, rad, n) {
      var pts = [];
      for (var i = 0; i < n; i++) { var a = (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 0]); }
      return pts;
    }
    var spot = el('path', { d: poly(ring(0.5, SPOT + 0.5, 0.3, 24)), fill: Y.fill, stroke: Y.edge, 'stroke-width': f(Math.max(1, s * 0.03)) }, deco);
    var stampFill = el('path', { d: poly([[0.14, STAMP + 0.14, 0], [0.86, STAMP + 0.14, 0], [0.86, STAMP + 0.86, 0], [0.14, STAMP + 0.86, 0]]), fill: Y.fill, opacity: '0' }, deco);
    el('path', { d: poly([[0.14, STAMP + 0.14, 0], [0.86, STAMP + 0.14, 0], [0.86, STAMP + 0.86, 0], [0.14, STAMP + 0.86, 0]]), fill: 'none', stroke: Y.fill, 'stroke-width': f(Math.max(2, s * 0.07)), 'stroke-linejoin': 'round' }, deco);
    el('path', { d: poly([[0.5, STAMP + 0.32, 0], [0.68, STAMP + 0.66, 0], [0.32, STAMP + 0.66, 0]]), fill: Y.edge, opacity: '0.7' }, deco);
    var goal = el('path', { d: poly([[0.14, GOAL + 0.14, 0], [0.86, GOAL + 0.14, 0], [0.86, GOAL + 0.86, 0], [0.14, GOAL + 0.86, 0]]), fill: 'none', stroke: B.goal, 'stroke-width': f(Math.max(2, s * 0.06)), 'stroke-dasharray': f(s * 0.12) + ' ' + f(s * 0.08), 'stroke-linejoin': 'round' }, deco);
    el('path', { d: poly([[0.36, GOAL + 0.62, 0], [0.36, GOAL + 0.62, 0.62], [0.68, GOAL + 0.62, 0.5], [0.36, GOAL + 0.62, 0.38]]), fill: B.goal, stroke: B.goal, 'stroke-width': f(Math.max(1.5, s * 0.04)), 'stroke-linejoin': 'round' }, deco);
    var goalRing = el('path', { d: poly(ring(0.5, GOAL + 0.5, 0.62, 28)), fill: 'none', stroke: B.goal, 'stroke-width': f(Math.max(2, s * 0.06)), opacity: '0' }, deco);
    var splash = el('path', { d: '', fill: 'none', stroke: Y.fill, 'stroke-width': f(Math.max(2, s * 0.06)), opacity: '0' }, svg);
    // The cube's shadow and faces, redrawn every frame.
    var shadow = el('path', { d: '', fill: '#000000', opacity: '0' }, svg);
    var faceNodes = ['a', 'b', 'c'].map(function () { return el('path', { d: '', stroke: B.edge, 'stroke-width': f(Math.max(1, s * 0.025)), 'stroke-linejoin': 'round' }, svg); });
    var markNodes = ['a', 'b', 'c'].map(function () { return el('path', { d: '', fill: Y.edge, opacity: '0' }, svg); });
    wrap.appendChild(svg);
    host.appendChild(wrap);

    // The cube's faces by where they are now; rolling down (towards the viewer): the front face goes
    // under, the bottom one round the back, the back one over the top, the top one down the front.
    var faces = { t: null, b: null, n: null, s: null, e: null, w: null };
    var row = 0;
    var picked = false, stamped = false;
    var NORMAL = { t: [0, 0, 1], b: [0, 0, -1], n: [0, -1, 0], s: [0, 1, 0], e: [1, 0, 0], w: [-1, 0, 0] };
    var CORNERS = {
      t: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], b: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]],
      n: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]],
      e: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], w: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]]
    };
    /* A point of the cube standing on `row`, tipped by angle a over its front bottom edge. */
    function place(p, a) {
      var y = p[1] - 1, z = p[2];
      var ca = Math.cos(a), sa = Math.sin(a);
      return [p[0], row + 1 + y * ca + z * sa, -y * sa + z * ca];
    }
    function turnN(n, a) { var ca = Math.cos(a), sa = Math.sin(a); return [n[0], n[1] * ca + n[2] * sa, -n[1] * sa + n[2] * ca]; }
    function drawCube(a, lift) {
      var vis = [];
      for (var k in NORMAL) {
        var n = turnN(NORMAL[k], a);
        if (n[1] * ST + n[2] * CT <= 0.01) continue;
        var lit = 0.62 + 0.38 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
        vis.push({ k: k, pts: CORNERS[k].map(function (p) { var q = place(p, a); return [q[0], q[1], q[2] + lift]; }), lit: lit });
      }
      faceNodes.forEach(function (node, i) {
        var v = vis[i];
        if (!v) { node.setAttribute('d', ''); markNodes[i].setAttribute('opacity', '0'); return; }
        var paint = faces[v.k];
        node.setAttribute('d', poly(v.pts));
        node.setAttribute('fill', shade(paint ? Y.fill : B.clean, v.lit));
        // The yellow paint carries its mark, a triangle, so it reads without colour vision too.
        if (paint) {
          var m = function (u, w) { var p = v.pts; return [p[0][0] + (p[1][0] - p[0][0]) * u + (p[3][0] - p[0][0]) * w, p[0][1] + (p[1][1] - p[0][1]) * u + (p[3][1] - p[0][1]) * w, p[0][2] + (p[1][2] - p[0][2]) * u + (p[3][2] - p[0][2]) * w]; };
          markNodes[i].setAttribute('d', poly([m(0.5, 0.3), m(0.7, 0.68), m(0.3, 0.68)]));
          markNodes[i].setAttribute('opacity', '0.65');
        } else markNodes[i].setAttribute('opacity', '0');
      });
      // The shadow on the tile under the cube, tinted by the paint underneath.
      var under = row + (a > Math.PI / 4 ? 1 : 0);
      shadow.setAttribute('d', poly([[0.08, under + 0.08, 0.001], [0.92, under + 0.08, 0.001], [0.92, under + 0.92, 0.001], [0.08, under + 0.92, 0.001]]));
      shadow.setAttribute('fill', faces.b && a === 0 ? Y.edge : '#000000');
      shadow.setAttribute('opacity', '0.35');
    }

    var setAt = laid;
    var rollAt = setAt + SET + 0.3;
    var beat = (ROLL + REST) / 1000;
    var rolls = GOAL;
    var done = rollAt + rolls * beat;
    var total = done + HOLD;
    var t0 = null;

    function landed() {
      // src/wuerfel/cube.ts: rolling down, s -> b, b -> n, n -> t, t -> s.
      faces = { t: faces.n, n: faces.b, b: faces.s, s: faces.t, e: faces.e, w: faces.w };
      row++;
      if (row === SPOT && !faces.b) { faces.b = 'Y'; picked = true; }
      if (row === STAMP && faces.b === 'Y') stamped = true;
    }

    var rolled = 0;
    function frame(now) {
      if (t0 === null) t0 = now;
      var t = (now - t0) / 1000;
      tiles.forEach(function (x) { x.node.setAttribute('opacity', f(clamp((t - x.at) / 0.25))); });
      deco.setAttribute('opacity', f(clamp((t - laid + 0.2) / 0.3)));
      // Rolls that have finished by now: the faces turn and what the cube lands on acts.
      while (rolled < rolls && t >= rollAt + rolled * beat + ROLL / 1000) { landed(); rolled++; }
      var into = rolled < rolls ? (t - rollAt - rolled * beat) * 1000 : -1;
      var a = into >= 0 && into < ROLL ? ease(into / ROLL) * (Math.PI / 2) : 0;
      var set = ease(clamp((t - setAt) / SET));
      drawCube(a, (1 - set) * 1.2);
      shadow.setAttribute('opacity', f(0.35 * set));
      faceNodes.forEach(function (n) { n.setAttribute('opacity', f(set)); });
      spot.setAttribute('opacity', picked ? '0' : '1');
      stampFill.setAttribute('opacity', stamped ? '0.95' : '0');
      // A ring of paint goes out where the cube picks up or stamps.
      var land = picked && !stamped ? rollAt + (SPOT - 1) * beat + ROLL / 1000 : stamped ? rollAt + (STAMP - 1) * beat + ROLL / 1000 : null;
      var k = land === null ? 1 : (t - land) / 0.52;
      if (k >= 0 && k < 1) {
        var rr = stamped ? STAMP : SPOT;
        splash.setAttribute('d', poly(ring(0.5, rr + 0.5, 0.5 + 0.6 * (1 - Math.pow(1 - k, 2)), 28)));
        splash.setAttribute('opacity', f(0.9 * (1 - k)));
      } else splash.setAttribute('opacity', '0');
      goalRing.setAttribute('opacity', rolled >= rolls ? f(clamp((t - done) / 0.3) * 0.95) : '0');
      goal.setAttribute('stroke-dasharray', rolled >= rolls ? 'none' : f(s * 0.12) + ' ' + f(s * 0.08));
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

  /* The WÜRFEL page: in the margin beside the hero, once its pictures have come in. */
  if (flair === 'wuerfel') {
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

  /* The home page: in the margin beside the WÜRFEL card, the first time the card is well in view
     below the sticky header, whichever way the page is scrolled. */
  var card = document.getElementById('wuerfel');
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
