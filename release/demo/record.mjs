// Records the main-flow demo: Vietnamese TTS narration per scene (macOS `say`), browser frames via
// CDP screencast (only the web app viewport, no browser chrome), then muxes video + voice + subtitles
// with ffmpeg. Usage (QA stack running, see README.md): node record.mjs [--base http://localhost:5174]
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '../qa/node_modules/@playwright/test/index.mjs';
import { scenes } from './scenes.mjs';

const HERE = import.meta.dirname;
const OUT = path.join(HERE, 'output');
const WORK = path.join(OUT, 'work');
const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 'http://localhost:5174';
const VOICE = process.env.DEMO_VOICE ?? 'Linh';
const RATE = process.env.DEMO_RATE ?? '175';
const VIEWPORT = { width: 1600, height: 900 };
const SCALE = 1.2; // 1600x900 CSS px -> 1920x1080 frames
const TAIL_PAD = 0.7; // seconds of air after each narration

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const duration = (file) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]));

// ---- 1. narration -------------------------------------------------------------------------------
rmSync(WORK, { recursive: true, force: true });
mkdirSync(path.join(WORK, 'frames'), { recursive: true });
for (const scene of scenes) {
  scene.audio = path.join(WORK, `${scene.id}.aiff`);
  run('say', ['-v', VOICE, '-r', RATE, '-o', scene.audio, scene.speak ?? scene.caption]);
  scene.audioDuration = duration(scene.audio);
}
console.log(`narration: ${scenes.reduce((s, x) => s + x.audioDuration, 0).toFixed(1)}s over ${scenes.length} scenes`);

// ---- 2. browser + fake cursor ---------------------------------------------------------------------
const CURSOR = `(() => {
  const KEY = '__demo_cursor_pos';
  const arrow = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M4 2 L4 22 L9.5 17 L13 25.5 L16.5 24 L13 15.8 L20.5 15.8 Z" fill="white" stroke="black" stroke-width="1.6" stroke-linejoin="round"/></svg>');
  const install = () => {
    if (document.getElementById('__demo_cursor')) return;
    const c = document.createElement('div');
    c.id = '__demo_cursor';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', width: '28px', height: '28px', zIndex: 2147483647,
      pointerEvents: 'none', background: 'url("' + arrow + '") no-repeat', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))' });
    document.documentElement.appendChild(c);
    const place = (x, y) => { c.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 2) + 'px)'; };
    try { const p = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (p) place(p.x, p.y); else place(-40, -40); } catch { place(-40, -40); }
    document.addEventListener('mousemove', (e) => { place(e.clientX, e.clientY);
      try { sessionStorage.setItem(KEY, JSON.stringify({ x: e.clientX, y: e.clientY })); } catch {} }, true);
    document.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      Object.assign(r.style, { position: 'fixed', left: e.clientX - 18 + 'px', top: e.clientY - 18 + 'px', width: '36px', height: '36px',
        borderRadius: '50%', border: '3px solid rgba(37,99,235,.85)', background: 'rgba(37,99,235,.18)', zIndex: 2147483646,
        pointerEvents: 'none', transition: 'transform .45s ease-out, opacity .45s ease-out', transform: 'scale(.4)', opacity: '1' });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.4)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 500);
    }, true);
  };
  if (document.documentElement) install(); else document.addEventListener('DOMContentLoaded', install);
})();`;

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({
  baseURL: BASE,
  viewport: VIEWPORT,
  deviceScaleFactor: SCALE,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  acceptDownloads: true,
});
await context.addInitScript(CURSOR);
const page = await context.newPage();

// ---- 3. CDP screencast recorder (frames carry wall-clock timestamps) -------------------------------
const frames = [];
let frameNo = 0;
let active = null;
const recorder = {
  async follow(target) {
    if (active) await active.cdp.send('Page.stopScreencast').catch(() => {});
    const cdp = await context.newCDPSession(target);
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const file = path.join(WORK, 'frames', `f${String(frameNo++).padStart(6, '0')}.jpg`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      frames.push({ t: metadata.timestamp, file });
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: Math.round(VIEWPORT.width * SCALE),
      maxHeight: Math.round(VIEWPORT.height * SCALE),
    });
    active = { cdp, target };
  },
  async stop() {
    if (active) await active.cdp.send('Page.stopScreencast').catch(() => {});
  },
};

// ---- 4. human-paced UI helpers ----------------------------------------------------------------------
const ui = {
  pause: (ms) => page.waitForTimeout(ms),
  async pointAt(locator) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) return;
    const owner = locator.page();
    await owner.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 18), { steps: 28 });
    await owner.waitForTimeout(220);
  },
  async hover(locator) {
    await ui.pointAt(locator);
    await locator.page().waitForTimeout(300);
  },
  async click(locator) {
    await ui.pointAt(locator);
    await locator.click();
    await locator.page().waitForTimeout(450);
  },
  async type(locator, text, delay = 70) {
    await ui.click(locator);
    await locator.pressSequentially(text, { delay });
    await locator.page().waitForTimeout(250);
  },
  async scrollTo(locator) {
    await locator.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await page.waitForTimeout(900);
  },
  async scrollTop() {
    await page.evaluate(() => {
      document.querySelectorAll('*').forEach((el) => {
        if (el.scrollTop > 0) el.scrollTo({ top: 0, behavior: 'smooth' });
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await page.waitForTimeout(900);
  },
};

// ---- 5. play the scenes, each at least as long as its narration -----------------------------------
await page.goto('/login');
await page.waitForLoadState('networkidle');
await page.mouse.move(VIEWPORT.width * 0.62, VIEWPORT.height * 0.55);
await recorder.follow(page);
await page.waitForTimeout(600);
const videoStart = Date.now() / 1000;
for (const scene of scenes) {
  scene.start = Date.now() / 1000 - videoStart;
  process.stdout.write(`${scene.id} … `);
  await scene.run({ page, ui, recorder });
  const minEnd = scene.start + scene.audioDuration + TAIL_PAD;
  const now = Date.now() / 1000 - videoStart;
  if (now < minEnd) await page.waitForTimeout((minEnd - now) * 1000);
  scene.end = Date.now() / 1000 - videoStart;
  console.log(`${(scene.end - scene.start).toFixed(1)}s (voice ${scene.audioDuration.toFixed(1)}s)`);
}
await page.waitForTimeout(1200);
const videoEnd = Date.now() / 1000;
await recorder.stop();
await browser.close();

// ---- 6. video track: frames at their real timestamps -------------------------------------------------
const kept = frames.filter((f) => f.t >= videoStart - 0.05).sort((a, b) => a.t - b.t);
const before = frames.filter((f) => f.t < videoStart).pop();
if (before) kept.unshift({ ...before, t: videoStart });
const lines = ['ffconcat version 1.0'];
kept.forEach((f, i) => {
  const next = i + 1 < kept.length ? kept[i + 1].t : videoEnd;
  lines.push(`file '${f.file}'`, `duration ${Math.max(next - Math.max(f.t, videoStart), 0.001).toFixed(4)}`);
});
lines.push(`file '${kept[kept.length - 1].file}'`);
writeFileSync(path.join(WORK, 'frames.ffconcat'), lines.join('\n'));
const silentVideo = path.join(WORK, 'video.mp4');
run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'frames.ffconcat'),
  '-vf', 'scale=1920:1080:flags=lanczos,format=yuv420p', '-fps_mode', 'cfr', '-r', '30',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', silentVideo]);

// ---- 7. voice track: each narration placed at its scene start, loudness-normalised ----------------
const total = videoEnd - videoStart;
const inputs = scenes.flatMap((s) => ['-i', s.audio]);
const delays = scenes.map((s, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(s.start * 1000)}:all=1[a${i}]`);
const mix = `${scenes.map((_, i) => `[a${i}]`).join('')}amix=inputs=${scenes.length}:normalize=0:dropout_transition=0,` +
  `highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-1.5:LRA=7,apad,atrim=0:${total.toFixed(3)}[voice]`;
const voice = path.join(WORK, 'voice.m4a');
run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', [...delays, mix].join(';'), '-map', '[voice]',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', voice]);

// ---- 8. subtitles (sentence-level, timed within each narration) -----------------------------------
const stamp = (sec) => {
  const ms = Math.max(0, Math.round(sec * 1000));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
// Sentences first (a '.' inside "91/2025/QH15" or a number does not end one), then long sentences
// at commas, so no cue stays on screen for more than a few seconds.
const MAX_CUE_CHARS = 84;
function splitCaption(text) {
  const sentences = text.match(/[^.:!?]+(?:[.:!?](?=\s|$)|$)/g).map((s) => s.trim()).filter(Boolean);
  const cuesOut = [];
  for (const sentence of sentences) {
    let current = '';
    for (const clause of sentence.split(/(?<=,)\s+/)) {
      if (current && (current + ' ' + clause).length > MAX_CUE_CHARS) {
        cuesOut.push(current);
        current = clause;
      } else {
        current = current ? `${current} ${clause}` : clause;
      }
    }
    if (current) cuesOut.push(current);
  }
  return cuesOut;
}
const cues = [];
for (const scene of scenes) {
  const parts = splitCaption(scene.caption);
  const chars = parts.reduce((n, s) => n + s.length, 0);
  let t = scene.start;
  for (const part of parts) {
    const d = (scene.audioDuration * part.length) / chars;
    cues.push({ from: t, to: t + d, text: part });
    t += d;
  }
}
const srt = cues.map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}\n`).join('\n');
const srtFile = path.join(OUT, 'piiguard-demo.vi.srt');
writeFileSync(srtFile, srt);

// ---- 9. final mux: H.264 1080p30 + AAC voice + soft Vietnamese subtitles ------------------------
const final = path.join(OUT, 'piiguard-demo.mp4');
run('ffmpeg', ['-y', '-loglevel', 'error', '-i', silentVideo, '-i', voice, '-i', srtFile,
  '-map', '0:v', '-map', '1:a', '-map', '2:s', '-c:v', 'copy', '-c:a', 'copy', '-c:s', 'mov_text',
  '-metadata:s:s:0', 'language=vie', '-metadata:s:a:0', 'language=vie', '-shortest', '-movflags', '+faststart', final]);

writeFileSync(
  path.join(OUT, 'timeline.json'),
  JSON.stringify(
    {
      total: Number(total.toFixed(2)),
      frames: kept.length,
      scenes: scenes.map(({ id, title, start, end, audioDuration }) => ({
        id, title, start: Number(start.toFixed(2)), end: Number(end.toFixed(2)), voice: Number(audioDuration.toFixed(2)),
      })),
    },
    null,
    2,
  ),
);
console.log(`\nvideo: ${final} (${total.toFixed(1)}s, ${kept.length} frames)\nsubtitles: ${srtFile}`);
