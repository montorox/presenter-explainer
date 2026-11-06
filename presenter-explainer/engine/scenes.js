/* Presenter Explainer scene library. Each builder gets (sc, ctx) and adds DOM + tweens. All times come from real word starts. */
(function () {
  const { el, M, tl, cue, clean, fit } = MX; const D = MX.D, SHORT = D.H > D.W;
  const at = (sc, phrase, fallback) => phrase == null ? fallback : MX.wordAt(phrase, sc.t0 - .01);
  const svg = (w, h, inner, cls = 'ink', style = '') => { const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); n.setAttribute('viewBox', `0 0 ${w} ${h}`); n.setAttribute('class', cls); n.style.cssText = style; n.innerHTML = inner; return n; };

  function header(sc, root) {
    const h = el('div', 'hdr'); const n = sc.n != null ? String(sc.n).padStart(2, '0') : null;
    const label = sc.label != null ? clean(sc.label) : null;
    if (label) h.append(el('span', 'l', `// ${n ? n + ' · ' : ''}${label}`));
    if (sc.stat) h.append(el('span', 'r', String(clean(sc.stat)).replace(/(\$?[\d][\d.,]*[%kKmMbBxX+]*)/, '<b>$1</b>')));
    root.append(h); return h;
  }
  function title(words, sc, box, t) {
    const [a, b] = words, txt = [a, b].filter(Boolean).join(' '), cs = getComputedStyle(box), size = fit(txt, cs.getPropertyValue('--titleFont'), parseInt(cs.getPropertyValue('--titleMax')) || 176, box.clientWidth || (SHORT ? 940 : 1120), cs.getPropertyValue('--titleW') || '400');
    const e = el('div', 'title', `<span>${clean(a)}</span>${b ? ` <span class="t2">${clean(b)}</span>` : ''}`); e.style.fontSize = size + 'px';
    const s = svg(600, 40, '<path class="swash" d="M6 26 C 120 8, 240 34, 360 16 S 540 10, 594 22"/>', ''); s.setAttribute('preserveAspectRatio', 'none'); e.append(s); box.append(e);
    M.slam(e, t); cue('whoosh', t - .06, .55); const p = s.querySelector('path'); gsap.set(p, { opacity: 0 }); M.draw(p, t + .12, .32);
    return e;
  }
  function stamp(sc, root, opt) {
    if (!opt) return; const t = at(sc, opt.at, sc.t0 + 1), e = el('div', 'stamp', clean(opt.text));
    e.style.left = (opt.x != null ? opt.x : (SHORT ? 560 : 800)) + 'px'; e.style.top = (opt.y != null ? opt.y : (SHORT ? 1020 : 660)) + 'px'; gsap.set(e, { opacity: 0 }); root.append(e); M.stamp(e, t); return e;
  }
  const ink = (target, fn) => { const w = target.offsetWidth, h = target.offsetHeight, s = svg(w, h, fn(w, h), 'ink', `left:0;top:0;width:${w}px;height:${h}px`); target.append(s); return s.firstChild; };
  const hidden = e => { gsap.set(e, { opacity: 0 }); return e; };

  const B = MX.scenes = {
    /* line 1 states the problem on a card with a strike-through; line 2 promises, chips pop 0.16 s apart, red ring on the payoff */
    hook(sc, root, box) {
      const card = el('div', 'card', `<div class="muted mono" style="font-size:var(--smallFs);margin-bottom:12px">${clean(sc.cardLabel || 'the problem')}</div><div class="cardt" style="font-size:calc(var(--bodyFs) * 1.25)">${clean(sc.problem)}</div>`);
      box.append(card); const ps = ink(card, (w, h) => `<path d="M22 ${h * .68} C ${w * .3} ${h * .58}, ${w * .62} ${h * .78}, ${w - 22} ${h * .62}"/>`); gsap.set(ps, { opacity: 0 }); const ts = at(sc, sc.strikeAt, sc.t0 + .6); M.draw(ps, ts, .32); cue('swipe', ts);
      if (sc.t0 > .05) M.pop(card, sc.t0); else MX.firstCard = card;
      if (sc.chips) {
        const row = el('div', 'rowflex'); row.style.flexWrap = 'wrap'; row.style.marginTop = '24px'; box.append(row); const t2 = at(sc, sc.promiseAt, ts + .8); let ringT = t2;
        sc.chips.forEach((c, i) => { const e = el('div', 'card mini', clean(c)); e.style.position = 'relative'; hidden(e); row.append(e); M.pop(e, t2 + i * .16); cue('pop', t2 + i * .16, .9); if (i === (sc.ring != null ? sc.ring : sc.chips.length - 1)) { ringT = t2 + i * .16 + .36; const pr = ink(e, (w, h) => `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 + 12}" ry="${h / 2 + 13}" transform="rotate(-2 ${w / 2} ${h / 2})"/>`); gsap.set(pr, { opacity: 0 }); M.draw(pr, at(sc, sc.ringAt, ringT), .4); } });
      }
    },
    /* point: header updates, title slams on the word, underline +0.12, main card +0.18 with number count 1.15 s, #N badge +0.6, terminal or search types one line */
    point(sc, root, box) {
      const t = at(sc, sc.titleAt, sc.t0); title(sc.title, sc, box, t); MX.gesture('point', t);
      if (sc.card) {
        const c = el('div', 'card'); const v = sc.card.value;
        if (v != null) { const num = el('div', 'num', `<span>0</span><span class="u">${sc.card.suffix || ''}</span>`); if (sc.card.prefix) num.prepend(document.createTextNode(sc.card.prefix)); c.append(num); M.count(num.querySelector('span'), v, at(sc, sc.card.at, t + .18) + .05, 1.15, sc.card.decimals ? x => x.toFixed(sc.card.decimals) : undefined); }
        if (sc.card.text) c.append(el('div', '', clean(sc.card.text)));
        hidden(c); box.append(c); M.rise(c, at(sc, sc.card.at, t + .18)); cue('pop', t + .18, .7);
        if (sc.n != null || sc.badge != null) { const b = el('div', 'badge', '#' + (sc.badge != null ? sc.badge : sc.n)); hidden(b); c.append(b); M.spin(b, t + .6); }
      }
      if (sc.typed) { const k = el('div', sc.typed.kind === 'search' ? 'search' : 'term'); hidden(k); box.append(k); const tt = at(sc, sc.typed.at, t + .9); M.rise(k, tt - .2); M.type(k, (sc.typed.kind === 'search' ? '' : '$ ') + clean(sc.typed.text), tt); }
      stamp(sc, root, sc.stamp);
    },
    /* steps light up on their words */
    flow(sc, root, box) {
      if (sc.title) title(sc.title, sc, box, at(sc, sc.titleAt, sc.t0));
      sc.steps.forEach((s, i) => { const e = el('div', 'card mini step', `<div class="dot">${i + 1}</div><div>${clean(s.text)}</div>`); hidden(e); box.append(e); const t = at(sc, s.at, sc.t0 + .4 + i * .7); M.rise(e, t); cue('pop', t, .8); const dot = e.querySelector('.dot'); tl.to(dot, { backgroundColor: MX.THEMES[MX.themeAt(sc.t0)].key, scale: 1.14, duration: .18, ease: 'back.out(3)' }, t + .05); tl.to(dot, { scale: 1, duration: .2 }, t + .28); });
      if (sc.gesture !== false) MX.gesture('palm', sc.t0 + .2); stamp(sc, root, sc.stamp);
    },
    list(sc, root, box) {
      if (sc.title) title(sc.title, sc, box, at(sc, sc.titleAt, sc.t0));
      sc.items.forEach(s => { const e = el('div', 'card mini step', `<div class="check"><svg viewBox="0 0 60 60"><path d="M12 32 L26 46 L50 12"/></svg></div><div>${clean(s.text)}</div>`); hidden(e); box.append(e); const t = at(sc, s.at, sc.t0 + .5); M.rise(e, t); const p = e.querySelector('path'); gsap.set(p, { opacity: 0 }); M.draw(p, t + .22, .22); cue('tick', t + .24); });
      stamp(sc, root, sc.stamp);
    },
    bars(sc, root, box) {
      if (sc.title) title(sc.title, sc, box, at(sc, sc.titleAt, sc.t0));
      const max = Math.max(...sc.rows.map(r => r.value));
      sc.rows.forEach((r, i) => { const e = el('div', 'bar-row' + (r.hot ? ' hot' : ''), `<div class="n">${clean(r.label)}</div><div class="track"><div class="fill" style="width:${100 * r.value / max}%"></div></div>`); const tk = e.querySelector('.track'), vv = el('div', 'v', ''); e.querySelector('.fill').append(vv); vv.textContent = (r.prefix || '') + r.value + (r.suffix || ''); box.append(e); hidden(e); const t = at(sc, r.at, sc.t0 + .3 + i * .35); tl.to(e, { opacity: 1, duration: .12 }, t); tl.fromTo(e.querySelector('.fill'), { scaleX: 0 }, { scaleX: 1, duration: .6, ease: 'power3.out' }, t); cue('tickroll', t, .5); });
      stamp(sc, root, sc.stamp);
    },
    compare(sc, root, box) {
      if (sc.title) title(sc.title, sc, box, at(sc, sc.titleAt, sc.t0));
      const row = el('div', 'rowflex'); box.append(row); const later = [];
      [sc.left, sc.right].forEach((c, i) => { const e = el('div', 'card', `<div class="cmp-head">${clean(c.head)}</div><div>${clean(c.text)}</div>`); hidden(e); row.append(e); const t = at(sc, c.at, sc.t0 + .3 + i * .7); M.pop(e, t); cue('pop', t); if (c.lose) { later.push(() => { const p = ink(e, (w, h) => `<path d="M14 14 L${w - 14} ${h - 14}"/>`); gsap.set(p, { opacity: 0 }); const ts = at(sc, c.loseAt, t + .8); M.draw(p, ts, .28); cue('swipe', ts); }); } }); later.forEach(f => f());
      stamp(sc, root, sc.stamp);
    },
    chat(sc, root, box) {
      sc.lines.forEach((l, i) => { const e = el('div', 'bubble' + (l.me ? ' me' : ''), clean(l.text)); hidden(e); box.append(e); const t = at(sc, l.at, sc.t0 + .3 + i * .8); M.pop(e, t); cue('pop', t, .9); });
      stamp(sc, root, sc.stamp);
    },
    quote(sc, root, box) { const e = el('div', 'quote', clean(sc.text)); const c = el('div', 'card'); c.append(e); if (sc.by) c.append(el('div', 'muted mono', clean(sc.by))); c.style.padding = '46px'; hidden(c); box.append(c); M.rise(c, sc.t0); cue('pop', sc.t0, .6); stamp(sc, root, sc.stamp); },
    /* a title moment: presenter comes forward */
    host(sc, root, box) { if (sc.title) title(sc.title, sc, box, at(sc, sc.titleAt, sc.t0 + .1)); stamp(sc, root, sc.stamp); },
    chapter(sc, root, box) {
      box.style.justifyContent = 'center'; if (sc.num != null) { const n = el('div', 'chapnum', `chapter ${String(sc.num).padStart(2, '0')}`); hidden(n); box.append(n); M.rise(n, sc.t0); }
      title(sc.title, sc, box, at(sc, sc.titleAt, sc.t0 + .12));
    },
    closing(sc, root, box) { if (sc.title) title(sc.title, sc, box, at(sc, sc.titleAt, sc.t0)); stamp(sc, root, sc.stamp); },
    /* a demo scene written for this script: MX.custom[sc.name](ctx) in the project's demos.js */
    custom(sc, root, box) {
      const fn = MX.custom[sc.name]; if (!fn) { (MX.errors = MX.errors || []).push('no custom demo: ' + sc.name); return; }
      fn({ sc, root, box, el, M, tl, cue, svg, hidden, clean, at: p => MX.wordAt(p, sc.t0 - .01), SHORT, W: D.W, H: D.H });
    },
  };

  MX.buildScenes = function (layer) {
    const P = D.plan.scenes; P.forEach(s => { s.t0 = s.at == null ? 0 : MX.wordAt(s.at, 0); });
    let cursor = 0; P.forEach(s => { s.t0 = s.at == null ? 0 : MX.wordAt(s.at, cursor); cursor = s.t0; });
    P.forEach((s, i) => {
      const nx = P[i + 1]; s.t1 = nx ? nx.t0 : D.duration; const lead = nx && nx.wipe ? -.05 : .14; s.tx = nx ? s.t1 - lead : null;
      // presenter marks run across chunk boundaries, so they are always added
      const mode = s.presenter || (s.type === 'host' ? 'host' : 'corner');
      const prev = P[i - 1]; const pm = prev ? (prev.presenter || (prev.type === 'host' ? 'host' : 'corner')) : mode;
      if (mode !== pm) { const pl = MX.place(mode); tl.to('#pres', { ...pl, duration: .45, ease: 'power3.inOut' }, Math.max(s.t0 - .25, 0)); cue('whoosh', s.t0 - .2, .5); }
      if (!SHORT && mode !== pm && (mode === 'host' || pm === 'host')) { const c0 = MX._cw0 || (MX._cw0 = getComputedStyle(document.querySelector('#captions')).getPropertyValue('--cw').trim() || '1180px'); tl.set('#captions', { '--cw': mode === 'host' ? '760px' : c0 }, Math.max(s.t0 - .25, 0)); }
      if (!SHORT && mode !== pm && (mode === 'left' || pm === 'left')) { const x0 = MX._cx0 || (MX._cx0 = getComputedStyle(document.querySelector('#captions')).getPropertyValue('--cx').trim() || '84px'); tl.set('#captions', { '--cx': mode === 'left' ? '640px' : x0 }, Math.max(s.t0 - .25, 0)); }   // presenter on the left: captions move right of him   // long form: the close-up fills the right half, so its captions stop before his shoulder
      else if (i === 0 && mode !== 'corner') gsap.set('#pres', MX.place(mode));
      if (s.wipe) MX.wipe(s.t0 - .3);
      if (s.theme) { const was = i ? MX.themeAt(P[i - 1].t0) : MX.style; if (was !== s.theme) { tl.to(`.bg-${s.theme}`, { opacity: 1, duration: s.wipe ? .01 : .45, ease: 'none' }, s.t0 - (s.wipe ? -.1 : .3)); tl.to(`.bg-${was}`, { opacity: 0, duration: s.wipe ? .01 : .45, ease: 'none' }, s.t0 - (s.wipe ? -.1 : .3)); } }
      // the music cuts out for a comic beat: {"at":"word","until":"word","hit":"hit"}; the hit lands where the music returns
      if (s.musicDrop) { const m = s.musicDrop, t = MX.wordAt(m.at, s.t0 - .01), t2 = MX.wordAt(m.until, t); MX.cues.push({ name: 'musicDrop', t, d: t2 - t }); if (m.hit) MX.cue(m.hit, t2, m.gain || 1); }
      (s.sfx || []).forEach(c => MX.cue(c.name, MX.wordAt(c.at, s.t0 - .01), c.gain || 1));
      (s.face ? (Array.isArray(s.face) ? s.face : [s.face]) : []).forEach(p => MX.face(p.name, MX.wordAt(p.at, s.t0 - .01), p.d || 1.3));
      (s.pose ? (Array.isArray(s.pose) ? s.pose : [s.pose]) : []).forEach(p => MX.gesture(p.name, MX.wordAt(p.at, s.t0 - .01), p.d || 1.7));
      if (!MX.inChunk(s.t0 - .4, s.t1 + .5) && !MX.cueRun) return;
      const th = MX.themeAt(s.t0); const root = el('div', `scene ${s.type} theme-${th}`); layer.append(root); if (s.layout === 'full') root.classList.add('layout-full');
      const box = el('div', 'box'); if (s.type !== 'hook' && s.type !== 'chapter') box.classList.add('top'); if (s.box) box.style.cssText += s.box; root.append(box);
      if (s.t0 > 0) tl.set(root, { visibility: 'visible' }, s.t0 - .02); else root.style.visibility = 'visible';
      header(s, root);
      B[s.type](s, root, box);
      if (!(s.items || []).some(p => p.kit === 'screen')) M.idle(box, s.t0, s.t1, i + 1); // footage windows hold still so clips.py can lay video in
      if (!nx && D.plan.loop && SHORT) s.tx = D.duration - .85;
      if (s.tx != null) { tl.to(root, { y: -50, opacity: 0, duration: .22, ease: 'power2.in' }, s.tx); tl.set(root, { visibility: 'hidden' }, s.tx + .24); }
    });
    // closing line pays off the hook; the last frame matches the first so a Short loops
    if (D.plan.loop && SHORT && MX.firstCard) MX.buildLoop(layer);
  };
  MX.buildLoop = function (layer) {
    const orig = MX.firstCard.closest('.box'); if (!orig) return; const root0 = el('div', 'scene');
    const c = orig.cloneNode(true); [...c.children].slice(1).forEach(x => { x.style.visibility = 'hidden'; }); c.querySelectorAll('svg').forEach(n => n.remove()); header({ label: D.plan.scenes[0].label, stat: D.plan.scenes[0].stat }, root0);
    gsap.set(c, { clearProps: 'transform' }); root0.append(c); layer.append(root0); const root = root0;
    const t = D.duration - .55; tl.set(root, { visibility: 'visible' }, t); tl.fromTo(c.children[0], { scale: .55, opacity: 0 }, { scale: 1, opacity: 1, duration: .34, ease: 'back.out(2.2)', immediateRender: false }, t); MX.cue('pop', t);
  };
})();
