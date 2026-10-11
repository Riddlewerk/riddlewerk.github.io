// Riddlewerk: writes the game detail pages, /<id>/ in German and /en/<id>/ in English, from one data
// file per game in _build/games/<id>.json. Run it from the website folder after any change to a data
// file:   node _build/pages.mjs
// The pages carry the site's strict CSP, so everything they show is a file on this site: no inline
// scripts or styles, a game's accent colour comes from its .game--<id> rule in assets/css/site.css.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://riddlewerk.com';

const games = readdirSync(join(SITE, '_build/games'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(SITE, '_build/games', f), 'utf8')))
  .sort((a, b) => a.order - b.order);

/** Words the pages need around a game's own text. */
const UI = {
  de: {
    lang: 'de',
    locale: 'de_DE',
    skip: 'Zum Inhalt springen',
    main: 'inhalt',
    quotes: ['„', '“'],
    home: 'Riddlewerk – Startseite',
    nav: 'Hauptnavigation',
    langNav: 'Sprache',
    games: 'Spiele',
    studio: 'Studio',
    contact: 'Kontakt',
    gamesAnchor: 'spiele',
    studioAnchor: 'studio',
    contactAnchor: 'kontakt',
    back: 'Alle Spiele',
    watch: 'Video ansehen',
    look: 'Bilder ansehen',
    icon: (n) => `App-Symbol von ${n}`,
    soon: ['Bald bei Google Play', 'Bald im App Store'],
    availability: 'Verfügbarkeit',
    videoEyebrow: 'Video',
    videoTitle: (n) => `${n} in Bewegung`,
    videoCaption: 'Der Trailer zeigt echte Level, gelöst mit den Regeln des Spiels, und die Musik aus dem Spiel.',
    videoFallback: (href) => `Dein Browser kann dieses Video nicht abspielen. <a href="${href}">Video herunterladen</a>.`,
    stepsEyebrow: 'So geht’s',
    galleryEyebrow: 'Bilder',
    galleryTitle: 'Ein Blick ins Spiel',
    galleryHint: 'Zum Weiterblättern wischen oder scrollen.',
    galleryCaption: (n) => `Bilder aus dem Store-Eintrag von ${n}, aufgenommen in der aktuellen Version`,
    phonesCaption: (n) => `Screenshots aus der aktuellen Version von ${n}`,
    factsEyebrow: 'Auf einen Blick',
    factsTitle: (n) => `${n} in Zahlen`,
    statsLabel: (n) => `${n} in Zahlen`,
    worldsEyebrow: 'Welten',
    moreEyebrow: 'Mehr von Riddlewerk',
    moreTitle: 'Weitere Spiele',
    brandLine: 'Kleine, ruhige Rätselspiele. Die Reihenfolge entscheidet.',
    aboutUs: 'Über uns',
    tryLevel: 'Ein Level ausprobieren',
    tryAnchor: 'probieren',
    legal: 'Rechtliches',
    impressum: 'Impressum',
    privacy: 'Datenschutz',
    ai: 'KI-Hinweis',
    aiAnchor: 'ki',
    credits: 'Lizenzen',
    legalHash: '',
    footerNote: 'Ohne Cookies, ohne Tracking, ohne externe Inhalte.',
  },
  en: {
    lang: 'en',
    locale: 'en_US',
    skip: 'Skip to content',
    main: 'content',
    quotes: ['“', '”'],
    home: 'Riddlewerk – home',
    nav: 'Main',
    langNav: 'Language',
    games: 'Games',
    studio: 'Studio',
    contact: 'Contact',
    gamesAnchor: 'games',
    studioAnchor: 'studio',
    contactAnchor: 'contact',
    back: 'All games',
    watch: 'Watch the video',
    look: 'See the pictures',
    icon: (n) => `${n} app icon`,
    soon: ['Coming to Google Play', 'Coming to the App Store'],
    availability: 'Availability',
    videoEyebrow: 'Video',
    videoTitle: (n) => `${n} in motion`,
    videoCaption: 'The trailer shows real levels, solved by the game’s own rules, and the game’s own music.',
    videoFallback: (href) => `Your browser can’t play this video. <a href="${href}">Download the video</a>.`,
    stepsEyebrow: 'How it works',
    galleryEyebrow: 'Pictures',
    galleryTitle: 'A look inside',
    galleryHint: 'Swipe or scroll for more.',
    galleryCaption: (n) => `Pictures from the store listing of ${n}, taken in the current version`,
    phonesCaption: (n) => `Screenshots from the current version of ${n}`,
    factsEyebrow: 'At a glance',
    factsTitle: (n) => `${n} in numbers`,
    statsLabel: (n) => `${n} in numbers`,
    worldsEyebrow: 'Worlds',
    moreEyebrow: 'More from Riddlewerk',
    moreTitle: 'More games',
    brandLine: 'Small, calm puzzle games. Order decides.',
    aboutUs: 'About us',
    tryLevel: 'Try a level',
    tryAnchor: 'try',
    legal: 'Legal',
    impressum: 'Legal notice',
    privacy: 'Privacy',
    ai: 'AI notice',
    aiAnchor: 'ai',
    credits: 'Licences',
    legalHash: '#en',
    footerNote: 'No cookies, no tracking, no external content.',
  },
};

const MARK =
  '<svg viewBox="70 84 372 348" aria-hidden="true" focusable="false"><rect x="94" y="196" width="208" height="208" rx="32" fill="#2A2F45"/><rect x="146" y="148" width="208" height="208" rx="32" fill="#38BDF8" transform="rotate(12 250 252)"/><rect x="192" y="125" width="208" height="208" rx="32" fill="#F59E0B" transform="rotate(22 296 229)"/></svg>';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Where a page of this game lives, and how far it is from the site root. */
function where(game, lang) {
  return lang === 'de'
    ? { path: `${game.id}/`, root: '../', dePage: `../${game.id}/`, enPage: `../en/${game.id}/`, siteHome: '../', legalRoot: '../' }
    : { path: `en/${game.id}/`, root: '../../', dePage: `../../${game.id}/`, enPage: `./`, siteHome: '../', legalRoot: '../../' };
}

function keys(letters, cls = 'keys keys--game') {
  return `<span class="${cls}" aria-hidden="true">${[...letters].map((c) => `<span class="key">${esc(c)}</span>`).join('')}</span>`;
}

function img(root, base, alt, cls, sizes, lazy = true) {
  return `<img${cls ? ` class="${cls}"` : ''} src="${root}assets/img/${base}-320.webp" srcset="${root}assets/img/${base}-320.webp 320w, ${root}assets/img/${base}-640.webp 640w" sizes="${sizes}" width="320" height="692"${lazy ? ' loading="lazy"' : ''} decoding="async" alt="${esc(alt)}">`;
}

function phones(game, t, ui, root, lang) {
  const [left, middle, right] = game.media.phones;
  const shot = (name, i) => img(root, `${game.id}-${name}-${lang}`, t.phonesAlt[i], '', i === 1 ? '(max-width: 599px) 184px, 236px' : '(max-width: 599px) 150px, 190px', false);
  return `<div class="phones">
            <figure class="phone phone--side phone--left">
              ${shot(left, 0)}
            </figure>
            <figure class="phone">
              ${shot(middle, 1)}
            </figure>
            <figure class="phone phone--side phone--right">
              ${shot(right, 2)}
            </figure>
          </div>
          <p class="shot-caption">${esc(ui.phonesCaption(t.name))}</p>`;
}

/** A visual made of markup, for a game without screenshots (ZEHN): copied from the home page. */
function art(game, t) {
  return game.media.art.replace('{label}', esc(t.artLabel));
}

function header(ui, w, lang) {
  const cur = (l) => (l === lang ? ' aria-current="page"' : '');
  return `<a class="skip-link" href="#${ui.main}">${esc(ui.skip)}</a>

  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="${w.siteHome}" aria-label="${esc(ui.home)}">
        ${MARK}
        Riddlewerk
      </a>
      <nav class="nav" aria-label="${esc(ui.nav)}">
        <a href="${w.siteHome}#${ui.gamesAnchor}">${esc(ui.games)}</a>
        <a href="${w.siteHome}#${ui.studioAnchor}">${esc(ui.studio)}</a>
        <a href="${w.siteHome}#${ui.contactAnchor}">${esc(ui.contact)}</a>
      </nav>
      <nav class="lang" aria-label="${esc(ui.langNav)}">
        <a href="${w.dePage}" hreflang="de" lang="de"${cur('de')}><span class="sr-only">Deutsch</span><span aria-hidden="true">DE</span></a>
        <a href="${w.enPage}" hreflang="en" lang="en"${cur('en')}><span class="sr-only">English</span><span aria-hidden="true">EN</span></a>
      </nav>
    </div>
  </header>`;
}

function footer(ui, w, lang) {
  const cur = (l) => (l === lang ? ' aria-current="page"' : '');
  const gameLinks = games.map((g) => `<li><a href="${w.siteHome}${g.id}/">${esc(g[lang].name)}</a></li>`).join('\n            ');
  return `<footer class="site-footer">
    <div class="wrap">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="brand" href="${w.siteHome}">
            ${MARK}
            Riddlewerk
          </a>
          <p>${esc(ui.brandLine)}</p>
        </div>
        <nav class="footer-col" aria-labelledby="f-games">
          <h2 id="f-games">${esc(ui.games)}</h2>
          <ul>
            ${gameLinks}
          </ul>
        </nav>
        <nav class="footer-col" aria-labelledby="f-studio">
          <h2 id="f-studio">${esc(ui.studio)}</h2>
          <ul>
            <li><a href="${w.siteHome}#${ui.studioAnchor}">${esc(ui.aboutUs)}</a></li>
            <li><a href="${w.siteHome}#${ui.tryAnchor}">${esc(ui.tryLevel)}</a></li>
            <li><a href="${w.siteHome}#${ui.contactAnchor}">${esc(ui.contact)}</a></li>
          </ul>
        </nav>
        <nav class="footer-col" aria-labelledby="f-legal">
          <h2 id="f-legal">${esc(ui.legal)}</h2>
          <ul>
            <li><a href="${w.legalRoot}impressum.html${ui.legalHash}">${esc(ui.impressum)}</a></li>
            <li><a href="${w.legalRoot}privacy.html${ui.legalHash}">${esc(ui.privacy)}</a></li>
            <li><a href="${w.siteHome}#${ui.aiAnchor}">${esc(ui.ai)}</a></li>
            <li><a href="${w.legalRoot}credits.html${ui.legalHash}">${esc(ui.credits)}</a></li>
          </ul>
        </nav>
      </div>
      <div class="footer-bottom">
        <p>© 2026 Riddlewerk</p>
        <p class="footer-note">${esc(ui.footerNote)}</p>
        <nav class="lang" aria-label="${esc(ui.langNav)}">
          <a href="${w.dePage}" hreflang="de" lang="de"${cur('de')}><span class="sr-only">Deutsch</span><span aria-hidden="true">DE</span></a>
          <a href="${w.enPage}" hreflang="en" lang="en"${cur('en')}><span class="sr-only">English</span><span aria-hidden="true">EN</span></a>
        </nav>
      </div>
    </div>
  </footer>`;
}

function page(game, lang) {
  const ui = UI[lang];
  const t = game[lang];
  const w = where(game, lang);
  const root = w.root;
  const id = game.id;
  const m = game.media;
  const url = `${ORIGIN}/${w.path}`;
  const ogImage = m.og ? `${ORIGIN}/assets/img/${id}-og-${lang}.jpg` : `${ORIGIN}/assets/img/og-image.png`;
  const flairHead = game.flair
    ? `\n  <link rel="stylesheet" href="${root}assets/css/flair-${game.flair}.css">\n  <script src="${root}assets/js/flair-${game.flair}.js" defer></script>`
    : '';
  const video = m.video
    ? `
    <section class="section dsection" id="video" aria-labelledby="video-title">
      <div class="wrap">
        <div class="section-head section-head--center">
          <p class="eyebrow">${esc(ui.videoEyebrow)}</p>
          <h2 id="video-title">${esc(ui.videoTitle(t.name))}</h2>
        </div>
        <figure class="player">
          <video controls preload="metadata" playsinline width="1280" height="720" poster="${root}assets/video/${id}-promo-${lang}.jpg">
            <source src="${root}assets/video/${id}-promo-${lang}.mp4" type="video/mp4">
            <p>${ui.videoFallback(`${root}assets/video/${id}-promo-${lang}.mp4`)}</p>
          </video>
          <figcaption>${esc(ui.videoCaption)}</figcaption>
        </figure>
      </div>
    </section>`
    : '';
  const gallery = m.gallery
    ? `
    <section class="section dsection" id="bilder" aria-labelledby="bilder-title">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow">${esc(ui.galleryEyebrow)}</p>
          <h2 id="bilder-title">${esc(ui.galleryTitle)}</h2>
          <p class="gallery__hint">${esc(ui.galleryHint)}</p>
        </div>
        <ul class="gallery" aria-label="${esc(ui.galleryCaption(t.name))}">
          ${t.gallery
            .map(
              (alt, i) =>
                `<li><img src="${root}assets/img/${id}-shot-${lang}-${i + 1}-360.webp" srcset="${root}assets/img/${id}-shot-${lang}-${i + 1}-360.webp 360w, ${root}assets/img/${id}-shot-${lang}-${i + 1}-720.webp 720w" sizes="(max-width: 599px) 64vw, 270px" width="360" height="640" loading="lazy" decoding="async" alt="${esc(alt)}"></li>`,
            )
            .join('\n          ')}
        </ul>
        <p class="shot-caption">${esc(ui.galleryCaption(t.name))}</p>
      </div>
    </section>`
    : '';
  const others = games.filter((g) => g.id !== id);

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'">
  <meta name="referrer" content="no-referrer">
  <title>${esc(t.title)}</title>
  <meta name="description" content="${esc(t.description)}">
  <meta name="theme-color" content="#080D16">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="de" href="${ORIGIN}/${id}/">
  <link rel="alternate" hreflang="en" href="${ORIGIN}/en/${id}/">
  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/${id}/">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Riddlewerk">
  <meta property="og:locale" content="${ui.locale}">
  <meta property="og:title" content="${esc(t.title)}">
  <meta property="og:description" content="${esc(t.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(t.title)}">
  <meta name="twitter:description" content="${esc(t.description)}">
  <meta name="twitter:image" content="${ogImage}">

  <link rel="icon" href="${root}favicon.ico" sizes="32x32">
  <link rel="icon" href="${root}favicon-32.png" type="image/png" sizes="32x32">
  <link rel="icon" href="${root}favicon-16.png" type="image/png" sizes="16x16">
  <link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
  <link rel="manifest" href="${root}site.webmanifest">

  <link rel="preload" href="${root}assets/fonts/nunito-black.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${root}assets/fonts/nunito-semibold.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${root}assets/css/site.css">
  <script src="${root}assets/js/site.js" defer></script>${flairHead}
</head>
<body class="detail game--${id}"${game.flair ? ` data-flair="${game.flair}"` : ''}>
  <!-- Generated by _build/pages.mjs from _build/games/${id}.json. Edit that file, not this one. -->
  ${header(ui, w, lang)}

  <main id="${ui.main}">
    <section class="dhero" aria-labelledby="game-title">
      <div class="wrap dhero__grid">
        <div class="dhero__text">
          <a class="backlink" href="${w.siteHome}#${ui.gamesAnchor}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            ${esc(ui.back)}
          </a>
          <div class="game__head">
            <img class="game__icon" src="${root}assets/img/${id}-icon-192.webp" width="64" height="64" alt="${esc(ui.icon(t.name))}">
            <div>
              <p class="game__genre">${esc(t.genre)}</p>
              <h1 class="game__title" id="game-title">
                <span class="sr-only">${esc(t.name)}</span>
                ${keys(game.letters)}
              </h1>
            </div>
          </div>
          <p class="game__tagline"><q>${ui.quotes[0]}${esc(t.tagline)}${ui.quotes[1]}</q></p>
          <div class="game__text">
            ${t.lead.map((p) => `<p>${esc(p)}</p>`).join('\n            ')}
          </div>
          <ul class="availability" aria-label="${esc(ui.availability)}">
            <li>${esc(ui.soon[0])}</li>
            <li>${esc(ui.soon[1])}</li>
          </ul>
          <div class="dhero__actions">
            ${m.video ? `<a class="btn" href="#video">${esc(ui.watch)}<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg></a>` : ''}
            ${m.gallery ? `<a class="btn btn--ghost" href="#bilder">${esc(ui.look)}</a>` : ''}
          </div>
        </div>
        <div class="dhero__visual">
          ${m.phones ? phones(game, t, ui, root, lang) : art(game, t)}
        </div>
      </div>
    </section>
${video}

    <section class="section dsection" id="so-gehts" aria-labelledby="steps-title">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow">${esc(ui.stepsEyebrow)}</p>
          <h2 id="steps-title">${esc(t.stepsTitle)}</h2>
        </div>
        <ol class="steps">
          ${t.steps
            .map(
              ([head, body], i) => `<li class="step">
            <span class="step__n" aria-hidden="true">${i + 1}</span>
            <h3>${esc(head)}</h3>
            <p>${esc(body)}</p>
          </li>`,
            )
            .join('\n          ')}
        </ol>
      </div>
    </section>
${gallery}

    <section class="section dsection" id="fakten" aria-labelledby="facts-title">
      <div class="wrap">
        <div class="facts">
          <div>
            <p class="eyebrow">${esc(ui.factsEyebrow)}</p>
            <h2 id="facts-title">${esc(ui.factsTitle(t.name))}</h2>
            <ul class="stats" aria-label="${esc(ui.statsLabel(t.name))}">
              ${t.stats.map(([n, label]) => `<li class="stat"><b>${esc(n)}</b><span>${esc(label)}</span></li>`).join('\n              ')}
            </ul>
          </div>
          <ul class="features">
            ${t.features.map((f) => `<li>${esc(f)}</li>`).join('\n            ')}
          </ul>
        </div>
      </div>
    </section>

    <section class="section dsection" id="welten" aria-labelledby="worlds-title">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow">${esc(ui.worldsEyebrow)}</p>
          <h2 id="worlds-title">${esc(t.worldsTitle)}</h2>
        </div>
        <ol class="worlds">
          ${t.worlds
            .map(
              ([name, line], i) =>
                `<li class="world"><span class="world__n" aria-hidden="true">${i + 1}</span><span class="world__text"><b>${esc(name)}</b>${line ? `<small>${esc(line)}</small>` : ''}</span></li>`,
            )
            .join('\n          ')}
        </ol>
      </div>
    </section>

    <section class="section dsection" id="mehr" aria-labelledby="more-title">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow">${esc(ui.moreEyebrow)}</p>
          <h2 id="more-title">${esc(ui.moreTitle)}</h2>
        </div>
        <ul class="hero__games more-games">
          ${others
            .map(
              (g) =>
                `<li><a class="chip" href="${w.siteHome}${g.id}/"><img src="${root}assets/img/${g.id}-icon-192.webp" width="40" height="40" alt=""><span>${esc(g[lang].name)}<small>${esc(g[lang].genre)}</small></span></a></li>`,
            )
            .join('\n          ')}
        </ul>
      </div>
    </section>
  </main>

  ${footer(ui, w, lang)}
</body>
</html>
`;
}

/** Checks a page's files exist before writing it, so a missing image fails here and not on the site. */
function check(game) {
  const need = [`assets/img/${game.id}-icon-192.webp`];
  for (const lang of ['de', 'en']) {
    if (game.media.video) need.push(`assets/video/${game.id}-promo-${lang}.mp4`, `assets/video/${game.id}-promo-${lang}.jpg`);
    if (game.media.og) need.push(`assets/img/${game.id}-og-${lang}.jpg`);
    if (game.media.phones) for (const p of game.media.phones) for (const s of [320, 640]) need.push(`assets/img/${game.id}-${p}-${lang}-${s}.webp`);
    if (game.media.gallery) {
      if (game[lang].gallery.length !== game.media.gallery) throw new Error(`${game.id}/${lang}: ${game[lang].gallery.length} gallery texts for ${game.media.gallery} pictures`);
      for (let i = 1; i <= game.media.gallery; i++) for (const s of [360, 720]) need.push(`assets/img/${game.id}-shot-${lang}-${i}-${s}.webp`);
    }
  }
  if (game.flair) need.push(`assets/css/flair-${game.flair}.css`, `assets/js/flair-${game.flair}.js`);
  const missing = need.filter((f) => !existsSync(join(SITE, f)));
  if (missing.length) throw new Error(`${game.id}: missing ${missing.join(', ')}`);
}

for (const game of games) {
  check(game);
  for (const lang of ['de', 'en']) {
    const file = join(SITE, where(game, lang).path, 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page(game, lang));
  }
  console.log(`${game.id}: /${game.id}/ and /en/${game.id}/`);
}

// The sitemap lists the home pages, the legal pages and every game page in both languages.
const today = new Date().toISOString().slice(0, 10);
const pair = (de, en) =>
  [de, en]
    .map(
      (loc) => `  <url>
    <loc>${ORIGIN}/${loc}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="de" href="${ORIGIN}/${de}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/${en}"/>
  </url>`,
    )
    .join('\n');
const single = (loc) => `  <url>
    <loc>${ORIGIN}/${loc}</loc>
    <lastmod>${today}</lastmod>
  </url>`;
writeFileSync(
  join(SITE, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pair('', 'en/')}
${games.map((g) => pair(`${g.id}/`, `en/${g.id}/`)).join('\n')}
${['privacy.html', 'impressum.html', 'credits.html'].map(single).join('\n')}
</urlset>
`,
);
console.log('sitemap.xml');
