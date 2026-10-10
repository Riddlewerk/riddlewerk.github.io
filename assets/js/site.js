/* Riddlewerk: the little script this site needs. No tracking, no storage, no network. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- legal pages: DE / EN */
  // Both languages are in the page. Without JS both are shown one after the other; with JS the
  // one in the URL hash (#en, #en-…) is shown, German otherwise.
  var sections = document.querySelectorAll('[data-legal-lang]');

  if (sections.length) {
    var show = function () {
      var hash = (location.hash || '').slice(1);
      var lang = hash === 'en' || hash.indexOf('en-') === 0 ? 'en' : 'de';

      sections.forEach(function (s) {
        s.hidden = s.getAttribute('data-legal-lang') !== lang;
      });

      document.documentElement.lang = lang;

      document.querySelectorAll('[data-lang-link]').forEach(function (a) {
        a.setAttribute('aria-current', a.getAttribute('data-lang-link') === lang ? 'true' : 'false');
      });

      // Links and labels that differ per language carry both versions.
      document.querySelectorAll('[data-href-' + lang + ']').forEach(function (a) {
        a.setAttribute('href', a.getAttribute('data-href-' + lang));
      });
      document.querySelectorAll('[data-text-' + lang + ']').forEach(function (el) {
        el.textContent = el.getAttribute('data-text-' + lang);
      });

      var title = document.querySelector('meta[name="title-' + lang + '"]');
      if (title) document.title = title.getAttribute('content');

      // A link to a heading inside the hidden language (e.g. #en-ads) lands after the switch.
      var target = hash && hash !== 'de' && hash !== 'en' ? document.getElementById(hash) : null;
      if (target) target.scrollIntoView();
    };

    show();
    window.addEventListener('hashchange', function () {
      show();
      if (location.hash === '#de' || location.hash === '#en') window.scrollTo(0, 0);
    });
  }

  /* ---------------------------------------------------------------- the playable example */
  // A real DREH level, played with the app's rules: every word stays between 3 and 8 letters,
  // each card can be used once, and "every a → b" replaces all of them.
  var MIN = 3;
  var MAX = 8;

  var ops = {
    reverse: function (w) {
      return w.split('').reverse().join('');
    },
    dropFirst: function (w) {
      return w.length - 1 >= MIN ? w.slice(1) : null;
    },
    dropLast: function (w) {
      return w.length - 1 >= MIN ? w.slice(0, -1) : null;
    },
    insertHead: function (w, c) {
      return w.length + 1 <= MAX ? c + w : null;
    },
    insertTail: function (w, c) {
      return w.length + 1 <= MAX ? w + c : null;
    },
    replace: function (w, a, b) {
      return w.split(a).join(b);
    }
  };

  document.querySelectorAll('[data-demo]').forEach(function (demo) {
    var start = demo.getAttribute('data-start');
    var target = demo.getAttribute('data-target');
    var wordEl = demo.querySelector('[data-word]');
    var statusEl = demo.querySelector('[data-status]');
    var resetBtn = demo.querySelector('[data-reset]');
    var cards = Array.prototype.slice.call(demo.querySelectorAll('[data-op]'));
    var msg = JSON.parse(demo.querySelector('[data-messages]').textContent);

    var word;
    var moves;

    function render(changed) {
      var prev = wordEl.textContent.replace(/\s+/g, '');
      wordEl.innerHTML = '';
      word.split('').forEach(function (c, i) {
        var k = document.createElement('span');
        k.className = 'key';
        k.textContent = c.toUpperCase();
        if (changed && !reduceMotion && prev.charAt(i).toLowerCase() !== c) k.className += ' is-new';
        wordEl.appendChild(k);
      });
    }

    // One live region: the current word for screen readers, then the message.
    function say(html, win) {
      statusEl.innerHTML =
        '<span class="sr-only">' + msg.word + ': ' + word.toUpperCase() + '. </span>' + html;
      statusEl.classList.toggle('is-win', !!win);
    }

    function reset() {
      word = start;
      moves = [];
      cards.forEach(function (c) {
        c.disabled = false;
        var step = c.querySelector('.card__step');
        if (step) step.remove();
      });
      wordEl.classList.remove('is-solved');
      render(false);
      say(msg.start);
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var op = ops[card.getAttribute('data-op')];
        var next = op(word, card.getAttribute('data-a'), card.getAttribute('data-b'));

        if (next === null) {
          say(msg.refused);
          if (!reduceMotion) {
            card.classList.remove('is-refused');
            void card.offsetWidth;
            card.classList.add('is-refused');
          }
          return;
        }

        word = next;
        moves.push(card);
        card.disabled = true;

        var step = document.createElement('span');
        step.className = 'card__step';
        step.textContent = String(moves.length);
        step.setAttribute('aria-hidden', 'true');
        card.appendChild(step);

        render(true);

        if (word === target) {
          wordEl.classList.add('is-solved');
          say(msg.win, true);
          resetBtn.focus({ preventScroll: true });
        } else if (moves.length === cards.length) {
          say(msg.lose.replace('{0}', word.toUpperCase()));
          resetBtn.focus({ preventScroll: true });
        } else {
          say(msg.step.replace('{0}', String(moves.length)));
        }
      });
    });

    resetBtn.addEventListener('click', reset);
    demo.classList.add('is-live');
    reset();
  });
})();
