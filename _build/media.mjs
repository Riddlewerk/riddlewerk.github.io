// Riddlewerk: makes a detail page's media from a game's finished marketing package.
//
//   node _build/media.mjs <id> [packageDir] [--poster <seconds>]
//
// packageDir defaults to E:/Riddlewerk/marketing/<id> (the folder with video/, google-play/ …). For
// each language it writes
//   assets/video/<id>-promo-<lang>.mp4   the 16:9 promo as a 720p H.264 with AAC, moov first (+faststart)
//   assets/video/<id>-promo-<lang>.jpg   its poster, a frame from the middle (or --poster seconds in)
//   assets/img/<id>-shot-<lang>-<n>-360.webp / -720.webp   the Play Store screenshots, framed
//   assets/img/<id>-og-<lang>.jpg        the feature graphic, as the page's share image
// and prints how many screenshots it found (media.gallery in the game's data file). ffmpeg comes
// from the marketing repo's Remotion install; WebP is encoded by headless Edge, since that ffmpeg
// has no WebP encoder.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const posterAt = args.includes('--poster') ? Number(args.splice(args.indexOf('--poster'), 2)[1]) : null;
const [id, pkg = `E:/Riddlewerk/marketing/${id}`] = args;
if (!id) throw new Error('usage: node _build/media.mjs <id> [packageDir] [--poster <seconds>]');

const BIN = 'E:/Riddlewerk/marketing/node_modules/@remotion/compositor-win32-x64-msvc';
const ffmpeg = (...a) => execFileSync(`${BIN}/ffmpeg.exe`, ['-y', '-v', 'error', ...a], { stdio: 'inherit' });
const duration = (file) =>
  Number(execFileSync(`${BIN}/ffprobe.exe`, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

const LANGS = { de: 'deutsch', en: 'english' };
mkdirSync(join(SITE, 'assets/video'), { recursive: true });

let shots = 0;
const pngs = [];
for (const [lang, folder] of Object.entries(LANGS)) {
  const promo = join(pkg, 'video', `${id}-promo-${lang}-16x9.mp4`);
  if (existsSync(promo)) {
    const out = join(SITE, 'assets/video', `${id}-promo-${lang}`);
    ffmpeg('-i', promo, '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', `${out}.mp4`);
    const at = posterAt ?? duration(promo) * 0.5;
    ffmpeg('-ss', String(at), '-i', promo, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', `${out}.jpg`);
    console.log(`${id}-promo-${lang}.mp4 + .jpg (poster at ${at.toFixed(1)} s)`);
  } else {
    console.log(`no promo for ${lang}: ${promo}`);
  }

  const feature = join(pkg, 'google-play', folder, 'feature-graphic-1024x500.png');
  if (existsSync(feature)) {
    ffmpeg('-i', feature, '-q:v', '3', join(SITE, 'assets/img', `${id}-og-${lang}.jpg`));
    console.log(`${id}-og-${lang}.jpg`);
  }

  let n = 0;
  while (existsSync(join(pkg, 'google-play', folder, `screenshot-${n + 1}.png`))) {
    n++;
    pngs.push({ file: join(pkg, 'google-play', folder, `screenshot-${n}.png`), base: `${id}-shot-${lang}-${n}` });
  }
  shots = Math.max(shots, n);
}

if (pngs.length) {
  const { chromium } = await import('file:///E:/Riddlewerk/marketing/node_modules/playwright-core/index.mjs');
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage();
  for (const { file, base } of pngs) {
    for (const w of [360, 720]) {
      const data = await page.evaluate(
        async ([b64, w]) => {
          const img = new Image();
          img.src = 'data:image/png;base64,' + b64;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = w;
          c.height = Math.round((img.height * w) / img.width);
          const g = c.getContext('2d');
          g.imageSmoothingQuality = 'high';
          g.drawImage(img, 0, 0, c.width, c.height);
          return c.toDataURL('image/webp', 0.84);
        },
        [readFileSync(file).toString('base64'), w],
      );
      writeFileSync(join(SITE, 'assets/img', `${base}-${w}.webp`), Buffer.from(data.split(',')[1], 'base64'));
    }
  }
  await browser.close();
}
console.log(`${shots} screenshots per language -> media.gallery: ${shots}`);
