/* SPIEGEL's flair: on wide screens a laser beam runs in from the left through the top margin of the
   SPIEGEL card on the home page (or the head of SPIEGEL's own page), turns down at a small mirror into
   the gap between the pictures and the text, turns again at the bottom and leaves to the right: always
   in empty space, never across the text. Once per page view, when it scrolls into view. Nothing at
   all for reduced motion or below two columns. Styles in assets/css/flair-spiegel.css. */
(function () {
  'use strict';

  var wide = window.matchMedia && window.matchMedia('(min-width: 960px)');
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!wide || !wide.matches || calm.matches || !('IntersectionObserver' in window)) return;

  var host = document.body.getAttribute('data-flair') === 'spiegel' ? document.querySelector('.dhero') : document.getElementById('spiegel');
  if (!host || !host.querySelector('.dhero__visual, .game__visual')) return;

  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'laser-flair');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  function el(name, cls, parent) {
    var e = document.createElementNS(NS, name);
    e.setAttribute('class', cls);
    (parent || svg).appendChild(e);
    return e;
  }

  var shades = [el('line', 'mirror-shade'), el('line', 'mirror-shade')];
  var mirrors = [el('line', 'mirror'), el('line', 'mirror')];
  var beams = [el('path', 'beam glow'), el('path', 'beam core'), el('path', 'beam hot')];
  var flares = [el('circle', 'flare'), el('circle', 'flare')];
  host.appendChild(svg);

  var detail = document.body.getAttribute('data-flair') === 'spiegel';
  var picture = host.querySelector(detail ? '.dhero__visual' : '.game__visual');
  var words = host.querySelector(detail ? '.dhero__text' : '.game__intro');

  /* Lays the beam out for the host's size: in along the top margin, down the middle of the gap between
     the two columns, out along the bottom margin. Both mirrors are turned like the game's "\". */
  function layout() {
    var w = host.clientWidth;
    var h = host.clientHeight;
    var box = host.getBoundingClientRect();
    var p = picture.getBoundingClientRect();
    var t = words.getBoundingClientRect();
    var gap = p.left < t.left ? (p.right + t.left) / 2 : (t.right + p.left) / 2;
    var x = Math.round(gap - box.left);
    var top = detail ? 30 : 32;
    var bottom = h - (detail ? 40 : 30);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    var d = 'M-30 ' + top + ' H' + x + ' V' + bottom + ' H' + (w + 30);
    beams.forEach(function (b) {
      b.setAttribute('d', d);
    });
    var corners = [[x, top], [x, bottom]];
    var s = 13;
    corners.forEach(function (c, i) {
      [mirrors[i], shades[i]].forEach(function (m) {
        m.setAttribute('x1', c[0] - s);
        m.setAttribute('y1', c[1] - s);
        m.setAttribute('x2', c[0] + s);
        m.setAttribute('y2', c[1] + s);
      });
      flares[i].setAttribute('cx', c[0]);
      flares[i].setAttribute('cy', c[1]);
      flares[i].setAttribute('r', 7);
    });
    var length = beams[0].getTotalLength();
    svg.style.setProperty('--len', length + 'px');
    // The flares light as the beam reaches each mirror (the beam's ease is close to linear midway).
    var duration = 1.9;
    flares[0].style.setProperty('--at', (((x + 30) / length) * duration).toFixed(2) + 's');
    flares[1].style.setProperty('--at', (((x + 30 + (bottom - top)) / length) * duration).toFixed(2) + 's');
  }

  layout();

  var started = false;
  new IntersectionObserver(
    function (entries, observer) {
      if (!entries.some(function (e) { return e.isIntersecting; }) || started) return;
      started = true;
      observer.disconnect();
      svg.classList.add('is-shown');
      window.setTimeout(function () {
        svg.classList.add('is-on');
        window.setTimeout(function () {
          svg.classList.add('is-done');
        }, 2600);
      }, 350);
    },
    { threshold: 0.35 }
  ).observe(host);

  var pending = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(pending);
    pending = window.setTimeout(layout, 150);
  });
})();
