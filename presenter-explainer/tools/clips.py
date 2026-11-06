"""Lay real footage into `screen` kit windows after the render.

  clips.py layout --project P      finds each window's dark rect in stills, writes clips_layout.json
  clips.py apply  --project P [--in out/<slug>.mp4] [--out out/<slug>-final.mp4]

clips.json: [{"scene": <scene at>, "at": <word phrase>, "file": "footage/x.mp4"}, ...]
A clip starts on its word (after the window pops in) and runs to the end of its scene.
Short clips loop. The window's screen is #0F1012 in the render, so it is found by colour.
"""
import json, re, subprocess, sys, os, argparse
import numpy as np, cv2

T = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('cmd'); ap.add_argument('--project', required=True)
ap.add_argument('--in', dest='inp'); ap.add_argument('--out'); a = ap.parse_args()
P = a.project.rstrip('/'); slug = os.path.basename(P)
norm = lambda s: re.sub(r"[^a-z0-9']", '', s.lower().replace('’', "'"))

def times():
    plan = json.load(open(f'{P}/plan.json')); w = json.load(open(f'{P}/audio/words.json')); w = w if isinstance(w, list) else w['words']
    toks = [norm(x['w']) for x in w]
    def find(ph, i0):
        q = [norm(t) for t in ph.split('@')[0].split() if norm(t)]
        for i in range(i0, len(toks)):
            if toks[i:i + len(q)] == q: return i
        raise SystemExit('not found: ' + ph)
    i = 0; idx = []
    for sc in plan['scenes']: i = find(sc['at'], i); idx.append(i)
    end = w[-1]['e'] + 1.0
    out = []
    for c in json.load(open(f'{P}/clips.json')):
        k = next(n for n, sc in enumerate(plan['scenes']) if sc['at'] == c['scene'])
        t_on = w[find(c['at'], idx[k])]['s']
        t_off = w[idx[k + 1]]['s'] if k + 1 < len(idx) else end
        out.append(dict(c, t_on=round(t_on, 2), t_off=round(t_off, 2)))
    return out

def rects(png):
    im = cv2.imread(png); d = np.abs(im.astype(int) - np.array([18, 16, 15])).max(2) <= 3  # BGR of #0F1012
    n, lab, st, _ = cv2.connectedComponentsWithStats(d.astype(np.uint8), 8)
    return [tuple(int(v) for v in st[j][:4]) for j in range(1, n) if st[j][2] > 120 and st[j][3] > 60 and st[j][4] > 0.5 * st[j][2] * st[j][3]]

def stills(ts):
    r = subprocess.run(['node', f'{T}/build.mjs', P, '--still', ','.join(str(t) for t in ts)], capture_output=True, text=True)
    if r.returncode: raise SystemExit(r.stdout + r.stderr)
    fs = sorted(f for f in os.listdir(f'{P}/stills') if f.startswith('frame-'))
    return [f'{P}/stills/{f}' for f in fs]

if a.cmd == 'layout':
    cs = times(); ts = []
    for c in cs: ts += [round(c['t_on'] + 0.9, 2), round(max(c['t_off'] - 0.4, c['t_on'] + 1), 2)]
    ims = stills(ts)
    for n, c in enumerate(cs):
        r0, r1 = rects(ims[2 * n]), rects(ims[2 * n + 1])
        used = [q['rect'] for q in cs[:n] if q['scene'] == c['scene']]  # a later clip in the same scene takes a window no earlier clip has
        r0 = [r for r in r0 if all(abs(r[0] - u[0]) > 20 or abs(r[1] - u[1]) > 20 for u in used)]
        if not r0: raise SystemExit(f"no screen found for {c['clip']} at {c['t_on'] + 0.9}s")
        c['rect'] = max(r0, key=lambda r: r[2] * r[3])
        if not any(max(abs(p - q) for p, q in zip(c['rect'], r)) <= 4 for r in r1): print(f"WARN {c['clip']}: the window moves or is covered before the scene ends")
        print(f"{c['clip']:20s} {c['t_on']:7.2f}-{c['t_off']:7.2f}s  rect {c['rect']}")
    json.dump(cs, open(f'{P}/clips_layout.json', 'w'), indent=1)

elif a.cmd == 'apply':
    cs = json.load(open(f'{P}/clips_layout.json'))
    inp = a.inp or f'{P}/out/{slug}.mp4'; out = a.out or f'{P}/out/{slug}-final.mp4'
    args = ['ffmpeg', '-y', '-v', 'error', '-i', inp]; fl = []; last = '0:v'
    for n, c in enumerate(cs):
        x, y, w, h = c['rect']; on = c['t_on'] + 0.45; off = c['t_off'] - 0.12; dur = off - on
        args += ['-stream_loop', '-1', '-i', f"{P}/{c['file']}"]
        fl.append(f"[{n + 1}:v]trim=0:{dur:.3f},setpts=PTS-STARTPTS+{on:.3f}/TB,scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
                  f"format=yuva420p,fade=in:st={on:.3f}:d=0.25:alpha=1[c{n}]")
        fl.append(f"[{last}][c{n}]overlay={x}:{y}:eof_action=pass:enable='between(t,{on:.3f},{off:.3f})'[v{n}]"); last = f'v{n}'
    args += ['-filter_complex', ';'.join(fl), '-map', f'[{last}]', '-map', '0:a?', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium',
             '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', out]
    subprocess.run(args, check=True); print('clips laid in:', out)
