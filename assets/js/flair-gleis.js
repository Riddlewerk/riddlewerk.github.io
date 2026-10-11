/* Riddlewerk: GLEIS's flair. On wide screens a stretch of track lays itself, a red and then a blue
   train roll along it as they do in the game, and the track fades away again: once along the
   bottom of the GLEIS page's hero, and once along the top of the GLEIS card on the home page when
   the card scrolls into view. Decoration only: aria-hidden, no pointer events, out of the flow, and
   nothing at all on narrow screens or with reduced motion. */
(function () {
  'use strict';

  if (!window.matchMedia || !window.matchMedia('(min-width: 900px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NS = 'http://www.w3.org/2000/svg';
  /* The game's own colours (src/game/look.ts): the track, and the red and blue trains with their marks. */
  var TRAINS = [
    { body: '#F43F5E', dark: '#9F1239', mark: 'M46 30a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z' },
    { body: '#38BDF8', dark: '#075985', mark: 'M47.7 19.7H68.3V40.3H47.7Z' }
  ];
  /* Pixels per second the trains roll at, and how far behind the first the second one runs. */
  var SPEED = 420;
  var GAP = 0.75;

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  /* A locomotive as the game draws it (Board.tsx TrainSprite), nose to the right, on 100 x 60. */
  function loco(t) {
    var svg = el('svg', { viewBox: '0 0 100 60', focusable: 'false' });
    el('path', { d: 'M10 10H70Q96 10 96 30Q96 50 70 50H10Q4 50 4 44V16Q4 10 10 10Z', fill: '#000', opacity: '0.3', transform: 'translate(2 4)' }, svg);
    el('path', { d: 'M10 6H70Q97 6 97 30Q97 54 70 54H10Q3 54 3 47V13Q3 6 10 6Z', fill: t.body, stroke: t.dark, 'stroke-width': '4' }, svg);
    el('rect', { x: '10', y: '14', width: '20', height: '32', rx: '5', fill: t.dark, opacity: '0.75' }, svg);
    el('path', { d: t.mark, fill: '#fff', stroke: t.dark, 'stroke-width': '2' }, svg);
    el('circle', { cx: '88', cy: '30', r: '5', fill: '#FFF7D6' }, svg);
    return svg;
  }

  /* The track, as the board draws it: ballast bed, wooden sleepers, two steel rails. h is its height. */
  function track(w, h) {
    var svg = el('svg', { width: String(w), height: String(h), viewBox: '0 0 ' + w + ' ' + h, focusable: 'false' });
    var mid = h / 2;
    var gauge = h * 0.25;
    var tie = h * 0.42;
    var step = h * 0.55;
    var ties = '';
    for (var x = step / 2; x < w; x += step) ties += 'M' + x.toFixed(1) + ' ' + (mid - tie).toFixed(1) + 'V' + (mid + tie).toFixed(1);
    el('rect', { x: '0', y: '0', width: String(w), height: String(h), rx: String(h * 0.2), fill: '#1C2233', opacity: '0.85' }, svg);
    el('path', { d: ties, stroke: '#6B5443', 'stroke-width': (h * 0.15).toFixed(1) }, svg);
    var rails = 'M0 ' + (mid - gauge).toFixed(1) + 'H' + w + 'M0 ' + (mid + gauge).toFixed(1) + 'H' + w;
    el('path', { d: rails, stroke: '#D7DEE8', 'stroke-width': (h * 0.11).toFixed(1) }, svg);
    el('path', { d: rails, stroke: '#fff', 'stroke-width': (h * 0.035).toFixed(1), opacity: '0.5' }, svg);
    return svg;
  }

  /* The strip the track will lie in, still empty, out of the flow of `host`. */
  function place(host, where) {
    var line = document.createElement('div');
    line.className = 'flair-gleis flair-gleis--' + where;
    line.setAttribute('aria-hidden', 'true');
    host.appendChild(line);
    return line;
  }

  /* Lays the track in the strip, runs the trains along it, then takes it away again. */
  function run(line) {
    var w = Math.round(line.getBoundingClientRect().width);
    var h = Math.round(line.getBoundingClientRect().height);
    if (w < 200 || h < 10) {
      line.parentNode.removeChild(line);
      return;
    }
    var rail = document.createElement('div');
    rail.className = 'flair-gleis__rail';
    rail.appendChild(track(w, h));
    line.appendChild(rail);

    var len = Math.round(h * 1.75);
    var secs = (w + len * 2) / SPEED;
    line.style.setProperty('--len', len + 'px');
    line.style.setProperty('--run', w + len + 'px');
    line.style.setProperty('--dur', secs.toFixed(2) + 's');
    line.style.setProperty('--gap', GAP + 's');

    var left = TRAINS.length;
    TRAINS.forEach(function (t, i) {
      var car = document.createElement('div');
      car.className = 'flair-gleis__train flair-gleis__train--' + (i + 1);
      car.appendChild(loco(t));
      car.addEventListener('animationend', function () {
        left -= 1;
        if (left === 0) {
          line.classList.add('is-gone');
          setTimeout(function () {
            if (line.parentNode) line.parentNode.removeChild(line);
          }, 900);
        }
      });
      line.appendChild(car);
    });
  }

  var flair = document.body.getAttribute('data-flair');

  /* The GLEIS page: along the bottom of the hero, once its pictures have come in. */
  if (flair === 'gleis') {
    var hero = document.querySelector('.dhero');
    if (hero) {
      var strip = place(hero, 'hero');
      setTimeout(function () { run(strip); }, 900);
    }
    return;
  }

  /* The home page: along the top of the GLEIS card, the first time that strip is in full view below
     the sticky header, whichever way the page is scrolled. */
  var card = document.getElementById('gleis');
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
