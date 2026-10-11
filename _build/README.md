# Game detail pages

Every game has a page of its own, `/<id>/` in German and `/en/<id>/` in English, with the trailer,
the store pictures, how it plays, the numbers and the worlds. The pages are written by
`_build/pages.mjs` from one data file per game, `_build/games/<id>.json`. Never edit a generated
`<id>/index.html` by hand; change the data file (or the generator) and run it again:

```
node _build/pages.mjs          # all game pages + sitemap.xml
```

It refuses to write a page whose pictures, video or flair files are missing.

The site's Content-Security-Policy allows nothing inline and nothing from another host. So all CSS
goes in `assets/css/`, all JS in `assets/js/`, and media lives on this site. A game's accent colour
comes from its `.game--<id>` rule in `assets/css/site.css`. The detail page's `<body>` carries that
class, so `--accent` is the game's colour on the whole page.

## Adding a game

1. **Accent colour:** add a token pair to `:root` in `assets/css/site.css` (like `--volt` /
   `--volt-rgb`) and a `.game--<id>` rule next to `.game--strom`.
2. **Icon:** `assets/img/<id>-icon-192.webp`, the app icon at 192 × 192.
3. **Three phone pictures for the hero** (and the home card):
   `assets/img/<id>-{home,board,worlds}-{de,en}-{320,640}.webp`.
   - Screenshots of the web build at a 360 × 779 viewport and device scale 2, scaled to 320 and 640 wide.
   - `assets/img/` has examples. Encode WebP in a browser canvas, as `_build/media.mjs` does.
4. **Trailer, store pictures and share image**, from the game's finished marketing package:
   ```
   node _build/media.mjs <id> [packageDir] [--poster <seconds>]
   ```
   - It writes `assets/video/<id>-promo-<lang>.mp4` (720p H.264, about 2 MB, `+faststart`) with a `.jpg` poster.
   - It writes the Play Store screenshots as `assets/img/<id>-shot-<lang>-<n>-{360,720}.webp`, and the feature graphic as `assets/img/<id>-og-<lang>.jpg`.
   - It prints how many screenshots it found.
   - **Choosing the poster:** pick a calm frame with the game in play and the text fully faded in. The default (the middle of the video) can land on a transition. `frame-sheet`-style contact sheets help: one frame every 2 s, then pick.
5. **Data file `_build/games/<id>.json`:** copy `griff.json` and change everything.
   - `order` is the place in the footer and in "More games" (DREH 1 … STROM 5; GLEIS 6, SPIEGEL 7).
   - `media.video` / `media.og` are true when step 4 made them. `media.gallery` is the number of store pictures, with one alt text per picture in `de.gallery` / `en.gallery`. `media.phones` lists the three pictures of step 3.
   - `flair` is the game's flair id or null (see below).
   - Per language:
     - `name`, `genre`, `title` (the `<title>`), `description` (the meta description, about 150 characters)
     - `tagline`, without quotes
     - `lead`, paragraphs
     - `stats`, four `[number, label]` pairs
     - `features`
     - `stepsTitle` + `steps`, three `[head, text]` pairs
     - `worldsTitle` + `worlds`, `[name, tagline]` pairs from the game's i18n (`world.<id>`, `world.<id>.tagline`)
     - `gallery`, the alt texts: the screenshot captions work well
     - `phonesAlt`, the three alt texts
   - Every number must be true for the game as it is.
6. **Generate:** run `node _build/pages.mjs`.
7. **Home page:** make these edits in both `index.html` and `en/index.html`:
   - **Card:** copy the GRIFF card, give it `id="<id>"` and `game--<id>`, and keep the `game__more` link to `<id>/`.
   - **Hero:** add a chip to the hero chip list.
   - **Footer:** add the game to the "Spiele" / "Games" column.
   - **Texts that name every game:** the meta description, og/twitter descriptions, the hero sub line, the games section intro and the studio text.
8. **Legal pages:** `privacy.html`, `impressum.html` and `credits.html` name every app, in both languages. See how GRIFF and STROM were added in commit 69afc56.

## Flair: a game's own animation on wide screens

A game may bring a small animation of its own, like a GLEIS train crossing the screen.

**Files:** `assets/css/flair-<id>.css` and `assets/js/flair-<id>.js`.
- Set `"flair": "<id>"` in the data file. The detail page then loads both files and its `<body>` gets `data-flair="<id>"`.
- For the home page, add the same `<link>` and `<script defer>` to the `<head>` of `index.html` and `en/index.html`. There the script finds the game's card by its id.

**Rules:**
- Wide screens only (`(min-width: 900px)`), and fully off with `prefers-reduced-motion: reduce`.
- `pointer-events: none` and `aria-hidden="true"` on everything it adds.
- No layout shift: position it fixed or absolute, out of the flow.
- Never in the way of reading or clicking.
- Built from SVG/CSS made by the script. No inline styles: set classes, or set CSS custom properties through `element.style.setProperty`, which CSP allows from a script file.
- On the home page, start when the game's card scrolls into view (IntersectionObserver), at most once per page view.

## Checking and publishing

- **Lock:** two agents may work on this site at the same time. Before editing, take the lock `E:/Riddlewerk/.website-lock` atomically (`set -o noclobber; echo "<who> $(date)" > /e/Riddlewerk/.website-lock`). Wait while it exists. Delete it after the push.
- **Check locally:** serve the folder with any static server and look at DE and EN at 1440 and 390 wide in a browser.
  - No console or CSP errors.
  - No sideways scroll on the phone.
  - The video plays.
  - The gallery loads.
- **Commit:** as `Riddlewerk <340535878+Riddlewerk@users.noreply.github.com>` with `core.autocrlf false`.
- **Push:** `git push` to `origin main`. GitHub Pages deploys in a minute or two. Check the live page with curl.
