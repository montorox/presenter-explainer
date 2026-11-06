/* Presenter Explainer prop kit + the `stage` scene: compose any collage declaratively, every prop and action on a spoken word. */
(function () {
  const { el, M, tl, cue, clean } = MX; const D = MX.D;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const seq = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const lines = (n, w = [92, 70, 84, 60]) => seq(n, i => `<i class="ln" style="width:${w[i % w.length]}%"></i>`).join('');

  const K = MX.KIT = {
    browser: p => `<div class="k-win k-browser"><div class="k-bar"><b></b><b></b><b></b><span class="k-url">${esc(p.url || 'site.com')}</span></div><div class="k-body">${p.title ? `<div class="k-h">${esc(p.title)}</div>` : ''}${body(p)}</div></div>`,
    app: p => `<div class="k-win k-dark"><div class="k-bar"><b></b><b></b><b></b><span class="k-url">${esc(p.url || p.title || 'app')}</span></div><div class="k-body">${body(p)}</div></div>`,
    terminal: p => `<div class="k-win k-dark k-term"><div class="k-bar"><b></b><b></b><b></b><span class="k-url">${esc(p.title || 'terminal')}</span></div><div class="k-body">${(p.lines || []).map(l => `<div class="k-tl">${esc(l)}</div>`).join('')}<div class="k-tl"><span class="k-prompt">&gt;</span> <span class="typed"></span><i class="caret"></i></div></div></div>`,
    phone: p => `<div class="k-phone"><div class="k-notch"></div><div class="k-screen">${p.title ? `<div class="k-h">${esc(p.title)}</div>` : ''}${body(p)}</div></div>`,
    doc: p => `<div class="k-win k-browser k-doc"><div class="k-body">${p.title ? `<div class="k-h">${esc(p.title)}</div>` : ''}${(p.paras || []).map(t => `<p>${String(esc(t)).replace(/\[\[(.+?)\]\]/g, '<span class="hl"><u></u><em>$1</em></span>')}</p>`).join('')}</div></div>`,
    folder: p => `<div class="k-folder"><div class="k-ftab"></div><div class="k-fback"></div><div class="k-fsheets">${seq(3, i => `<i style="transform:rotate(${[-5, 2, 6][i]}deg) translateX(${[-30, 2, 34][i]}px)"></i>`).join('')}</div><div class="k-ffront"><b>${esc(p.label || 'Folder')}</b><span>${esc(p.sub || '')}</span></div></div>`,
    envelope: p => `<div class="k-env"><div class="k-eback"></div><div class="k-ecards">${(p.items || ['1', '2', '3']).map((t, i, a) => `<i style="left:${14 + 72 * i / Math.max(a.length - 1, 1) - 7}%">${esc(t)}</i>`).join('')}</div><div class="k-eflap"></div><div class="k-efront"><b>${esc(p.label || '')}</b></div></div>`,
    polaroid: p => `<div class="k-pol"><div class="k-pic" style="background:${p.img ? `#222 url(${esc(p.img)}) center/cover` : (p.color || 'var(--mute)')}">${p.icon ? `<span>${esc(p.icon)}</span>` : ''}</div><div class="k-cap">${esc(p.label || '')}</div></div>`,
    sticky: p => `<div class="k-sticky">${esc(p.text)}</div>`,
    note: p => `<div class="card mini">${p.head ? `<div class="k-head">${esc(p.head)}</div>` : ''}<div>${esc(p.text || '')}</div>${p.bar != null ? `<div class="k-bartrack"><u style="width:${p.bar}%"></u></div>` : ''}</div>`,
    bigtitle: p => `<div class="k-big"><span>${esc(p.a || '')}</span> <span class="t2">${esc(p.b || '')}</span></div>`,
    tag: p => `<div class="k-tag">${esc(p.text)}</div>`,
    bubble: p => `<div class="k-bubble">${esc(p.text)}</div>`,
    stat: p => `<div class="card k-stat"><div class="k-sv"><span class="pre">${esc(p.prefix || '')}</span><span class="cnt">${p.value}</span><span class="u">${esc(p.suffix || '')}</span></div><div class="k-sl">${esc(p.label || '')}</div></div>`,
    profile: p => `<div class="k-win k-dark k-prof"><div class="k-body"><div class="k-av" style="background:${p.color || 'var(--red)'}"></div><div class="k-pn">${esc(p.name || 'creator')}</div><div class="k-prow">${(p.stats || [['26', 'posts'], ['40K', 'followers'], ['625', 'following']]).map(s => `<div><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div>`).join('')}</div><div class="k-grid">${seq(6, i => `<i style="background:${['#D7372C', '#2E7BF6', '#E9B44C', '#6B7A8F', '#3a8f6f', '#8b5cf6'][i]}"></i>`).join('')}</div></div></div>`,
    icons: p => `<div class="k-icons">${(p.items || []).map(t => `<div class="card mini k-ic"><b>${esc(t.mark || String(t.text || t).slice(0, 1))}</b><span>${esc(t.text || t)}</span></div>`).join('')}</div>`,
    crowd: p => { const c = p.cols || 12, r = p.rows || 6, rnd = MX.rng(p.seed || 3); return `<div class="k-crowd" style="grid-template-columns:repeat(${c},1fr)">${seq(c * r, () => `<i class="${rnd() < (p.hot == null ? .12 : p.hot) ? 'hot' : ''}"><svg viewBox="0 0 20 30"><circle cx="10" cy="7" r="6"/><path d="M1 30C1 19 4 15 10 15S19 19 19 30Z"/></svg></i>`).join('')}</div>`; },
    candles: p => { const n = p.n || 26, r = MX.rng(p.seed || 9); let v = 50, s = ''; for (let i = 0; i < n; i++) { const o = v, cl = Math.min(92, Math.max(8, v + (r() - .46) * 16)), hi = Math.max(o, cl) + r() * 6, lo = Math.min(o, cl) - r() * 6, x = 8 + i * 384 / n, up = cl >= o; s += `<path d="M${x} ${200 - hi * 2}V${200 - lo * 2}" class="${up ? 'up' : 'dn'}"/><rect x="${x - 4.5}" y="${200 - Math.max(o, cl) * 2}" width="9" height="${Math.max(Math.abs(cl - o) * 2, 2)}" class="${up ? 'up' : 'dn'}"/>`; v = cl; } return `<div class="card k-chart"><svg viewBox="0 0 400 200" class="reveal">${s}</svg></div>`; },
    linechart: p => { const n = 40, r = MX.rng(p.seed || 5); let v = p.start || 20, d = `M0 ${200 - v * 2}`; for (let i = 1; i <= n; i++) { v = Math.min(95, Math.max(4, v + (r() - .5) * 12 + (p.trend || .9))); d += ` L${i * 10} ${200 - v * 2}`; } return `<div class="card k-chart">${p.label ? `<div class="k-head">${esc(p.label)}</div>` : ''}<svg viewBox="0 0 400 200"><path class="draw k-lc" d="${d}"/></svg></div>`; },
    fan: p => { const r = MX.rng(p.seed || 4); let s = ''; for (let i = 0; i < 90; i++) { let y = 100, d = 'M0 100'; for (let x = 1; x <= 30; x++) { y += (r() - .5) * 14; d += ` L${x * 13.3} ${y}`; } s += `<path d="${d}" class="${y < 100 ? 'up' : 'dn'}"/>`; } return `<div class="card k-chart k-fan">${p.label ? `<div class="k-head">${esc(p.label)}</div>` : ''}<svg viewBox="0 0 400 200" class="reveal">${s}</svg></div>`; },
    gauge: p => { const L = 251; return `<div class="card k-gauge"><svg viewBox="0 0 200 120"><path d="M20 105A80 80 0 0 1 180 105" class="bg"/><path d="M20 105A80 80 0 0 1 180 105" class="fg draw" data-to="${(p.value || 70) / (p.max || 100)}"/></svg><div class="k-gv"><span class="cnt">${p.value || 70}</span><small>${esc(p.suffix || '')}</small></div><div class="k-sl">${esc(p.label || '')}</div></div>`; },
    calendar: p => `<div class="k-cal"><div class="k-calt">${esc(p.head || 'LATER')}</div><div class="k-caln cnt">${p.value || 3}</div><div class="k-call">${esc(p.label || 'months')}</div></div>`,
    wave: p => { const r = MX.rng(p.seed || 2), n = p.n || 48; return `<div class="k-wave">${seq(n, i => `<i style="height:${10 + 86 * Math.abs(Math.sin(i * .5)) * r()}%"></i>`).join('')}</div>`; },
    film: p => `<div class="k-film">${(p.items || ['', '', '', '']).map(t => `<div><i></i><span>${esc(t)}</span></div>`).join('')}</div>`,
    pin: p => `<div class="k-pin"><svg viewBox="0 0 60 80"><path d="M30 78C20 56 4 44 4 28A26 26 0 0 1 56 28C56 44 40 56 30 78Z"/><circle cx="30" cy="28" r="10" fill="#fff"/></svg></div>`,
    nope: p => `<div class="card k-nope"><div class="k-no"><span>${esc(p.icon || '')}</span><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42"/><path d="M20 20L80 80"/></svg></div><b>${esc(p.text || '')}</b></div>`,
    webpage: p => { const g = (D.pages || {})[p.page]; if (!g) { (MX.errors = MX.errors || []).push('webpage: no capture for ' + p.page + ' (run webshot.mjs)'); return ''; }
      const bars = Object.entries(g.marks).map(([m, rs]) => rs.map(r => `<i class="k-wm" data-m="${esc(m)}" style="left:${r.x - 5}px;top:${r.y - 3}px;width:${r.w + 10}px;height:${r.h + 6}px"></i>`).join('')).join('');
      return `<div class="k-win k-web"><div class="k-bar"><b></b><b></b><b></b><span class="k-url">${esc(p.url || g.url)}</span></div><div class="k-wv" style="height:${p.h || 640}px"><div class="k-wp" style="width:${g.w}px;height:${g.h}px"><img src="pages/${esc(p.page)}.jpg" width="${g.w}" height="${g.h}" decoding="sync" loading="eager" alt="">${bars}</div><svg class="k-cursor k-wc" viewBox="0 0 40 50"><path d="M6 4L6 40L15 31L22 46L29 43L22 28L34 28Z"/></svg></div></div>`; },
    screen: p => `<div class="k-win k-dark k-screenwin"><div class="k-bar"><b></b><b></b><b></b><span class="k-url">${esc(p.url || p.label || 'video')}</span></div><div class="k-scr${p.tall ? ' k-tall' : ''}" data-clip="${esc(p.clip || '')}"><svg viewBox="0 0 40 40"><path d="M14 10L30 20L14 30Z"/></svg></div></div>`,   /* a video frame: the clip itself is laid in after the render by tools/clips.py, so its body must stay this exact colour */
    cursor: () => `<svg class="k-cursor" viewBox="0 0 40 50"><path d="M6 4L6 40L15 31L22 46L29 43L22 28L34 28Z"/></svg>`,
    comment: p => `<div class="k-comment"><div class="k-chead">${esc(p.head || 'Comment')}</div><div class="k-cbar"><span class="typed k-word"></span><i class="caret"></i><b>↑</b></div>${p.sub ? `<div class="k-csub">${esc(p.sub)}</div>` : ''}</div>`,
    band: p => `<div class="k-band">${esc(p.text)}</div>`,
    repo: p => `<div class="k-win k-repo"><div class="k-body"><div class="k-rn"><span>${esc(p.owner)} /</span> <b>${esc(p.name)}</b></div><div class="k-rd">${esc(p.desc || '')}</div><div class="k-rm"><span class="k-rs">&#9733; <i class="cnt">${esc(p.stars || '')}</i></span>${p.lic ? `<span>${esc(p.lic)}</span>` : ''}${p.lang ? `<span>${esc(p.lang)}</span>` : ''}</div></div></div>`,
    timeline: p => `<div class="k-win k-dark k-tl-w"><div class="k-bar"><b></b><b></b><b></b><span class="k-url">${esc(p.title || 'Studio')}</span></div><div class="k-body"><div class="k-view"><span>${esc(p.text || '')}</span></div>${(p.tracks || [[30, 25, 45], [55, 45], [20, 60, 20]]).map((tr, n) => `<div class="k-track">${tr.map((w, i) => `<i style="flex:${w};background:${['#5AA2FF', '#E9B44C', '#D7372C', '#3a8f6f'][(n + i) % 4]}"></i>`).join('')}</div>`).join('')}<u class="k-play"></u></div></div>`,
    shape: p => `<div class="k-shape" style="background:${p.color || 'var(--red)'};border-radius:${p.round || 12}px"></div>`,
  };
  function body(p) {
    if (p.html) return p.html;
    let out = '';
    if (p.rows) out += `<div class="k-rows">${p.rows.map(r => `<div class="k-row ${r.hot ? 'hot' : ''}"><span>${esc(r.text || r)}</span>${r.value != null ? `<b>${esc(r.value)}</b>` : ''}</div>`).join('')}</div>`;
    if (p.text) out += `<div class="k-text">${esc(p.text)}</div>`;
    if (p.input != null) out += `<div class="k-input"><span class="typed"></span><i class="caret"></i></div>`;
    if (!out) out = `<div class="k-lines">${lines(p.linesN || 4)}</div>`;
    return out;
  }

  const ANIM = {
    pop: M.pop, rise: M.rise, slam: M.slam, stamp: M.stamp, spin: M.spin,
    drop: (e, t) => { tl.fromTo(e, { y: -260, opacity: 0 }, { y: 0, opacity: 1, duration: .46, ease: 'bounce.out' }, t); cue('thud', t + .22, .5); },
    slideL: (e, t) => { tl.fromTo(e, { x: -420, opacity: 0 }, { x: 0, opacity: 1, duration: .42, ease: 'power3.out' }, t); cue('whoosh', t, .45); },
    slideR: (e, t) => { tl.fromTo(e, { x: 420, opacity: 0 }, { x: 0, opacity: 1, duration: .42, ease: 'power3.out' }, t); cue('whoosh', t, .45); },
    flip: (e, t) => { tl.fromTo(e, { rotationY: 90, opacity: 0, transformPerspective: 1200 }, { rotationY: 0, opacity: 1, duration: .4, ease: 'back.out(1.6)' }, t); },
    none: (e, t) => { tl.set(e, { opacity: 1 }, t); },
  };
  const SND = { pop: 'pop', rise: 'pop', slam: 'whoosh', flip: 'swipe', none: null };

  const svgNS = 'http://www.w3.org/2000/svg';
  function ring(it, t, shape = 'ring') {
    const tgt = it.firstElementChild, w = tgt.offsetWidth * (parseFloat(getComputedStyle(tgt).zoom) || 1), h = tgt.offsetHeight * (parseFloat(getComputedStyle(tgt).zoom) || 1), s = document.createElementNS(svgNS, 'svg'); s.setAttribute('class', 'ink'); s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.style.cssText = `left:0;top:0;width:${w}px;height:${h}px`;
    const o = 16, r = Math.min(h / 2 + o, 90), x0 = -o, y0 = -o, x1 = w + o, y1 = h + o; // a hand-drawn rounded box that overshoots where the pen lands
    s.innerHTML = shape === 'strike' ? `<path d="M10 ${h * .55} C ${w * .3} ${h * .45}, ${w * .65} ${h * .62}, ${w - 10} ${h * .48}"/>` : shape === 'cross' ? `<path d="M14 14L${w - 14} ${h - 14}"/><path d="M${w - 14} 14L14 ${h - 14}"/>` : `<path d="M${x0 + r + 20} ${y0 - 3}L${x1 - r} ${y0 + 2}Q${x1 + 3} ${y0 + 2} ${x1} ${y0 + r}L${x1 - 2} ${y1 - r}Q${x1} ${y1 + 2} ${x1 - r} ${y1}L${x0 + r} ${y1 + 3}Q${x0 - 3} ${y1} ${x0} ${y1 - r}L${x0 + 2} ${y0 + r}Q${x0} ${y0 - 2} ${x0 + r + 50} ${y0 + 5}"/>`;
    it.append(s); [...s.children].forEach((p, i) => M.draw(p, t + i * .12, .34)); cue('swipe', t, .8);
  }

  function webCam(g, rs, vw, vh, zoom) { // the page transform that frames these lines
    const x0 = Math.min(...rs.map(r => r.x)), x1 = Math.max(...rs.map(r => r.x + r.w)), y0 = Math.min(...rs.map(r => r.y)), y1 = Math.max(...rs.map(r => r.y + r.h));
    const fit = vw / g.w, s = zoom ? zoom * fit : Math.max(fit * 1.35, Math.min(fit * 1.9, vw / (x1 - x0 + 240))), cl = (v, lo) => Math.min(0, Math.max(lo, v));
    return { s, x: cl((x1 - x0) * s > vw - 80 ? 40 - rs[0].x * s : vw / 2 - (x0 + x1) / 2 * s, vw - g.w * s), y: cl(vh * .42 - (y0 + y1) / 2 * s, vh - g.h * s) };
  }

  function action(a, it, sc) {
    const t = MX.wordAt(a.at, sc.t0 - .01), q = s => it.querySelector(s);
    switch (a.do) {
      case 'ring': ring(it, t); break;
      case 'strike': ring(it, t, 'strike'); break;
      case 'cross': ring(it, t, 'cross'); break;
      case 'type': { const n = q('.typed'); if (n) { const c = n.nextElementSibling; const txt = clean(a.text); let last = -1; const o = { _v: 0 }, p = { get v() { return o._v; }, set v(x) { o._v = x; const k = Math.round(x * txt.length); if (k !== last) { n.textContent = txt.slice(0, k); last = k; } } }; const d = a.d || Math.min(.9, .035 * txt.length); tl.to(p, { v: 1, duration: d, ease: 'none' }, t); cue('typing', t, 1); } break; }
      case 'count': { const n = q('.cnt'); if (n) { const dec = (String(a.to).split('.')[1] || '').length; const fmt = v => dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US'); if (!n.firstChild) n.textContent = '0'; const fromV = a.from || 0; const o = { _v: fromV }; let l = null; const p = { get v() { return o._v; }, set v(x) { o._v = x; const st = fmt(x); if (st !== l) { n.firstChild.nodeValue = st; l = st; } } }; n.firstChild.nodeValue = fmt(fromV); tl.to(p, { v: a.to, duration: a.d || 1.15, ease: 'power2.out' }, t); cue('tickroll', t); } break; }
      case 'highlight': { const hs = it.querySelectorAll('.hl u'); const u = hs[a.n || 0]; if (u) { tl.fromTo(u, { scaleX: 0 }, { scaleX: 1, duration: .4, ease: 'power2.out' }, t); cue('swipe', t, .5); } break; }
      case 'reveal': { const r = q('.reveal'); if (r) { const w = r.viewBox.baseVal.width, h = r.viewBox.baseVal.height; const cp = document.createElementNS(svgNS, 'clipPath'), id = 'cp' + Math.round(t * 1000) + (Math.random ? '' : ''); cp.id = id; const rc = document.createElementNS(svgNS, 'rect'); rc.setAttribute('width', w); rc.setAttribute('height', h); cp.append(rc); r.append(cp); const g = document.createElementNS(svgNS, 'g'); g.setAttribute('clip-path', `url(#${id})`); [...r.children].filter(c => c !== cp).forEach(c => g.append(c)); r.append(g); gsap.set(rc, { attr: { width: 0 } }); tl.to(rc, { attr: { width: w }, duration: a.d || 1.6, ease: 'power1.inOut' }, t); cue('tickroll', t, .5); } break; }
      case 'draw': { it.querySelectorAll('.draw').forEach(p => { const L = p.getTotalLength(), to = +p.dataset.to || 1; gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); tl.to(p, { strokeDashoffset: L * (1 - to), duration: a.d || 1.1, ease: 'power2.out' }, t); }); cue('tickroll', t, .5); break; }
      case 'crowd': { const c = it.querySelectorAll('.k-crowd i'), r = MX.rng(11), order = [...c].map((e, i) => [r(), e]).sort((x, y) => x[0] - y[0]).map(x => x[1]); const dur = a.d || 1.0; order.forEach((e, i) => { gsap.set(e, { opacity: 0, scale: .4 }); tl.to(e, { opacity: 1, scale: 1, duration: .16, ease: 'back.out(2)' }, t + dur * i / order.length); }); cue('tickroll', t, .6); break; }
      case 'click': { tl.to(it, { scale: .92, duration: .07 }, t); tl.to(it, { scale: 1, duration: .14, ease: 'back.out(3)' }, t + .07); cue('tick', t, 1.4); break; }
      case 'shake': { tl.to(it, { keyframes: { rotation: [0, -4, 4, -3, 3, 0] }, duration: .34, ease: 'none' }, t); break; }
      case 'pulse': { tl.to(it, { scale: 1.06, duration: .14 }, t); tl.to(it, { scale: 1, duration: .24, ease: 'back.out(3)' }, t + .14); cue('tap', t, .7); break; }
      case 'move': { const box = it.parentElement, v = {}; if (a.x != null) v.left = a.x + '%'; if (a.y != null) v.top = a.y + '%'; if (a.w != null) v.width = a.w + '%'; if (a.rot != null) v.rotation = a.rot; tl.to(it, { ...v, duration: a.d || .5, ease: 'power3.inOut' }, t); break; }
      case 'focus': { // webpage: scroll and zoom to a captured line, cursor moves there, the highlight draws on the word
        const v = q('.k-wv'), pg = q('.k-wp'), g = D.pages[it._page], rs = g && g.marks[a.mark]; if (!rs) { (MX.errors = MX.errors || []).push('webpage: no mark ' + a.mark); break; }
        const cam = webCam(g, rs, v.clientWidth, v.clientHeight, a.zoom), lead = a.lead == null ? .55 : a.lead, d = lead - .05;
        tl.to(pg, { x: cam.x, y: cam.y, scale: cam.s, duration: d, ease: 'power2.inOut' }, t - lead); cue('swipe', t - lead, .28);
        const cur = q('.k-wc'), nx = cam.x + rs[0].x * cam.s - 8, ny = cam.y + (rs[0].y + rs[0].h) * cam.s;
        tl.to(cur, { opacity: 1, duration: .15 }, t - lead); tl.to(cur, { x: nx, y: ny, duration: d, ease: 'power2.inOut' }, t - lead); tl.to(cur, { scale: .82, duration: .07, yoyo: true, repeat: 1 }, t - .05); cue('tick', t, 1);
        const bars = [...it.querySelectorAll('.k-wm')].filter(b => b.dataset.m === a.mark); const each = Math.min(.42, (a.d || 1) / bars.length); bars.forEach((b, i) => tl.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: each, ease: 'none' }, t + i * each));
        // keep pushing in slowly until the next move, so the page never sits dead
        const nextT = a._next && a._next.do === 'focus' ? MX.wordAt(a._next.at, t) - (a._next.lead == null ? .55 : a._next.lead) : sc.t1, s2 = cam.s * 1.025, cx = (v.clientWidth / 2 - cam.x) / cam.s, cy = (v.clientHeight / 2 - cam.y) / cam.s;
        if (nextT - t > .4) tl.to(pg, { scale: s2, x: v.clientWidth / 2 - cx * s2, y: v.clientHeight / 2 - cy * s2, duration: nextT - t, ease: 'none' }, t);
        break; }
      case 'exit': { tl.to(it, { y: -50, opacity: 0, duration: .22, ease: 'power2.in' }, t); break; }
      case 'fade': { tl.to(it, { opacity: a.to == null ? .25 : a.to, duration: .25 }, t); break; }
    }
  }

  /* stage: items:[{kit,at,x,y,w,rot,anim,z,...props,do:[{do,at,...}]}], camera:[{at,scale,x,y,d}] */
  MX.scenes.stage = function (sc, root, box) {
    box.classList.add('stagebox');
    const w0 = box.clientWidth, h0 = box.clientHeight;
    (sc.items || []).forEach((p, i) => {
      if (!K[p.kit]) { (MX.errors = MX.errors || []).push('unknown kit: ' + p.kit); return; }
      const it = el('div', 'it it-' + p.kit, K[p.kit](p)); const t = MX.wordAt(p.at == null ? sc.at : p.at, sc.t0 - .01);
      it.style.cssText += `left:${p.x || 0}%;top:${p.y || 0}%;${p.w ? `width:${p.w}%;` : ''}${p.z ? `z-index:${p.z};` : ''}`;
      box.append(it); gsap.set(it, { opacity: 0, rotation: p.rot || 0 });
      const an = p.anim || (p.kit === 'bigtitle' ? 'slam' : 'pop');
      if (an === 'stamp') { tl.fromTo(it, { scale: 1.75, rotation: (p.rot || -6) - 12, opacity: 0 }, { scale: 1, rotation: p.rot || -6, opacity: 1, duration: .2, ease: 'power3.in' }, t); cue('thud', t + .2); }
      else if (an === 'pop') { tl.fromTo(it, { scale: .55, opacity: 0 }, { scale: 1, opacity: 1, duration: .34, ease: 'back.out(2.2)' }, t); cue('pop', t, .85); }
      else { ANIM[an](it, t); if (SND[an]) cue(SND[an], t, .7); }
      if (p.kit === 'bigtitle') { const b = it.querySelector('.k-big'), cs = getComputedStyle(b), txt = `${p.a || ''} ${p.b || ''}`; b.style.fontSize = MX.fit(txt, cs.fontFamily, p.size || parseInt(getComputedStyle(box).getPropertyValue('--titleMax')) || 170, it.clientWidth || w0 * (p.w || 100) / 100, cs.fontWeight) + 'px'; }
      if (p.kit === 'webpage') { // start at full width, a screen above the first highlight, so the page visibly scrolls to it
        it._page = p.page; const v = it.querySelector('.k-wv'), pg = it.querySelector('.k-wp'), g = D.pages[p.page], first = (p.do || []).find(a => a.do === 'focus'), vw = v.clientWidth, fit = vw / g.w;
        const y1 = first && !p.top ? g.marks[first.mark][0].y * fit - v.clientHeight * 1.05 : 0; gsap.set(pg, { transformOrigin: '0 0', scale: fit, x: 0, y: -Math.max(0, Math.min(y1, g.h * fit - v.clientHeight)) });
        gsap.set(it.querySelector('.k-wc'), { opacity: 0, x: vw * .8, y: v.clientHeight * .85 }); gsap.set(it.querySelectorAll('.k-wm'), { scaleX: 0, transformOrigin: '0 50%' }); }
      (p.do || []).forEach((a, n, all) => { a._next = all[n + 1]; action(a, it, sc); });
      if (p.float !== false && p.kit !== 'webpage') { const inner = it.firstElementChild; if (inner) M.idle(inner, t, sc.t1, i + 3, 1.6); }
    });
    // centre the collage in the space it has, so nothing leaves a dead band under it. "center":false opts out.
    if (sc.center !== false) { const its = [...box.children].filter(c => c.classList.contains('it')); if (its.length) { const top = Math.min(...its.map(c => c.offsetTop)), bot = Math.max(...its.map(c => c.offsetTop + c.offsetHeight)), shift = Math.max(0, (h0 - (bot - top)) / 2) - top; its.forEach(c => { c.style.top = (c.offsetTop + shift) + 'px'; }); } }
    (sc.camera || []).forEach(c => { const t = MX.wordAt(c.at, sc.t0 - .01); tl.to(box, { scale: c.scale || 1, xPercent: c.x || 0, yPercent: c.y || 0, duration: c.d || .6, ease: 'power3.inOut' }, t); });
    if (sc.stamp) { const t = MX.wordAt(sc.stamp.at, sc.t0 - .01), e = el('div', 'stamp', clean(sc.stamp.text)); e.style.left = (sc.stamp.x || 500) + 'px'; e.style.top = (sc.stamp.y || 900) + 'px'; gsap.set(e, { opacity: 0 }); root.append(e); M.stamp(e, t); }
  };

  /* A pill that stays through the whole video (running balance, step counter). plan.hud:{label,value,x,y,updates:[{at,value}]} */
  MX.buildHud = function (layer) {
    const h = D.plan.hud; if (!h) return;
    const e = el('div', 'k-hud', `<small>${esc(h.label || '')}</small><b>${esc(h.value)}</b>`), SHORT = D.H > D.W, b = e.querySelector('b');
    MX.hudEl = e; e.style.left = (h.x != null ? h.x : (SHORT ? 60 : 1540)) + 'px'; e.style.top = (h.y != null ? h.y : (SHORT ? 1340 : 90)) + 'px'; layer.append(e);
    const from = h.from ? MX.wordAt(h.from, 0) : 0; gsap.set(e, { opacity: from > 0 ? 0 : 1 }); if (from > 0) M.pop(e, from);
    if (h.until) { const t = MX.wordAt(h.until, 0); tl.to(e, { opacity: 0, duration: .2 }, t - .15); }
    let cursor = 0; (h.updates || []).forEach(u => { const t = MX.wordAt(u.at, cursor); cursor = t; const o = { _v: 0 }, p = { get v() { return o._v; }, set v(x) { o._v = x; b.textContent = x >= .5 ? u.value : (u.prev != null ? u.prev : b.dataset.prev || ''); } }; b.dataset.prev = h.value; u.prev = u.prev != null ? u.prev : (h.updates[h.updates.indexOf(u) - 1] || h).value; tl.to(p, { v: 1, duration: .01 }, t); tl.fromTo(e, { scale: 1.08 }, { scale: 1, duration: .25, ease: 'back.out(3)', immediateRender: false }, t); cue('tap', t, .6); });
  };
})();
