"""Voice stage. Takes any voice file (your own recording), tightens pauses for the format,
times every word with faster-whisper on the FINAL audio, lines it up with the script, and builds the lip-sync track.

  voice.py import --project P --audio file [--format short|long] [--pauses auto|off|<seconds>] [--paragraph 0.9]
  voice.py edit --project P      re-applies P/edits.json to the imported voice (always starts from vo_base.wav, so edits can be changed freely)
Writes: P/audio/vo.wav, P/audio/words.json, P/audio/mouth.json, P/audio/pause_report.json, and P/script.txt if there was no script.

Pause rules (only truly silent gaps are touched, checked in 0.03 s windows):
  short: every pause over 0.24 s goes to 0.24 s. long: pauses over 0.60 s go to 0.60 s, and sentence-end pauses at
  paragraph breaks may keep up to --paragraph seconds so a long video can breathe. Never time-stretches the voice."""
import argparse, difflib, json, os, re, subprocess, sys
import numpy as np
SR = 48000

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def save(x, path):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', path], input=np.clip(x, -1, 1).astype(np.float32).tobytes(), check=True)
def db_windows(x, win=.03):
    n = int(win * SR); m = len(x) // n; f = x[:m * n].reshape(m, n)
    return 20 * np.log10(np.sqrt((f ** 2).mean(1)) + 1e-9), n

def cap_pauses(x, cap, long_cap=None, min_gap=None):
    """Shorten silent runs to `cap`. The silence threshold follows the recording's own noise floor."""
    db, n = db_windows(x); floor = np.percentile(db, 8); speech = np.percentile(db, 90)
    thr = max(floor + 8, speech - 34); silent = db < thr
    runs, i = [], 0
    while i < len(silent):
        if silent[i]:
            j = i
            while j < len(silent) and silent[j]: j += 1
            runs.append((i, j)); i = j
        else: i += 1
    out, pos, cuts, xf = [], 0, [], int(.008 * SR)
    for i, j in runs:
        a, b = i * n, j * n; dur = (b - a) / SR
        if dur <= cap or i == 0 or j >= len(silent): continue
        keep = cap
        if long_cap and dur >= long_cap: keep = min(long_cap, dur)    # paragraph-sized pause: keep more of it
        k = int(keep * SR); h = k // 2
        out.append(x[pos:a + h]); pos = b - (k - h); cuts.append({'at': round(a / SR, 2), 'was': round(dur, 2), 'now': round(keep, 2)})
    out.append(x[pos:])
    res = out[0]
    for seg in out[1:]:                                                # 8 ms crossfade, so no clicks
        if len(res) > xf and len(seg) > xf:
            r = np.linspace(0, 1, xf, dtype=np.float32); res = np.concatenate([res[:-xf], res[-xf:] * (1 - r) + seg[:xf] * r, seg[xf:]])
        else: res = np.concatenate([res, seg])
    # leading and trailing silence
    db2, n2 = db_windows(res); on = np.where(db2 >= thr)[0]
    if len(on): res = res[max(on[0] * n2 - int(.06 * SR), 0): min((on[-1] + 1) * n2 + int(.25 * SR), len(res))]
    return res, cuts, round(float(thr), 1)

def whisper_words(path, prompt=None):
    from faster_whisper import WhisperModel
    m = WhisperModel('small.en', device='cpu', compute_type='int8')
    pcm = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout, np.int16).astype(np.float32) / 32768.0
    segs, _ = m.transcribe(pcm, language='en', word_timestamps=True, beam_size=5, vad_filter=False)
    return [dict(w=w.word.strip(), s=round(w.start, 3), e=round(w.end, 3)) for s in segs for w in s.words]

tok = lambda s: re.sub(r"[^a-z0-9']", '', s.lower())
def align(heard, script):
    """Use the script's spelling and *key word* marks on the heard word timings. Keeps whisper times, always."""
    sw = script.split(); keys = [w.startswith('*') or w.rstrip('.,!?;:').endswith('*') for w in sw]; sw = [w.replace('*', '') for w in sw]
    sm = difflib.SequenceMatcher(a=[tok(w) for w in sw], b=[tok(h['w']) for h in heard], autojunk=False)
    words, miss = [], []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            for k in range(i2 - i1): words.append({**heard[j1 + k], 'w': sw[i1 + k], 'key': keys[i1 + k]})
            continue
        ht = heard[j1:j2]; st = sw[i1:i2]
        if op == 'insert': miss.append(f"heard extra '{' '.join(h['w'] for h in ht)}' at {ht[0]['s']:.2f}-{ht[-1]['e']:.2f}s (left out of captions, still in the audio: remove with cutTime if it's a flub)"); continue
        if op == 'delete':
            miss.append(f"script word not heard: '{' '.join(st)}'")
            t = words[-1]['e'] if words else 0
            for k, w in enumerate(st): words.append(dict(w=w, s=round(t, 3), e=round(t + .02, 3), key=keys[i1 + k]))
            continue
        a0, b0 = ht[0]['s'], ht[-1]['e']; n = len(st)                   # replace: the script's words share the heard time span
        for k, w in enumerate(st): words.append(dict(w=w, s=round(a0 + (b0 - a0) * k / n, 3), e=round(a0 + (b0 - a0) * (k + 1) / n, 3), key=keys[i1 + k]))
        if [tok(x) for x in st] != [tok(h['w']) for h in ht] and ''.join(tok(x) for x in st) != ''.join(tok(h['w']) for h in ht):
            miss.append(f"script '{' '.join(st)}' / heard '{' '.join(h['w'] for h in ht)}'")
    return words, miss

STOP = set("a an and are as at be been but by can could did do does don't for from had has have he her here's his how i if in into is it it's its just like more most my no not now of on one or our she so some than that that's the their them then there these they this those to up us was we were what when where which who why will with would you your".split())
def auto_keys(words):
    """No *marks* in the script: pick the strongest word of each sentence for the red serif word and the head nod."""
    if any(w.get('key') for w in words): return words
    cur = []
    def flush():
        c = [w for w in cur if tok(w['w']) not in STOP]
        if c: max(c, key=lambda w: (bool(re.search(r'\d', w['w'])), len(tok(w['w']))))['key'] = True
        cur.clear()
    for w in words:
        cur.append(w)
        if re.search(r'[.!?]$', w['w']) or len(cur) >= 12: flush()
    flush(); return words

# Lip-sync. Loudness picks how open: -42 dB closed, -16 dB wide, instant attack, 0.55 release per frame.
# Sound colour picks the shape: bright = wide (ee), dark = round (oo), so the mouth doesn't just flap up and down.
def mouth_track(x, fps=30):
    hop = SR // fps; n = len(x) // hop; out = []; env = 0.0; quiet = 0
    win = np.hanning(hop * 2); freqs = np.fft.rfftfreq(hop * 2, 1 / SR); band = (freqs > 200) & (freqs < 6000)
    centroid = np.zeros(n); level = np.zeros(n)
    for i in range(n):
        f = x[max(i * hop - hop // 2, 0):][:hop * 2]
        if len(f) < hop * 2: f = np.pad(f, (0, hop * 2 - len(f)))
        level[i] = 20 * np.log10(np.sqrt((f ** 2).mean()) + 1e-9)
        S = np.abs(np.fft.rfft(f * win))[band]; centroid[i] = (S * freqs[band]).sum() / (S.sum() + 1e-6)
    ref = np.percentile(level[level > -60], 95) if (level > -60).any() else -16
    level = level + (-16 - ref)                                         # any recording level works
    sp = centroid[level > -30]; lo, hi = (np.percentile(sp, 25), np.percentile(sp, 75)) if len(sp) > 10 else (800, 2200)
    for i in range(n):
        v = np.clip((level[i] + 42) / 26, 0, 1); env = v if v > env else env * .55 + v * .45
        quiet = quiet + 1 if env < .06 else 0
        if quiet > 8: out.append(0); continue                           # resting: the reference's own mouth
        c = centroid[i]; a = env
        if a < .06: s = 1
        elif c < lo: s = 9 if a < .55 else 10
        elif c > hi: s = 7 if a < .5 else 8
        else: s = 2 if a < .25 else 3 if a < .45 else 4 if a < .65 else 5 if a < .85 else 6
        out.append(int(s))
    return out

# Editing the voice to the script's comic and dramatic timing. edits.json:
# {"hold":[{"after":"Like this.","sec":1.2}], "cut":[{"from":"the wrong","to":"take here","nth":1}], "cutTime":[[12.4,13.1]]}
# hold sets the gap after a phrase, longer or shorter. cut removes words, retakes and flubs. cutTime removes a range in vo_base.wav seconds.
def room_tone(x, sec):
    n = int(.4 * SR); step = n // 2; best, at = 1e9, 0
    for i in range(0, max(len(x) - n, 1), step):
        v = float((x[i:i + n] ** 2).mean())
        if v < best: best, at = v, i
    t = x[at:at + n]; return np.tile(t, int(sec * SR) // max(len(t), 1) + 1)[:int(sec * SR)]
def find_phrase(words, phrase, nth=1):
    want = [tok(w) for w in phrase.split()]; toks = [tok(w['w']) for w in words]; seen = 0
    for i in range(len(toks) - len(want) + 1):
        if toks[i:i + len(want)] == want:
            seen += 1
            if seen == nth: return i, i + len(want) - 1
    raise SystemExit(f"edits.json: can't find '{phrase}' (occurrence {nth}) in the words")
def apply_edits(x, words, ed):
    ops = []
    for h in ed.get('hold', []):
        _, j = find_phrase(words, h['after'], h.get('nth', 1))
        if j + 1 >= len(words): continue
        ops.append((words[j]['e'], words[j + 1]['s'], float(h['sec'])))
    for c in ed.get('cut', []):
        i, _ = find_phrase(words, c['from'], c.get('nth', 1)); _, j = find_phrase(words[i:], c['to'], 1); j += i
        ops.append((words[i]['s'], words[j + 1]['s'] if j + 1 < len(words) else words[j]['e'], 0.))
    for a, b in ed.get('cutTime', []): ops.append((float(a), float(b), 0.))
    ops.sort()
    for p, q in zip(ops, ops[1:]):
        if p[1] > q[0] + .001: raise SystemExit(f'edits.json: two edits overlap at {q[0]:.2f}s')
    f = int(.006 * SR); ramp = np.linspace(0, 1, f, dtype=np.float32)
    def edge(seg):
        seg = seg.copy()
        if len(seg) > 2 * f: seg[:f] *= ramp; seg[-f:] *= ramp[::-1]
        return seg
    parts, pos = [], 0
    for a, b, L in ops:
        parts.append(edge(x[pos:int(a * SR)]))
        if L > 0: parts.append(edge(room_tone(x, L)))
        pos = int(b * SR)
    parts.append(edge(x[pos:])); out = np.concatenate(parts)
    new = []
    for w in words:
        mid = (w['s'] + w['e']) / 2
        if any(a <= mid < b for a, b, _ in ops): continue
        d = sum(L - (b - a) for a, b, L in ops if b <= w['s'] + .001)
        new.append({**w, 's': round(w['s'] + d, 3), 'e': round(w['e'] + d, 3)})
    return out, new, ops

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('cmd', choices=['import', 'mouth', 'pauses', 'edit'])
    ap.add_argument('--project', required=True); ap.add_argument('--audio'); ap.add_argument('--format', default=None, choices=['short', 'long'])
    ap.add_argument('--pauses', default='auto'); ap.add_argument('--paragraph', type=float, default=.9)
    a = ap.parse_args(); P = a.project; os.makedirs(f'{P}/audio', exist_ok=True)
    fmt = a.format
    if not fmt and os.path.exists(f'{P}/plan.json'): fmt = json.load(open(f'{P}/plan.json')).get('format')
    fmt = fmt or 'short'
    if a.cmd == 'mouth':
        json.dump(mouth_track(load(f'{P}/audio/vo.wav')), open(f'{P}/audio/mouth.json', 'w')); sys.exit(0)
    def finish_edits():
        """Base voice and words + edits.json = the vo.wav, words.json and mouth.json everything else reads."""
        base = load(f'{P}/audio/vo_base.wav'); bw = json.load(open(f'{P}/audio/words_base.json'))
        ed = json.load(open(f'{P}/edits.json')) if os.path.exists(f'{P}/edits.json') else {}
        out, nw, ops = apply_edits(base, bw, ed) if ed else (base, bw, [])
        save(out, f'{P}/audio/vo.wav'); json.dump(nw, open(f'{P}/audio/words.json', 'w'), indent=0); json.dump(mouth_track(out), open(f'{P}/audio/mouth.json', 'w'))
        if ops: print(f'edits: {len(ops)} applied, {len(base) / SR:.1f}s -> {len(out) / SR:.1f}s, {len(bw) - len(nw)} words removed')
        return out, nw
    if a.cmd == 'edit': finish_edits(); sys.exit(0)
    x = load(a.audio)
    if a.pauses == 'off': res, cuts, thr = x, [], None
    else:
        cap = float(a.pauses) if a.pauses != 'auto' else (.24 if fmt == 'short' else .60)
        res, cuts, thr = cap_pauses(x, cap, None if fmt == 'short' else a.paragraph)
    save(res, f'{P}/audio/vo_base.wav'); save(res, f'{P}/audio/vo.wav')
    script = open(f'{P}/script.txt').read() if os.path.exists(f'{P}/script.txt') else None
    clean_script = re.sub(r'\*', '', script) if script else None
    heard = whisper_words(f'{P}/audio/vo.wav', clean_script)
    if script: words, miss = align(heard, script)
    else:
        words, miss = heard, []; open(f'{P}/script.txt', 'w').write(' '.join(w['w'] for w in heard) + '\n')
    words = auto_keys(words)
    json.dump(words, open(f'{P}/audio/words_base.json', 'w'), indent=0)
    res, words = finish_edits()
    dur0, dur1 = len(x) / SR, len(res) / SR   # after pause capping and edits
    json.dump(dict(format=fmt, before=round(dur0, 2), after=round(dur1, 2), threshold_db=thr, cuts=cuts, script_vs_voice=miss), open(f'{P}/audio/pause_report.json', 'w'), indent=1)
    wpm = len(words) / max(dur1 / 60, .01)
    print(f'voice: {dur0:.1f}s -> {dur1:.1f}s, {len(cuts)} pauses shortened, {len(words)} words, {wpm:.0f} wpm')
    if fmt == 'short' and not (30 <= dur1 <= 180): print(f'WARNING: a Short must be 30 s to 3 min; this is {dur1:.0f} s')
    if miss: print('script and voice differ:'); [print('  ', m) for m in miss[:30]]
