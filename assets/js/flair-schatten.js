/* Riddlewerk: SCHATTEN's flair. On wide screens a few cubes drop onto a strip of floor, drawn at the
   game's slant and in its colours, and a lamp above them comes on and sweeps slowly past, its beam and
   its pool of light moving along the floor: each stack throws its real shadow away from the light,
   long when the lamp is far, short when it is close, and the shadows swing round as it passes. Then it all fades away again: once along the bottom of the
   SCHATTEN page's hero, and once along the top of the SCHATTEN card on the home page when the card
   scrolls into view. Decoration only: aria-hidden, no pointer events, out of the flow, and nothing at
   all on narrow screens or with reduced motion. */
(function () {
  'use strict';

  if (!window.matchMedia || !window.matchMedia('(min-width: 900px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NS = 'http://www.w3.org/2000/svg';
  /* The board's slant (src/game/scene.ts): the camera looks down at 30 degrees. */
  var K = 0.5;
  var M = 0.866;
  var R = Math.SQRT1_2;
  /* The cube's colour and its three faces' light, as the board shades them: top, front, right. */
  var FACES = [
    { fill: '#EEE4D2', stroke: '#ABA497' },
    { fill: '#CDC4B4', stroke: '#948D82' },
    { fill: '#948D82', stroke: '#6B665E' }
  ];
  /* The stacks along the floor (share of the width, height in cubes) and the lamp: how high it
     hangs and how far behind the row, in cube sizes. */
  var STACKS = [[0.2, 1], [0.34, 2], [0.5, 1], [0.64, 2], [0.8, 1]];
  var LAMP_Z = 4.2;
  var LAMP_B = -1.2;
  var FLOOR_B = [-1.3, 2.6];
  /* Seconds: the cubes come down, the lamp comes on and sweeps, everything goes. */
  var DROP = 0.42;
  var STAGGER = 0.16;
  var ON = 1.3;
  var SWEEP = 7.2;
  var OFF = 0.9;

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  var f = function (n) { return n.toFixed(1); };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var out = function (t) { var c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  var clamp = function (t) { return Math.max(0, Math.min(1, t)); };

  /* The convex hull of points [[a, b], ...] (monotone chain), for a stack's shadow on the floor. */
  function hull(pts) {
    pts = pts.slice().sort(function (p, q) { return p[0] - q[0] || p[1] - q[1]; });
    var cross = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lower = [];
    var upper = [];
    pts.forEach(function (p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    });
    pts.slice().reverse().forEach(function (p) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    });
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  /* The strip the room will lie in, still empty, out of the flow of `host`. */
  function place(host, where) {
    var line = document.createElement('div');
    line.className = 'flair-schatten flair-schatten--' + where;
    line.setAttribute('aria-hidden', 'true');
    host.appendChild(line);
    return line;
  }

  /* Builds the floor, the stacks and the lamp in the strip, plays them, then takes them away. */
  function run(line) {
    var w = Math.round(line.getBoundingClientRect().width);
    var h = Math.round(line.getBoundingClientRect().height);
    if (w < 300 || h < 30) {
      line.parentNode.removeChild(line);
      return;
    }
    /* Cube size: the tallest stack and the shadows in front of it fit the strip. */
    var s = h / (2 * M + R * K + FLOOR_B[1] * K + 0.5);
    var floorY = h - FLOOR_B[1] * K * s - 0.2 * s;
    /* A point of the floor frame (a along the row, b towards the viewer, z up) on the screen. */
    var P = function (a, b, z) { return [a * s, floorY + b * K * s - z * M * s]; };
    var poly = function (pts) { return 'M' + pts.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join('L') + 'Z'; };
    /* A cube's corner (x, y across the cell, z up) in the floor frame, the cell turned as on the board. */
    var corner = function (a0, x, y) { return [a0 + (x + y) * R, (x - y) * R]; };

    var svg = el('svg', { width: String(w), height: String(h), viewBox: '0 0 ' + w + ' ' + h, focusable: 'false' });
    var defs = el('defs', {}, svg);
    var pool = el('radialGradient', { id: 'flair-schatten-pool' }, defs);
    el('stop', { offset: '0', 'stop-color': '#FCD34D', 'stop-opacity': '0.42' }, pool);
    el('stop', { offset: '1', 'stop-color': '#FCD34D', 'stop-opacity': '0' }, pool);
    var beam = el('linearGradient', { id: 'flair-schatten-beam', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    el('stop', { offset: '0', 'stop-color': '#FDE68A', 'stop-opacity': '0' }, beam);
    el('stop', { offset: '1', 'stop-color': '#FDE68A', 'stop-opacity': '0.16' }, beam);
    var soft = el('filter', { id: 'flair-schatten-soft', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    el('feGaussianBlur', { stdDeviation: f(s * 0.35) }, soft);
    var clip = el('clipPath', { id: 'flair-schatten-floor' }, defs);
    var aw = w / s;
    var floorPts = [P(-1, FLOOR_B[0], 0), P(aw + 1, FLOOR_B[0], 0), P(aw + 1, FLOOR_B[1], 0), P(-1, FLOOR_B[1], 0)];
    el('path', { d: poly(floorPts) }, clip);

    /* The floor, as the board's: a dark band with a faint back edge. */
    el('path', { d: poly(floorPts), fill: '#273049', opacity: '0.85' }, svg);
    el('path', { d: 'M' + f(floorPts[0][0]) + ' ' + f(floorPts[0][1]) + 'H' + f(floorPts[1][0]), stroke: '#36415E', 'stroke-width': '1.2' }, svg);
    var lit = el('g', { 'clip-path': 'url(#flair-schatten-floor)' }, svg);
    var poolEl = el('ellipse', { rx: f(s * 6), ry: f(s * 2.4), fill: 'url(#flair-schatten-pool)', opacity: '0' }, lit);
    var shadowLayer = el('g', { fill: '#04060B', opacity: '0' }, lit);
    /* The lamp's beam, from the top of the strip down to its pool of light, its edges soft. */
    var beamEl = el('path', { fill: 'url(#flair-schatten-beam)', filter: 'url(#flair-schatten-soft)', opacity: '0' }, svg);

    var stacks = STACKS.map(function (st) {
      var a0 = st[0] * aw - R;
      var g = el('g', { opacity: '0' }, svg);
      for (var z = 0; z < st[1]; z++) {
        var c = function (x, y, zz) { var p = corner(a0, x, y); return P(p[0], p[1], zz); };
        var top = [c(0, 0, z + 1), c(1, 0, z + 1), c(1, 1, z + 1), c(0, 1, z + 1)];
        var front = [c(0, 0, z), c(1, 0, z), c(1, 0, z + 1), c(0, 0, z + 1)];
        var right = [c(1, 0, z), c(1, 1, z), c(1, 1, z + 1), c(1, 0, z + 1)];
        [front, right, top].forEach(function (pts, i) {
          var look = FACES[i === 2 ? 0 : i === 0 ? 1 : 2];
          el('path', { d: poly(pts), fill: look.fill, stroke: look.stroke, 'stroke-width': '1', 'stroke-linejoin': 'round' }, g);
        });
      }
      var path = el('path', {}, shadowLayer);
      return { a0: a0, height: st[1], g: g, shadow: path };
    });

    var t0 = null;
    var total = STACKS.length * STAGGER + DROP + ON + SWEEP;
    function frame(now) {
      if (t0 === null) t0 = now;
      var t = (now - t0) / 1000;
      // The stacks come down onto the floor, one after another.
      stacks.forEach(function (st, i) {
        var p = clamp((t - i * STAGGER) / DROP);
        st.g.setAttribute('opacity', f(Math.min(1, p * 3)));
        st.g.setAttribute('transform', 'translate(0 ' + f((1 - out(p)) * -s * 1.6) + ')');
      });
      // The lamp comes on behind the row and sweeps from end to end.
      var start = STACKS.length * STAGGER + DROP * 0.5;
      var on = clamp((t - start) / ON);
      var sweep = ease(clamp((t - start - ON * 0.4) / SWEEP));
      var la = -0.06 * aw + sweep * 1.12 * aw;
      var floorAt = P(la, 0.6, 0);
      beamEl.setAttribute('d', 'M' + f(floorAt[0] - s * 0.4) + ' 0H' + f(floorAt[0] + s * 0.4) + 'L' + f(floorAt[0] + s * 4.2) + ' ' + f(floorAt[1]) + 'H' + f(floorAt[0] - s * 4.2) + 'Z');
      beamEl.setAttribute('opacity', f(on));
      poolEl.setAttribute('cx', f(floorAt[0]));
      poolEl.setAttribute('cy', f(floorAt[1]));
      poolEl.setAttribute('opacity', f(on));
      shadowLayer.setAttribute('opacity', f(on * 0.72));
      // Each stack's shadow: its foot and its top corners thrown onto the floor from the lamp.
      stacks.forEach(function (st) {
        var pts = [];
        [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(function (xy) {
          var p = corner(st.a0, xy[0], xy[1]);
          pts.push(p);
          var k = LAMP_Z / (LAMP_Z - st.height);
          pts.push([la + (p[0] - la) * k, LAMP_B + (p[1] - LAMP_B) * k]);
        });
        st.shadow.setAttribute('d', poly(hull(pts).map(function (q) { return P(q[0], q[1], 0); })));
      });
      if (t < total) {
        requestAnimationFrame(frame);
        return;
      }
      line.classList.add('is-gone');
      setTimeout(function () {
        if (line.parentNode) line.parentNode.removeChild(line);
      }, OFF * 1000 + 300);
    }
    line.appendChild(svg);
    requestAnimationFrame(frame);
  }

  var flair = document.body.getAttribute('data-flair');

  /* The SCHATTEN page: along the bottom of the hero, once its pictures have come in. */
  if (flair === 'schatten') {
    var hero = document.querySelector('.dhero');
    if (hero) {
      var strip = place(hero, 'hero');
      setTimeout(function () { run(strip); }, 900);
    }
    return;
  }

  /* The home page: along the top of the SCHATTEN card, the first time that strip is in full view
     below the sticky header, whichever way the page is scrolled. */
  var card = document.getElementById('schatten');
  if (!card || !('IntersectionObserver' in window)) return;
  var line = place(card, 'card');
  var seen = new IntersectionObserver(
    function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      seen.disconnect();
      run(line);
    },
    { threshold: 1, rootMargin: '-90px 0px -12% 0px' }
  );
  seen.observe(line);
})();
