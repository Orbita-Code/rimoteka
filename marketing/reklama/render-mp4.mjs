import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PUTANJA = 'file:///Users/jovana.jovic/Projects/rimoteka/marketing/reklama/rimoteka-reklama.html';
const IZLAZ = '/Users/jovana.jovic/Projects/rimoteka/marketing/reklama';
const FPS = 30, TRAJANJE = 11;
const FORMATI = [
  ['9x16', 540, 960],
  ['1x1', 540, 540],
  ['16x9', 960, 540],
];

const b = await chromium.launch();
for (const [ime, w, h] of FORMATI) {
  const dir = `/tmp/frames-${ime}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
  await p.goto(PUTANJA + '?t=0');
  await p.waitForTimeout(2500); // fontovi
  const ukupno = Math.round(TRAJANJE * FPS);
  for (let i = 0; i < ukupno; i++) {
    await p.evaluate(t => crtaj(t), i / FPS);
    await p.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.png` });
    if (i % 60 === 0) console.log(`${ime}: ${i}/${ukupno}`);
  }
  execSync(`ffmpeg -y -framerate ${FPS} -i ${dir}/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart "${IZLAZ}/rimoteka-reklama-${ime}.mp4"`, { stdio: 'inherit' });
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`${ime}: gotov MP4`);
  await p.close();
}
await b.close();
console.log('SVE GOTOVO');
