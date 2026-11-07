#!/usr/bin/env node
/* Assemble and render.   node build.mjs <project> [--check] [--still t1,t2] [--preview] [--from s --to s] [--chunk 60] [--workers 6] [--out file]
   Long videos render in chunks to the system cache folder (presenter-explainer/<project>), then join and mux with the mix. Temp is deleted after. Finished chunks are reused on a re-run. */
import fs from 'fs'; import path from 'path'; import os from 'os'; import { execFileSync, spawnSync } from 'child_process'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), SKILL = path.dirname(HERE), STUDIO = path.join(os.homedir(), 'PresenterStudio');
const args = process.argv.slice(2), P = path.resolve(args[0]); const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const slug = path.basename(P), B = path.join(P, 'build'), plan = JSON.parse(fs.readFileSync(path.join(P, 'plan.json'))); if (opt('presenter')) plan.presenter = opt('presenter');
const words = JSON.parse(fs.readFileSync(path.join(P, 'audio/words.json'))), mouth = JSON.parse(fs.readFileSync(path.join(P, 'audio/mouth.json')));
const dur = +(mouth.length / 30 + 1.2).toFixed(3), short = plan.format === 'short', W = short ? 1080 : 1920, H = short ? 1920 : 1080;
const rig = JSON.parse(fs.readFileSync(path.join(SKILL, 'presenters', plan.presenter, 'rig.json'))); const reg = JSON.parse(fs.readFileSync(path.join(SKILL, 'presenters/presenters.json'))).presenters[plan.presenter]; rig.layout = reg.layout; rig.handMode = reg.hands; rig.handScale = reg.handScale || 1; 
fs.rmSync(B, { recursive: true, force: true }); fs.mkdirSync(B, { recursive: true });
for (const f of ['mx.js', 'scenes.js', 'kit.js', 'mx.css', 'kit.css', 'paper.png']) fs.copyFileSync(path.join(SKILL, 'engine', f), path.join(B, f));
fs.cpSync(path.join(SKILL, 'engine/fonts'), path.join(B, 'fonts'), { recursive: true }); fs.cpSync(path.join(SKILL, 'engine/lib'), path.join(B, 'lib'), { recursive: true });
fs.cpSync(path.join(SKILL, 'presenters', plan.presenter), path.join(B, 'presenter'), { recursive: true });
const pagesF = path.join(P, 'pages.data.json'), pages = fs.existsSync(pagesF) ? JSON.parse(fs.readFileSync(pagesF)) : null; if (fs.existsSync(path.join(P, 'pages'))) fs.cpSync(path.join(P, 'pages'), path.join(B, 'pages'), { recursive: true });
fs.copyFileSync(fs.existsSync(path.join(P, 'demos.js')) ? path.join(P, 'demos.js') : path.join(SKILL, 'engine/demos.empty.js'), path.join(B, 'demos.js'));
fs.writeFileSync(path.join(B, 'index.html'), fs.readFileSync(path.join(SKILL, 'engine/index.template.html'), 'utf8').replaceAll('__W__', W).replaceAll('__H__', H).replaceAll('__DUR__', dur).replaceAll('__FMT__', plan.format).replaceAll('__STYLE__', plan.style || 'paper'));
fs.writeFileSync(path.join(B, 'data.js'), 'window.MX_DATA=' + JSON.stringify({ plan, words, mouth, fps: 30, duration: dur, rig, W, H, seed: plan.seed || 7, pages }) + ';');
fs.writeFileSync(path.join(B, 'chunk.js'), '');
fs.writeFileSync(path.join(B, '.hyperframesignore'), 'cues.json\n');

const hf = (...a) => spawnSync(process.execPath, [path.join(STUDIO, 'node_modules/hyperframes/bin/hyperframes.mjs'), ...a], { cwd: STUDIO, encoding: 'utf8', maxBuffer: 1 << 28 });
const chrome = hf('browser', 'path').stdout.trim().split('\n').pop().trim();
// a run with every scene built, to collect sound cues and catch bad word anchors
const dump = spawnSync(chrome, ['--headless', '--disable-gpu', '--allow-file-access-from-files', '--virtual-time-budget=8000', '--dump-dom', pathToFileURL(path.join(B, 'index.html')).href + '?cues=1'], { encoding: 'utf8', maxBuffer: 1 << 29 });
const m = dump.stdout.match(/<pre id="mxcues"[^>]*>([\s\S]*?)<\/pre>/); if (!m || !m[1]) { console.error('page did not build\n' + dump.stderr.slice(-1500)); process.exit(1); }
const { cues, errors } = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
fs.writeFileSync(path.join(B, 'cues.json'), JSON.stringify(cues)); fs.writeFileSync(path.join(P, 'cues.json'), JSON.stringify(cues, null, 0));
if (errors.length) { console.error('PLAN ERRORS:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log(`${plan.format} ${W}x${H}, ${dur}s, presenter ${plan.presenter}, ${plan.scenes.length} scenes, ${cues.length} cues`);
if (opt('prep')) process.exit(0);
if (opt('check')) { const r = hf('check', B, '--json'); let bad = 0, warn = 0; try { const d = JSON.parse(r.stdout); for (const [k, v] of Object.entries(d)) for (const f of (v && v.findings) || []) { if (f.severity === 'error') { bad++; console.log(`ERROR ${k} ${f.code} at ${f.time ?? '-'}s ${f.selector || ''}: ${String(f.message).slice(0, 160)}`); } else if (f.severity === 'warning' && f.code !== 'negative_z_index') warn++; } } catch { console.log((r.stdout || r.stderr).slice(0, 3000)); process.exit(r.status || 0); } console.log(`check: ${bad} errors, ${warn} warnings (overlap warnings are normal for collages; look at the stills)`); process.exit(bad ? 1 : 0); }
if (opt('still')) {
  const outd = path.join(P, 'stills'); fs.rmSync(outd, { recursive: true, force: true }); fs.mkdirSync(outd, { recursive: true }); const r = hf('snapshot', B, '--at', String(opt('still')));
  if (r.status) console.log(r.stdout.slice(-800), r.stderr.slice(-800));
  const sn = path.join(B, '.hyperframes/artifacts/snapshots'), latest = fs.readdirSync(sn).map(d => path.join(sn, d)).sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)[0];
  const files = fs.readdirSync(latest).filter(f => f.endsWith('.png')).sort(); files.forEach(f => fs.copyFileSync(path.join(latest, f), path.join(outd, f)));
  const cols = short ? 5 : 3; const seq = path.join(outd, '_seq'); fs.mkdirSync(seq); files.forEach((f, i) => fs.copyFileSync(path.join(outd, f), path.join(seq, String(i).padStart(3, '0') + '.png')));
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', path.join(seq, '%03d.png'), '-vf', `scale=${short ? 400 : 640}:-1,tile=${cols}x${Math.ceil(files.length / cols)}:padding=6`, '-frames:v', '1', path.join(outd, 'sheet.png')]); fs.rmSync(seq, { recursive: true, force: true });
  console.log('stills:', path.join(outd, 'sheet.png')); process.exit(0);
}
// chunks
const from = +opt('from', 0), to = +opt('to', dur), size = +opt('chunk', 60), workers = String(opt('workers', 6)), q = opt('preview') ? 'draft' : 'looks';
const cacheRoot = process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Caches') : process.platform === 'win32' ? (process.env.LOCALAPPDATA || os.tmpdir()) : path.join(os.homedir(), '.cache');
const cache = path.join(cacheRoot, 'presenter-explainer', slug + (opt('preview') ? '-p' : '')); fs.mkdirSync(cache, { recursive: true });
const spans = []; for (let a = from; a < to - .001; a += size) spans.push([+a.toFixed(3), +Math.min(a + size, to).toFixed(3)]);
const parts = []; const t00 = Date.now();
for (const [a, b] of spans) {
  const f = path.join(cache, `c_${String(a).padStart(8, '0')}_${b}.mp4`); parts.push(f);
  fs.writeFileSync(path.join(B, 'chunk.js'), `window.MX_DATA.chunk={a:${a},b:${b}};`);
  const r = spawnSync(process.execPath, [path.join(STUDIO, 'node_modules/hyperframes/bin/hyperframes.mjs'), 'render', B, '--quiet', '-o', f, '-q', q, '-w', workers, '--start', String(a), '--end', String(b)], { cwd: STUDIO, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0 || !fs.existsSync(f)) { console.error('render failed at', a, (r.stderr || r.stdout).slice(-1500)); process.exit(1); }
  console.log(`rendered ${a}-${b}s (${((Date.now() - t00) / 1000).toFixed(0)}s so far)`);
}
const list = path.join(cache, 'list.txt'); fs.writeFileSync(list, parts.map(f => `file '${f}'`).join('\n'));
const out = opt('out') ? path.resolve(opt('out')) : path.join(P, 'out', `${slug}${opt('preview') ? '_preview' : ''}.mp4`); fs.mkdirSync(path.dirname(out), { recursive: true });
const mix = path.join(P, 'audio/mix.wav'); const haveMix = fs.existsSync(mix);
const ff = ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list];
if (haveMix) ff.push('-ss', String(from), '-t', String(to - from), '-i', mix, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '256k', '-shortest'); else ff.push('-map', '0:v:0');
ff.push('-c:v', 'copy', '-movflags', '+faststart', out); execFileSync('ffmpeg', ff, { stdio: 'inherit' });
fs.rmSync(cache, { recursive: true, force: true }); fs.rmSync(path.join(STUDIO, 'renders'), { recursive: true, force: true });
const fr = spawnSync('ffmpeg', ['-hide_banner', '-i', out, '-vf', 'freezedetect=n=0.0004:d=1', '-map', '0:v:0', '-f', 'null', '-'], { encoding: 'utf8' }).stderr.match(/freeze_start: [\d.]+/g) || [];
console.log(`done ${out} (${((Date.now() - t00) / 1000).toFixed(0)}s). Still moments over 1 s: ${fr.length}`); fr.slice(0, 12).forEach(x => console.log('  ' + x));
