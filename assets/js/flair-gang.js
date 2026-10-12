/* Riddlewerk: GANG's flair. On wide screens a train of gears comes down the page margin beside the
   GANG page's hero, or beside the GANG card on the home page as it scrolls into view: the orange motor
   at the top, then small steel and large brass gears set one after another as the game sets them,
   drawn as the board draws them and to its scale (a quarter of a cell of pitch radius per size), so
   small and large mesh tooth into gap. Then the motor starts, every gear turns from one clock, each
   the other way round from its neighbour and as much faster as it is smaller, the last one a dial that
   rings green; after a while the train runs down and fades away. Decoration only: aria-hidden, no
   pointer events, out of the flow, and nothing at all on narrow screens or with reduced motion. */
(function () {
  'use strict';

  if (!window.matchMedia || !window.matchMedia('(min-width: 900px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NS = 'http://www.w3.org/2000/svg';
  /* The board's metals (src/game/look.ts): face, rim, hub. */
  var METAL = {
    motor: ['#FB923C', '#C2410C', '#431407'],
    small: ['#CBD5E1', '#64748B', '#334155'],
    medium: ['#94A3B8', '#475569', '#1E293B'],
    large: ['#F2B544', '#B45309', '#78350F']
  };
  var RIGHT = '#34D399';
  /* Size units: small 1 (8 teeth), medium 2, large 3; a tooth's depth as a share of the cell. */
  var TEETH = 8;
  var TOOTH = 0.075;
  /* Seconds: each gear set, the motor's run-up, the run, the run-down, the fade. */
  var SET = 0.12;
  var SETTLE = 0.34;
  var SPIN_UP = 0.9;
  var RUN = 9;
  var SPIN_DOWN = 1.8;
  /* The motor turns once in 6 s, the game's own pace (look.ts TURN_SECONDS). */
  var TURN = 6;

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  var f = function (n) { return n.toFixed(2); };
  var clamp = function (t) { return Math.max(0, Math.min(1, t)); };
  var settle = function (t) { var c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  /* A gear outline centred on (0, 0), the first tooth pointing right (the game's PartIcon.tsx). */
  function gearPath(root, tip, teeth) {
    var d = '';
    var step = (Math.PI * 2) / teeth;
    var at = function (r, a) { return f(Math.cos(a) * r) + ' ' + f(Math.sin(a) * r); };
    for (var i = 0; i < teeth; i++) {
      var a = i * step;
      d += (i === 0 ? 'M' : 'L') + at(root, a - step * 0.32) + 'L' + at(tip, a - step * 0.14) + 'L' + at(tip, a + step * 0.14) + 'L' + at(root, a + step * 0.32);
    }
    return d + 'Z';
  }

  /* One wheel for a cell of side `s`: rim, face, inner ring, spokes on the bigger ones, hub. */
  function wheel(parent, units, s, metal, hand) {
    var pitch = (units / 4) * s;
    var depth = TOOTH * s;
    var tip = pitch + depth / 2;
    var root = pitch - depth / 2;
    var teeth = units * TEETH;
    var line = Math.max(1, s * 0.018);
    var m = METAL[metal];
    el('path', { d: gearPath(root, tip, teeth), fill: m[1] }, parent);
    el('path', { d: gearPath(root - line, tip - line, teeth), fill: m[0] }, parent);
    el('circle', { r: f(root - depth * 0.6), fill: 'none', stroke: m[1], 'stroke-width': f(line), opacity: '0.55' }, parent);
    if (units > 1) {
      for (var i = 0; i < 3; i++) {
        var a = (i * Math.PI * 2) / 3 + Math.PI / 6;
        var len = root - depth;
        el('line', { x1: '0', y1: '0', x2: f(Math.cos(a) * len), y2: f(Math.sin(a) * len), stroke: m[1], 'stroke-width': f(Math.max(1.5, s * 0.04)), 'stroke-linecap': 'round', opacity: '0.5' }, parent);
      }
    }
    if (hand) {
      el('path', { d: 'M0 ' + f(s * 0.04) + 'L' + f(-s * 0.035) + ' 0L0 ' + f(-(root - depth * 0.3)) + 'L' + f(s * 0.035) + ' 0Z', fill: hand, stroke: '#0B1020', 'stroke-width': '1', 'stroke-linejoin': 'round' }, parent);
    }
    el('circle', { r: f(Math.max(2.5, s * 0.07)), fill: m[2] }, parent);
    el('circle', { r: f(Math.max(1, s * 0.025)), cx: f(-s * 0.012), cy: f(-s * 0.012), fill: '#FFFFFF', opacity: '0.5' }, parent);
  }

  /* The train, link by link: size, metal and the direction from the gear before it (degrees, 90 is
     straight down). Small and large alternate, so every pair meshes; the large gears run straight
     down and the small ones between them sit to the right, then to the left. */
  var LINKS = [
    [3, 'motor', 0],
    [1, 'small', 72],
    [3, 'large', 108],
    [1, 'small', 108],
    [3, 'large', 72],
    [1, 'small', 72],
    [3, 'large', 108],
    [1, 'small', 108],
    [3, 'large', 72],
    [1, 'small', 72],
    [3, 'large', 108]
  ];

  /* Lays the train out from (0, 0): each gear its two pitch radii from the one before it, turned so
     a gap of its teeth faces a tooth of the other where they touch, and with the speed it turns at:
     the other way round, as much faster as it has fewer teeth. Stops when the next gear would leave
     `height`, on a large gear. */
  function lay(s, height) {
    var out = [];
    for (var i = 0; i < LINKS.length; i++) {
      var l = LINKS[i];
      if (i === 0) {
        out.push({ units: l[0], metal: l[1], x: 0, y: 0, base: 4, ratio: 1 });
        continue;
      }
      var a = out[i - 1];
      var phi = l[2];
      var d = ((a.units + l[0]) / 4) * s;
      var pa = 360 / (a.units * TEETH);
      var pb = 360 / (l[0] * TEETH);
      var base = phi + 180 - pb / 2 + pb * ((phi - a.base) / pa);
      var g = { units: l[0], metal: l[1], x: a.x + Math.cos((phi * Math.PI) / 180) * d, y: a.y + Math.sin((phi * Math.PI) / 180) * d, base: base, ratio: (-a.ratio * a.units) / l[0] };
      if (g.y + (g.units / 4 + TOOTH) * s > height) break;
      out.push(g);
    }
    // It ends on a large gear, the one with the dial.
    if (out.length > 1 && out[out.length - 1].units === 1) out.pop();
    return out;
  }

  /* Draws the train in a box hung from the margin beside `content`, inside `host`, and plays it. */
  function run(host, content) {
    var view = document.documentElement.clientWidth;
    var hostBox = host.getBoundingClientRect();
    var box = content.getBoundingClientRect();
    var room = view - box.right;
    if (room < 24) return;
    // Sized to the margin: the widest gear and its zigzag fit it where there is room, and on a
    // narrower window the train sinks into the window's edge, never over the content.
    var s = Math.max(30, Math.min(64, room / 2.4));
    var top = box.top - hostBox.top + s * 0.2;
    var height = Math.min(box.height, window.innerHeight * 1.2) - s * 0.4;
    var train = lay(s, height - s);
    var reach = (3 / 4 + TOOTH) * s;
    var minX = Math.min.apply(null, train.map(function (g) { return g.x - (g.units / 4 + TOOTH) * s; }));
    var maxX = Math.max.apply(null, train.map(function (g) { return g.x + (g.units / 4 + TOOTH) * s; }));
    var x0 = Math.max(box.right + 10 - minX, box.right + room / 2 - (minX + maxX) / 2);
    var left = Math.round(box.right + 6 - hostBox.left);
    var width = Math.round(view - box.right - 6);
    if (width < 16) return;

    var wrap = document.createElement('div');
    wrap.className = 'flair-gang';
    wrap.setAttribute('aria-hidden', 'true');
    // Where it hangs, as custom properties (the page's CSP allows no inline styles).
    wrap.style.setProperty('--flair-left', left + 'px');
    wrap.style.setProperty('--flair-top', Math.round(top) + 'px');
    var svg = el('svg', { width: String(width), height: String(Math.round(height)), viewBox: '0 0 ' + width + ' ' + Math.round(height), focusable: 'false' });
    var shift = x0 - (box.right + 6);
    var root = el('g', { transform: 'translate(' + f(shift) + ' ' + f(reach) + ')' }, svg);
    var shadow = el('g', { fill: '#000000', opacity: '0.28' }, root);
    // Large gears first, so a small one beside a large one is never hidden under it.
    var order = train.map(function (g, i) { return i; }).sort(function (a, b) { return train[b].units - train[a].units; });
    var last = train.length - 1;
    var gears = [];
    order.forEach(function (i) {
      var g = train[i];
      var spot = el('g', { opacity: '0' }, root);
      var turn = el('g', {}, spot);
      wheel(turn, g.units, s, g.metal, i === last ? RIGHT : null);
      gears[i] = { g: g, spot: spot, turn: turn };
    });
    train.forEach(function (g, i) {
      gears[i].shadow = el('circle', { cx: f(g.x + s * 0.05), cy: f(g.y + s * 0.12), r: f((g.units / 4 + TOOTH / 2) * s), opacity: '0' }, shadow);
    });
    // The last gear stands on a dial: a ring round it, dashed until it turns, then green.
    var lg = train[last];
    var ring = el('circle', { cx: f(lg.x), cy: f(lg.y), r: f((lg.units / 4 + TOOTH * 0.5) * s + Math.max(3, s * 0.06)), fill: 'none', stroke: '#F59E0B', 'stroke-width': f(Math.max(2, s * 0.045)), 'stroke-dasharray': f(s * 0.1) + ' ' + f(s * 0.07), opacity: '0' }, root);
    wrap.appendChild(svg);
    host.appendChild(wrap);

    var t0 = null;
    var setEnd = train.length * SET + SETTLE;
    var total = setEnd + SPIN_UP + RUN + SPIN_DOWN;
    // How far the motor has turned (degrees) t seconds after it starts: up to speed, on, and down.
    var w = 360 / TURN;
    function turned(t) {
      if (t <= 0) return 0;
      if (t < SPIN_UP) return (w * t * t) / (2 * SPIN_UP);
      var up = (w * SPIN_UP) / 2;
      if (t < SPIN_UP + RUN) return up + w * (t - SPIN_UP);
      var d = Math.min(t - SPIN_UP - RUN, SPIN_DOWN);
      return up + w * RUN + w * d - (w * d * d) / (2 * SPIN_DOWN);
    }
    function frame(now) {
      if (t0 === null) t0 = now;
      var t = (now - t0) / 1000;
      var theta = turned(t - setEnd);
      gears.forEach(function (it, i) {
        var p = clamp((t - i * SET) / SETTLE);
        var sc = 1 + (1 - settle(p)) * 0.3;
        it.spot.setAttribute('opacity', f(Math.min(1, p * 3)));
        it.spot.setAttribute('transform', 'translate(' + f(it.g.x) + ' ' + f(it.g.y) + ') scale(' + f(sc) + ')');
        it.turn.setAttribute('transform', 'rotate(' + f(it.g.base + theta * it.g.ratio) + ')');
        it.shadow.setAttribute('opacity', f(Math.min(1, p * 2)));
      });
      var on = clamp((t - setEnd) / 0.3);
      ring.setAttribute('opacity', f(clamp((t - last * SET) / SETTLE)));
      if (on > 0) {
        ring.setAttribute('stroke', RIGHT);
        ring.removeAttribute('stroke-dasharray');
      }
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

  /* The GANG page: down the margin beside the hero, once its pictures have come in. */
  if (flair === 'gang') {
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

  /* The home page: down the margin beside the GANG card, the first time the card is well in view
     below the sticky header, whichever way the page is scrolled. */
  var card = document.getElementById('gang');
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
