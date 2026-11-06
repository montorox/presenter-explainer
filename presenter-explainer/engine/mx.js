/* Presenter Explainer runtime: presenter puppet, captions, wipes, motion vocabulary. Deterministic: every frame is a function of time. */
(function () {
  const D = window.MX_DATA;              // {plan, words, mouth, fps, duration, rig, chunk, W, H}
  const MX = window.MX = { cues: [], custom: window.MX && window.MX.custom || {}, D };
  const W = D.W, H = D.H, SHORT = H > W;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  MX.el = el; MX.$ = $;
  const tl = MX.tl = gsap.timeline({ paused: true });
  const inChunk = MX.inChunk = (a, b) => !D.chunk || (b >= D.chunk.a - 1.5 && a <= D.chunk.b + 1.5);

  // ---- seeded random
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  MX.rng = rng;

  // ---- themes. A video has one style; a scene may switch theme (paper to night on a turn in the story).
  MX.THEMES = { paper: { ink: '#1E1C1A', key: '#D7372C', light: '#B5AFA7' }, night: { ink: '#F2F4FA', key: '#5AA2FF', light: '#59627a' }, soft: { ink: '#2A2420', key: '#E0602F', keyText: '#fff', light: '#BBAA9B' }, studio: { ink: '#15171C', key: '#2E7BF6', light: '#A3ACB7' }, studioDark: { ink: '#F4F6FA', key: '#5AA2FF', light: '#62676F' } };
  MX.style = D.plan.style || 'paper';
  MX.themeAt = t => { let th = MX.style; for (const s of D.plan.scenes) { if (s.t0 == null || s.t0 > t + .001) break; if (s.theme) th = s.theme; } return th; };

  // ---- word anchors. Every timing starts on a real word.
  const norm = s => s.toLowerCase().trim().split(/\s+/).map(x => x.replace(/[^a-z0-9']/g, '')).filter(Boolean);
  const WN = D.words.map(w => norm(w.w)[0] || '');
  MX.wordAt = function (phrase, from = 0, strict = true) {
    if (typeof phrase === 'number') return phrase;
    const m = String(phrase).match(/^(.*?)(?:@([+-]?[\d.]+))?$/); const q = norm(m[1]); const off = m[2] ? parseFloat(m[2]) : 0;
    for (let i = 0; i <= WN.length - q.length; i++) {
      if (D.words[i].s < from - 0.01) continue;
      if (q.every((x, k) => WN[i + k] === x)) return D.words[i].s + off;
    }
    if (strict) { MX.errors = MX.errors || []; MX.errors.push(`anchor not found after ${from.toFixed(2)}s: "${phrase}"`); }
    return from;
  };
  MX.cue = (name, t, gain) => { MX.cues.push({ name, t: +t.toFixed(3), gain: gain == null ? 1 : gain }); };

  // ---- text rules: no full stops on screen
  MX.clean = s => String(s).replace(/\.(?=\s|$)/g, '').trim();

  // ---- font fit
  const cv = document.createElement('canvas').getContext('2d');
  MX.fit = function (text, family, max, width, weight = '400') {
    cv.font = `${weight} ${max}px ${family}`; const w = cv.measureText(text).width;
    return w <= width ? max : Math.floor(max * width / w);
  };

  // ---- motion vocabulary
  const M = MX.M = {
    pop: (e, t) => { tl.fromTo(e, { scale: .55, opacity: 0 }, { scale: 1, opacity: 1, duration: .34, ease: 'back.out(2.2)' }, t); },
    rise: (e, t) => { tl.fromTo(e, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: .4, ease: 'power3.out' }, t); },
    exit: (e, t) => { tl.to(e, { y: -50, opacity: 0, duration: .22, ease: 'power2.in' }, t); },
    slam: (e, t) => { tl.fromTo(e, { scale: 1.22, opacity: 0 }, { scale: 1, opacity: 1, duration: .24, ease: 'power4.out' }, t); },
    stamp: (e, t) => { tl.fromTo(e, { scale: 1.75, rotation: -18, opacity: 0 }, { scale: 1, rotation: -6, opacity: 1, duration: .2, ease: 'power3.in' }, t); MX.cue('thud', t + .2); },
    spin: (e, t) => { tl.fromTo(e, { scale: 0, rotation: -200, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: .42, ease: 'back.out(1.8)' }, t); MX.cue('pop', t + .1, .8); },
    draw: (p, t, d = .35) => { const L = p.getTotalLength(); gsap.set(p, { opacity: 0, strokeDasharray: L, strokeDashoffset: L }); tl.set(p, { opacity: 1 }, t); tl.to(p, { strokeDashoffset: 0, duration: d, ease: 'power2.out' }, t); },
    count: (node, to, t, d = 1.15, fmt = v => Math.round(v).toLocaleString('en-US')) => {
      const o = { _v: 0 }; let last = null;
      const p = { get v() { return o._v; }, set v(x) { o._v = x; const s = fmt(x); if (s !== last) { node.firstChild.nodeValue = s; last = s; } } };
      node.firstChild.nodeValue = fmt(0);
      tl.to(p, { v: to, duration: d, ease: 'power2.out' }, t); MX.cue('tickroll', t, 1);
    },
    type: (node, text, t, d = .85) => {
      const caret = el('span', 'caret'); node.textContent = ''; const tn = document.createTextNode(''); node.append(tn, caret); let last = -1;
      const o = { _v: 0 }, p = { get v() { return o._v; }, set v(x) { o._v = x; const n = Math.round(x * text.length); if (n !== last) { tn.nodeValue = text.slice(0, n); last = n; } } };
      tl.to(p, { v: 1, duration: Math.min(d, .9), ease: 'none' }, t); MX.cue('typing', t, 1);
    },
    idle: (e, t0, t1, seed = 1, amp = 2.2) => {           // never hold still for over a second
      const dur = Math.max(t1 - t0, .01), o = { _v: 0 }, ph = seed * 2.1;
      const p = { get v() { return o._v; }, set v(x) { o._v = x; const T = t0 + x * dur; gsap.set(e, { rotation: amp * .28 * Math.sin(T * 1.1 + ph), yPercent: 0, y: amp * Math.sin(T * 1.6 + ph) }); } };
      tl.to(p, { v: 1, duration: dur, ease: 'none' }, t0);
    },
  };

  // ---- paint-free halftone wipe on one canvas: 13x23 dots up to 62px, centre out, 0.9 s
  const wipeC = MX.wipeCanvas = (() => { const c = el('canvas'); c.id = 'wipe'; c.width = W; c.height = H; return c; })();
  const wctx = wipeC.getContext('2d');
  const cols = SHORT ? 13 : 23, rows = SHORT ? 23 : 13, R = 62 * (SHORT ? 1 : 1);
  MX.wipe = function (t, kind = 'dots') {
    MX.cue('wipe', t + .05);
    const o = { _v: 0 }; const cx = (cols - 1) / 2, cy = (rows - 1) / 2, maxd = Math.hypot(cx, cy), gx = W / cols, gy = H / rows;
    const p = { get v() { return o._v; }, set v(x) {
      o._v = x; wctx.clearRect(0, 0, W, H); if (x <= 0 || x >= 1) return; wctx.fillStyle = '#1E1C1A';
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const d = Math.hypot(i - cx, j - cy) / maxd, on = Math.min(1, Math.max(0, (x - d * .22) / .34)), off = Math.min(1, Math.max(0, (x - .5 - d * .22) / .28));
        const r = R * (on * on * (3 - 2 * on)) * (1 - off * off * (3 - 2 * off)); if (r < .4) continue;
        wctx.beginPath(); wctx.arc(gx * (i + .5), gy * (j + .5), r, 0, 6.2832); wctx.fill();
      }
    } };
    tl.fromTo(p, { v: 0 }, { v: 1, duration: .9, ease: 'none', immediateRender: false }, t);
  };

  // ---- presenter
  const rig = D.rig, pres = el('div'), head = el('div'), hands = el('div'); pres.id = 'pres'; head.id = 'head'; hands.id = 'hands';
  const src = n => `presenter/${n}.${rig.ext || 'png'}`;
  const body = new Image(); body.src = src('body'); const headImg = new Image(); headImg.src = src('head');
  const size = (i, x, y, w, h) => { i.style.cssText += `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`; };
  size(body, 0, 0, rig.w, rig.h); size(headImg, 0, 0, rig.w, rig.h); const lean = el('div'); lean.style.cssText = `position:absolute;left:0;top:0;width:${rig.w}px;height:${rig.h}px;transform-origin:${rig.pivot[0]}px ${rig.h}px`; pres.append(lean); lean.append(body, head); head.append(headImg);
  const [mx, my, mw, mh] = rig.mouthRect, [ex, ey, ew, eh] = rig.eyeRect;
  const mouths = []; for (let i = 0; i < rig.mouths; i++) { const m = new Image(); m.src = src('m' + String(i).padStart(2, '0')); m.className = 'sprite'; size(m, mx, my, mw, mh); head.append(m); mouths.push(m); }
  const eyes = {}; for (const n of rig.eyes) { const m = new Image(); m.src = src(n); m.className = 'sprite'; size(m, ex, ey, ew, eh); head.append(m); eyes[n] = m; }
  // drawn expressions: eyes and brows only, on top of the normal ones. The mouth underneath keeps talking
  const xSprites = {}; if (rig.expressions) { const [xx, xy, xw, xh] = rig.expressions.rect; for (const n of rig.expressions.names) { const m = new Image(); m.src = src('x_' + n); m.className = 'sprite'; size(m, xx, xy, xw, xh); m.style.visibility = 'visible'; m.style.opacity = 0; head.append(m); xSprites[n] = m; } }
  const faces = MX.faces = []; MX.face = (name, t, d = 1.3) => { if (!xSprites[name]) return; faces.push({ name, t, d }); };
  const [pvx, pvy] = rig.pivot; head.style.transformOrigin = `${pvx}px ${pvy}px`; pres.style.transformOrigin = '0 0';
  const tune = rig.layout && rig.layout[SHORT ? 'short' : 'long'] || {};

  // where the presenter stands. Keeps head top + face size per rig, then guarantees the figure reaches the frame bottom.
  function place(mode) {
    const f = rig.face, P = { ...tune };
    if (mode === 'corner' && MX.style === 'soft') mode = 'mini';
    if (mode === 'corner' && MX.style === 'studio') mode = 'center';
    if (mode === 'host') { P.fw *= SHORT ? 2.1 : 1.9; P.top = SHORT ? 800 : 170; P.cx = SHORT ? 540 : 1420; }
    if (mode === 'center') { P.fw *= SHORT ? 1.4 : 1.25; P.top = SHORT ? 1255 : 400; P.cx = SHORT ? 540 : 1590; }
    if (mode === 'left') { P.cx = SHORT ? 265 : 240; }
    if (mode === 'mini') { const m = P.fw * (SHORT ? .6 : .55) / f.width; return { x: (SHORT ? 945 : 1810) - f.cx * m, y: H + 14 - rig.h * m, scale: m }; }
    let s = P.fw / f.width; const headTop = f.top - f.width * .32;
    let y = P.top - headTop * s; if (y + rig.h * s < H + 30 && mode !== 'mini') { s = (H + 30 - P.top) / (rig.h - headTop); y = P.top - headTop * s; }
    let x = P.cx - f.cx * s;
    if (mode === 'off') y = H + 60;
    return { x, y, scale: s };
  }
  MX.place = place;
  gsap.set(pres, place('corner'));

  const seedRng = rng(D.seed || 7), blinks = []; { let t = .7 + seedRng() * 1.5; while (t < D.duration + 5) { blinks.push(t); t += 2.4 + seedRng() * 1.8; } }
  const fps = D.fps, keyT = D.words.filter(w => w.key).map(w => w.s);
  const gestures = MX.gestures = [];
  MX.gesture = (kind, t, d = 1.7) => { if (!gestures.some(g => Math.abs(g.t - t) < 1.2)) gestures.push({ kind, t, d }); };
  // x,y in face widths from the face centre. Index 0 is the viewer's left arm.
  const POSES = MX.POSES = {
    point: { lean: -1, hands: [{ img: 'point', x: -1.3, y: -.3, rot: -12 }] },
    pointdown: { lean: -1, hands: [{ img: 'point', x: -1.2, y: .25, rot: -32 }] },
    palm: { lean: -1, hands: [{ img: 'palm', x: -1.25, y: .15, rot: -14 }] },
    both: { hands: [{ img: 'palm', x: -1.25, y: .05, rot: -16 }, { img: 'palm', x: 1.25, y: .05, rot: 16, flip: true }] },
    shrug: { hands: [{ img: 'palm', x: -1.35, y: .55, rot: -38 }, { img: 'palm', x: 1.35, y: .55, rot: 38, flip: true }] },
    stop: { hands: [{ img: 'palm', x: -.2, y: .95, rot: -4, wob: 1 }] },
    mouth: { hands: [{ img: 'palm', x: -.08, y: .62, rot: 6, wob: 1 }] },
    eyes: { hands: [{ img: 'palm', x: -.32, y: -.02, rot: 8, wob: 1 }, { img: 'palm', x: .32, y: -.02, rot: -8, flip: true, wob: 1 }] },
    think: { hands: [{ img: 'point', x: -.42, y: .72, rot: -28, wob: 1 }] },
    yes: { hands: [{ img: 'point', x: 1.25, y: -.2, rot: 12, flip: true }] },
  };
  // a rig with drawn arm poses swaps the whole body for the pose; the head stays live on top
  const gBodies = {}; if (rig.gestures) { const gp = rig.gestures.pad; new Set(Object.values(rig.gestures.map)).forEach(n => { const i = new Image(); i.src = src('g_' + n); size(i, -gp, 0, rig.w + 2 * gp, rig.h); i.style.opacity = 0; lean.insertBefore(i, head); gBodies[n] = i; }); }
  const handEls = {}; const armEls = [];
  function makeHand(kind) { const i = new Image(); i.src = `presenter/hand_${kind}.svg`; i.style.visibility = 'hidden'; size(i, 0, 0, 420, 760); hands.append(i); return i; }
  for (let n = 0; n < 2; n++) armEls.push({ point: makeHand('point'), palm: makeHand('palm') });
  const ease = x => x * x * (3 - 2 * x);
  let curM = 0, curE = null;

  MX.pose = function (t) {
    // mouth
    const fi = Math.min(D.mouth.length - 1, Math.max(0, rig.drawnMouths ? Math.round(t * fps / 2) * 2 : Math.round(t * fps))), m = D.mouth[fi] || 0;
    if (m !== curM) { if (curM > 0 || curM === 0) mouths[curM].style.visibility = 'hidden'; if (m > 0) mouths[m].style.visibility = 'visible'; curM = m; }
    // eyes: blink for 0.14 s on a fixed seed, brows lift on key words
    let closure = 'open'; for (const b of blinks) { if (b > t) break; const d = t - b; if (d < .14) { closure = d < .035 || d > .105 ? 'half' : 'shut'; } }
    let nod = 0, up = false; for (const k of keyT) { if (k > t) break; const d = t - k; if (d < .5) { nod = Math.sin(d / .5 * Math.PI); up = d < .36; } }
    const name = closure === 'open' && !up ? null : `e_${closure}_${up ? 'up' : 'n'}`;
    if (name !== curE) { if (curE) eyes[curE].style.visibility = 'hidden'; if (name) eyes[name].style.visibility = 'visible'; curE = name; }
    { const f = faces.find(f => t >= f.t - .08 && t < f.t + f.d); for (const n in xSprites) { const on = f && f.name === n ? Math.min(1, (t - f.t + .08) / .1) * Math.min(1, (f.t + f.d - t) / .14) : 0; xSprites[n].style.opacity = on; } }
    // head: always a little sway, nod on key words, small bob with the voice
    const open = [0, 0, .12, .26, .42, .62, .82, .16, .32, .22, .48][m] || 0;
    const rot = 1.25 * Math.sin(t * .93) + .55 * Math.sin(t * 2.1 + 1) + (D.lean || 0);
    const hy = nod * rig.face.width * .028 + open * rig.face.width * .012, hx = rig.face.width * .012 * Math.sin(t * .61);
    gsap.set(head, { x: hx, y: hy, rotation: rot, scaleY: 1 - nod * .012 });
    gsap.set(body, { y: rig.face.width * .004 * Math.sin(t * 1.5), x: hx * .3 });
    // poses: two arms raised from below and placed around the face, plus a lean. A pose lasts its d, default 1.7 s
    const g = gestures.find(g => t >= g.t && t < g.t + g.d);
    const u = g ? t - g.t : 0, k = g ? ease(Math.min(1, u / .26)) * (1 - ease(Math.max(0, (u - g.d + .26) / .26))) : 0;
    const dir = g && POSES[g.kind] ? (POSES[g.kind].lean || 0) : 0;
    gsap.set(lean, { rotation: dir * 1.6 * k, x: dir * rig.face.width * .05 * k });
    let want = g && POSES[g.kind] ? POSES[g.kind].hands : [];
    // drawn poses cut from one to the next, as hand-drawn animation does (a fade shows both bodies at once), then settle
    if (rig.gestures) {
      const cur = g && rig.gestures.map[g.kind]; let since = g ? u : 9; if (!g) for (const o of gestures) { const e = o.t + o.d; if (e <= t && t - e < since) since = t - e; }
      const pop = since < .16 ? (1 - since / .16) ** 2 * rig.face.width * .045 : 0, sway = rig.face.width * .004 * Math.sin(t * 1.5);
      for (const n in gBodies) { const on = n === cur; gBodies[n].style.opacity = on ? 1 : 0; if (on) gsap.set(gBodies[n], { y: pop + sway, x: hx * .3 }); }
      body.style.opacity = cur ? 0 : 1; if (!cur) gsap.set(body, { y: pop + sway, x: hx * .3 }); want = [];
    }
    const px = gsap.getProperty(pres, 'x'), py = gsap.getProperty(pres, 'y'), ps = gsap.getProperty(pres, 'scale'), fwS = rig.face.width * ps, hs = (rig.handScale || 1) * fwS / 250;
    armEls.forEach((arm, i) => {
      const h = want[i]; const vis = !!h && k > .001;
      for (const kk of ['point', 'palm']) arm[kk].style.visibility = vis && h.img === kk ? 'visible' : 'hidden';
      if (!vis) return;
      const im = arm[h.img], cx = px + rig.face.cx * ps + h.x * fwS, cy = py + (rig.face.top + rig.face.width * .4) * ps + h.y * fwS;
      const wob = (h.wob == null ? 3 : h.wob) * Math.sin(u * 6.5 + i) * k;
      gsap.set(im, { x: cx - 210, y: (cy - 160 * hs) * k + (H + 40) * (1 - k), scale: hs, scaleX: hs * (h.flip ? -1 : 1), rotation: (h.rot || 0) + wob, transformOrigin: '50% 21%' });
    });
    if (MX.hudEl) { const th = MX.themeAt(t); if (th !== MX.hudTh) { MX.hudEl.className = 'k-hud theme-' + th; MX.hudTh = th; } }
  };

  // ---- captions: each word appears in grey on the frame it is spoken and turns ink in 0.2 s. One key word per line, serif red.
  function pages() {
    const out = []; let cur = [], max = D.plan.captionWords || (SHORT ? 9 : 14);
    D.words.forEach((w, i) => {
      cur.push(i); const end = /[.!?]$/.test(w.w), comma = /[,;:]$/.test(w.w), next = D.words[i + 1];
      const gap = next ? next.s - w.e : 9;
      if (end || cur.length >= max || (comma && cur.length >= 5) || gap > .55) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur); return out;
  }
  MX.buildCaptions = function (layer) {
    if (D.plan.captions === false) return;
    const ps = pages();
    ps.forEach((idx, n) => {
      const a = D.words[idx[0]].s, nextS = ps[n + 1] ? D.words[ps[n + 1][0]].s : D.duration, b = Math.min(D.words[idx[idx.length - 1]].e + .55, nextS);
      if (!inChunk(a, b)) return;
      const p = el('div', 'page'); let hasKey = false;
      idx.forEach(i => {
        const w = D.words[i], s = el('span', 'w' + (w.key && !hasKey ? ' key' : ''), MX.clean(w.w).replace(/&/g, '&amp;').replace(/</g, '&lt;'));
        if (w.key) hasKey = true;
        p.append(s, document.createTextNode(' '));
        const T = MX.THEMES[MX.themeAt(w.s)], isKey = s.classList.contains('key'), col = isKey ? (T.keyText || T.key) : T.ink;
        gsap.set(s, { color: T.light, opacity: 0 }); tl.set(s, { opacity: 1 }, w.s); tl.to(s, { color: col, duration: .2, ease: 'none' }, w.s);
      });
      layer.append(p); tl.set(p, { visibility: 'visible' }, a); tl.set(p, { visibility: 'hidden' }, b);
    });
  };

  MX.mount = function () {
    const presLayer = $('#presenter'); presLayer.append(pres, hands);
    $('#wipes').append(wipeC);
  };
  MX.finish = function () {
    gestures.sort((a, b) => a.t - b.t); gestures.forEach((g, i) => { const n = gestures[i + 1]; if (n && g.t + g.d > n.t) g.d = Math.max(n.t - g.t, .6); });
    const dur = D.duration, o = { _v: 0 };
    const p = { get v() { return o._v; }, set v(x) { o._v = x; MX.pose(x); } };
    tl.fromTo(p, { v: 0 }, { v: dur, duration: dur, ease: 'none', immediateRender: false }, 0);
    MX.pose(0);
    window.__timelines = window.__timelines || {}; window.__timelines.main = tl;
  };
})();
