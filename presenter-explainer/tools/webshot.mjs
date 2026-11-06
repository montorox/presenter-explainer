#!/usr/bin/env node
/* Capture real web pages for the `webpage` prop.   node webshot.mjs projects/<slug> [--only id,id]
   Reads projects/<slug>/pages.json: [{id, url, top?, dark?, width?, scale?, marks:{key:"exact text on the page" | {css:"selector"}}}]
   Writes projects/<slug>/pages/<id>.jpg (2x) and pages.data.json: {id:{url,w,h,marks:{key:[{x,y,w,h},...]}}} in page px.
   Fails loudly when a phrase is not on the page, so a highlight can never point at something the page does not say. */
import fs from 'fs'; import path from 'path'; import os from 'os'; import { createRequire } from 'module';
const P = path.resolve(process.argv[2]), STUDIO = path.join(os.homedir(), 'PresenterStudio');
const puppeteer = createRequire(path.join(STUDIO, 'package.json'))('puppeteer-core');
const a = process.argv, only = a.includes('--only') ? a[a.indexOf('--only') + 1].split(',') : null;
const spec = JSON.parse(fs.readFileSync(path.join(P, 'pages.json'))), outD = path.join(P, 'pages'); fs.mkdirSync(outD, { recursive: true });
const dataF = path.join(P, 'pages.data.json'), data = fs.existsSync(dataF) ? JSON.parse(fs.readFileSync(dataF)) : {};
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars', '--disable-gpu'] });
let bad = 0;
for (const s of spec) {
  if (only && !only.includes(s.id)) continue;
  const pg = await browser.newPage(); const width = s.width || 1280;
  await pg.setViewport({ width, height: 1400, deviceScaleFactor: s.scale || 2 });
  await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: s.dark ? 'dark' : 'light' }]);
  await pg.goto(s.url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('slow load, carrying on:', s.id, e.message));
  // load lazy images, and drop anything that floats over the page
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 900));
  await pg.addStyleTag({ content: '.js-header-wrapper{position:static!important}[data-testid="sticky-header"],.sticky-file-header,.js-sticky,.flash-warn,.js-notice,cookie-consent,#ghcc{display:none!important}' });
  const res = await pg.evaluate(marks => {
    const norm = t => t.replace(/\s+/g, ' ');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const nodes = []; let text = '';
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const e = n.parentElement, st = e && getComputedStyle(e); if (!e || st.display === 'none' || st.visibility === 'hidden' || !e.getClientRects().length) continue;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(e.tagName)) continue;
      nodes.push({ n, from: text.length }); text += n.nodeValue;
    }
    // match with collapsed spaces, then map back to the raw offsets
    const map = []; let col = '', prevSp = false; for (let i = 0; i < text.length; i++) { const sp = /\s/.test(text[i]); if (sp && prevSp) continue; map.push(i); col += sp ? ' ' : text[i]; prevSp = sp; }
    const at = off => { let lo = 0, hi = nodes.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (nodes[m].from <= off) lo = m; else hi = m - 1; } return [nodes[lo].n, off - nodes[lo].from]; };
    const out = {}, miss = [];
    for (const [k, v] of Object.entries(marks || {})) {
      let rects = [];
      if (v && v.css) { const e = document.querySelector(v.css); if (e) rects = [...e.getClientRects()]; }
      else { const q = norm(v), i = col.toLowerCase().indexOf(q.toLowerCase()); if (i >= 0) { const r = document.createRange(), [a, ao] = at(map[i]), [b, bo] = at(map[i + q.length - 1]); r.setStart(a, ao); r.setEnd(b, bo + 1); rects = [...r.getClientRects()]; } }
      rects = rects.filter(r => r.width > 1 && r.height > 1).map(r => ({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }));
      // one bar per line of text
      const lines = []; rects.forEach(r => { const l = lines.find(o => Math.abs(o.y + o.h / 2 - r.y - r.h / 2) < r.h * .6); if (l) { const x2 = Math.max(l.x + l.w, r.x + r.w); l.x = Math.min(l.x, r.x); l.w = x2 - l.x; l.y = Math.min(l.y, r.y); l.h = Math.max(l.h, r.h); } else lines.push({ ...r }); });
      if (!lines.length) miss.push(k); else out[k] = lines;
    }
    return { out, miss, H: document.documentElement.scrollHeight };
  }, s.marks);
  if (res.miss.length) { console.error(`NOT ON PAGE ${s.id}: ${res.miss.map(k => `${k} = ${JSON.stringify(s.marks[k])}`).join(', ')}`); bad++; }
  const all = Object.values(res.out).flat(), lo = all.length ? Math.min(...all.map(r => r.y)) : 0, hi = all.length ? Math.max(...all.map(r => r.y + r.h)) : 1000;
  const y0 = s.top ? 0 : Math.max(0, Math.round(lo - 700)), y1 = Math.min(res.H, Math.min(y0 + 3600, Math.round(hi + 700)));
  const shifted = {}; for (const [k, v] of Object.entries(res.out)) shifted[k] = v.map(r => ({ x: +r.x.toFixed(1), y: +(r.y - y0).toFixed(1), w: +r.w.toFixed(1), h: +r.h.toFixed(1) }));
  await pg.screenshot({ path: path.join(outD, s.id + '.jpg'), type: 'jpeg', quality: 90, clip: { x: 0, y: y0, width, height: y1 - y0 }, captureBeyondViewport: true });
  data[s.id] = { url: s.url.replace(/^https?:\/\//, ''), w: width, h: y1 - y0, marks: shifted };
  console.log(`${s.id}: ${width}x${y1 - y0}, marks ${Object.keys(shifted).join(', ') || 'none'}`);
  await pg.close();
}
await browser.close(); fs.writeFileSync(dataF, JSON.stringify(data, null, 1)); if (bad) process.exit(1);
