"""Sound stage: synthesised SFX (one per event), an original music bed, and the final mix.
   sound.py mix --project P [--music file] [--no-music]   -> P/audio/mix.wav  (voice 1.0, music 0.16, loudest point of each sound on its frame, -14 LUFS)"""
import argparse, json, os, re, subprocess, sys
import numpy as np
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__)); SFXD = os.path.join(os.path.dirname(HERE), 'sfx')
R = np.random.default_rng(11)
def env(n, a=.002, d=.1): t = np.arange(n) / SR; return np.minimum(t / a, 1) * np.exp(-t / d)
def noise(n): return R.standard_normal(n).astype(np.float32)
def lp(x, fc):
    k = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - k) * v + k * s; y[i] = s
    return y
def bp(x, lo, hi): return lp(x, hi) - lp(x, lo)
def pop():
    n = int(.14 * SR); t = np.arange(n) / SR; f = 520 * np.exp(-t * 16) + 240
    return .9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .045)
def tick(): n = int(.03 * SR); return .7 * bp(noise(n), 1800, 7000) * env(n, .0005, .007)
def tickroll(d=1.15):
    n = int(d * SR); x = np.zeros(n); t = 0
    while t < d - .03:
        k = int(t * SR); s = tick() * (.45 + .55 * (t / d)); x[k:k + len(s)] += s[:n - k]; t += .03 + .07 * (t / d) ** 2
    return x
def typing(d=.85):
    n = int(d * SR); x = np.zeros(n); t = 0; 
    while t < d - .03:
        k = int(t * SR); s = bp(noise(int(.022 * SR)), 900, 5000) * env(int(.022 * SR), .0005, .005) * R.uniform(.4, .8); x[k:k + len(s)] += s; t += R.uniform(.04, .085)
    return x
def thud():
    n = int(.32 * SR); t = np.arange(n) / SR; f = 130 * np.exp(-t * 9) + 46
    return np.tanh(2.0 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .09)) * .95 + .3 * lp(noise(n), 2500) * env(n, .0005, .012)
def swipe():
    n = int(.26 * SR); u = np.linspace(0, 1, n); x = noise(n); x = bp(x, 900, 5200) * np.sin(np.pi * u) ** 2; return .55 * x
def whoosh_syn():
    n = int(.42 * SR); u = np.linspace(0, 1, n); x = lp(noise(n), 2600) * np.sin(np.pi * u ** .7) ** 3; return .8 * x
def wipe():
    n = int(.9 * SR); u = np.linspace(0, 1, n); x = bp(noise(n), 300, 3200) * np.sin(np.pi * u) ** 2; return .5 * x
def scratch():   # record scratch: a short pitch sweep up then down, over vinyl noise
    n = int(.42 * SR); u = np.linspace(0, 1, n); f = 180 + 900 * np.sin(np.pi * np.clip(u * 1.6, 0, 1)) ** 2
    tone = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .35 + bp(noise(n), 700, 4200) * .9
    return np.tanh(2 * tone * np.sin(np.pi * u) ** .6 * env(n, .002, .12)) * .9
def hit():       # comic hit: a punchy low thump with a bright click on top
    n = int(.35 * SR); t = np.arange(n) / SR; f = 160 * np.exp(-t * 14) + 55
    return np.tanh(2.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .0008, .1)) + .5 * bp(noise(n), 2500, 8000) * env(n, .0003, .01)
def tap():       # light realisation tap: two soft bell partials
    n = int(.5 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1320 * t) * .6 + np.sin(2 * np.pi * 1980 * t) * .3) * env(n, .001, .18)
SYN = dict(pop=pop, tick=tick, tickroll=tickroll, typing=typing, thud=thud, swipe=swipe, wipe=wipe, whoosh=whoosh_syn, scratch=scratch, hit=hit, tap=tap)
FILES = {}   # drop your own files in sfx/ and name them here, e.g. dict(scratch='my-scratch.mp3'); all sounds are synthesised by default
GAIN = dict(pop=.34, tick=.3, tickroll=.26, typing=.26, thud=.55, swipe=.28, wipe=.2, whoosh=.3, scratch=.5, hit=.5, tap=.4)
PEAK_ON = {'thud', 'scratch', 'hit', 'tap', 'pop', 'swipe'}             # these line up their loudest moment with the cue
def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
_c = {}
def sound(name):
    if name not in _c:
        if name in FILES and os.path.exists(f'{SFXD}/{FILES[name]}'):
            x = load(f'{SFXD}/{FILES[name]}'); x = x / (np.abs(x).max() + 1e-6)
        else: x = SYN[name]().astype(np.float32)
        _c[name] = x
    return _c[name]

# Original bed: soft kick + muted plucks over four chords, 92 bpm. Tiled to any length, never the same loud bars in a row.
def music(dur):
    bpm = 92; beat = 60 / bpm; chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 196, 261.6], [196, 246.9, 293.7]]
    n = int((dur + 2) * SR); x = np.zeros(n, np.float32); rng = np.random.default_rng(5)
    pl = lambda f, d=.42: np.sin(2 * np.pi * f * np.arange(int(d * SR)) / SR) * env(int(d * SR), .003, .14) * (1 + .3 * np.sin(2 * np.pi * 2 * f * np.arange(int(d * SR)) / SR))
    kk = lambda: (lambda m: np.sin(2 * np.pi * np.cumsum(90 * np.exp(-np.arange(m) / SR * 30) + 42) / SR) * env(m, .001, .08))(int(.25 * SR))
    pad = lambda f, d: sum(np.sin(2 * np.pi * f * m * np.arange(int(d * SR)) / SR) * a for m, a in ((.5, .6), (1, .3))) * np.minimum(np.arange(int(d * SR)) / (SR * .4), 1) * np.minimum((int(d * SR) - np.arange(int(d * SR))) / (SR * .4), 1)
    b, bar = 0, 0
    while b * beat < dur + 1:
        c = chords[bar % 4]; k = int(b * beat * SR)
        def add(s, at, g):
            i = int(at); e = min(i + len(s), n)
            if i < n: x[i:e] += (s[:e - i] * g).astype(np.float32)
        for f in c: add(pad(f, beat * 4), k, .055)
        for st in range(8):
            if rng.random() < (.55 if st % 2 else .8): add(pl(c[rng.integers(3)] * (2 if rng.random() < .4 else 1)), k + st * beat / 2 * SR, .1)
        for q in (0, 2): add(kk(), k + q * beat * SR, .28)
        b += 4; bar += 1
    return x[:int(dur * SR)]

def lufs_measure(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return json.loads(r[r.rfind('{'):r.rfind('}') + 1])
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('cmd', choices=['mix', 'render-sfx']); ap.add_argument('--project'); ap.add_argument('--music'); ap.add_argument('--no-music', action='store_true'); ap.add_argument('--lufs', type=float, default=-14); ap.add_argument('--out')
    a = ap.parse_args()
    if a.cmd == 'render-sfx': sys.exit(0)
    P = a.project; v = load(f'{P}/audio/vo.wav'); cues = json.load(open(f'{P}/cues.json')); dur = len(v) / SR
    tail = 1.2; n = int((dur + tail) * SR); sfx = np.zeros(n, np.float32); mus = np.zeros(n, np.float32)
    last = {}
    for c in sorted(cues, key=lambda c: c['t']):
        name = c['name']
        if name == 'musicDrop': continue
        if name not in SYN and name not in FILES: print('unknown sfx', name); continue
        if name in last and c['t'] - last[name] < .05: continue
        last[name] = c['t']
        s = sound(name); pk = int(np.abs(s).argmax()) if name in PEAK_ON else 0
        i = int(c['t'] * SR) - pk; g = GAIN.get(name, .3) * c.get('gain', 1)
        if i < 0: s = s[-i:]; i = 0
        e = min(i + len(s), n); sfx[i:e] += s[:e - i] * g
    if not a.no_music:
        src = load(a.music) if a.music else music(dur + tail)
        if len(src) < n: src = np.tile(src, n // len(src) + 1)
        src = src[:n]; src = src / (np.sqrt((src ** 2).mean()) + 1e-6) * .10     # consistent level before the 0.16 fader
        fade = int(.8 * SR); src[-fade:] *= np.linspace(1, 0, fade); mus = src * .16 * 2.2
    for c in cues:                                                       # comic beats: the music drops out, then comes back
        if c['name'] != 'musicDrop': continue
        i, k = int(c['t'] * SR), int((c['t'] + c['d']) * SR); f0, f1 = int(.06 * SR), int(.3 * SR)
        env = np.ones(n, np.float32); env[i:k] = 0
        env[i:i + f0] = np.linspace(1, 0, len(env[i:i + f0])); env[k:k + f1] = np.linspace(0, 1, len(env[k:k + f1]))
        mus = mus * env
    mix = sfx + mus; mix[:len(v)] += v
    tmp = f'{P}/audio/_premix.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_f32le', tmp], input=mix.astype(np.float32).tobytes(), check=True)
    m = lufs_measure(tmp); out = a.out or f'{P}/audio/mix.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f"loudnorm=I={a.lufs}:TP=-1:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000", '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', out], check=True)
    os.remove(tmp); m2 = lufs_measure(out)
    # loudnorm can land a few tenths short on short clips: close the gap with plain gain, without passing the -1 dB ceiling
    gain = min(float(a.lufs) - float(m2['input_i']), -1 - float(m2['input_tp']))
    if abs(gain) > .05:
        t2 = out + '.tmp.wav'; os.rename(out, t2); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', t2, '-af', f'volume={gain:.2f}dB', '-ar', '48000', out], check=True); os.remove(t2); m2 = lufs_measure(out)
    print(f"mix: {m2['input_i']} LUFS, true peak {m2['input_tp']} dB, {len(cues)} sound cues")
