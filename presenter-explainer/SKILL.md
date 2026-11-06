---
name: presenter-explainer
description: Make an explainer video with a talking cartoon presenter (Remi) from a script and your own voice recording, as a 9:16 Short (30 s to 3 min) or a 16:9 long-form video. Four looks (paper, night, soft, studio) that can switch mid-video, a prop kit of app windows, real web pages, charts and sticky notes, word-timed captions, lip-sync and gestures, sound effects and music. Use when the user asks for an explainer video, a talking presenter video, or says "presenter explainer".
---

# Presenter Explainer

**The one rule: the picture acts out what the voice says, on the word.** A nice card that doesn't match the line is a failed scene. Every caption, title, stamp and gesture starts on a real word's start time, never a guess.

Studio: `~/PresenterStudio`, each video in `projects/<slug>/`. Tools are in this skill's `tools/`. If `~/PresenterStudio/.venv` is missing, run this skill's `setup.sh` first.
Python: `~/PresenterStudio/.venv/bin/python`. Below, `$T` = this skill's `tools` folder. Run everything from the studio folder.
Talk to the user in plain language. Give one recommendation and why. Say honestly what you did not check. You can't hear audio: say so, and use the reports.

## 1. Settle these first
Ask only for what the request doesn't already answer, in one question.

**Format.** "Short", "Reel", "TikTok", "vertical" = 9:16. "Long form", "YouTube", "landscape" = 16:9.

| | Short 9:16 | Long 16:9 |
|---|---|---|
| Frame | 1080x1920 | 1920x1080 |
| Length | 30 s to 3 min, warn if outside | any |
| Script | 2-line hook, 3-7 points, 1 closing line | hook, then chapters, each with 2-5 points, then a closing line |
| Ending | last frame matches the first (`loop:true`) | a real ending, no loop |
| Pause cap | 0.24 s | 0.60 s, paragraph breaks up to 0.9 s |

**Input.** Any of: a topic (write the script), a script (use it word for word), a voice recording (it is the source of truth).

**Presenter.** Remi (`remi`): a bold cartoon woman in a mustard sweater. She has 11 mouth shapes, blinks, three faces (`surprised`, `skeptical`, `laughing`) and poses.

**Style.** Default **paper**. Recommend another with a one-line reason when it fits better.

| Style | id | Look | Presenter sits | Recommend for |
|---|---|---|---|---|
| Paper (default) | `paper` | cream paper, ink, red, halftone cards, Anton titles | corner | how-to, tips, most scripts |
| Night | `night` | navy with blue key words and soft glow | corner | as a scene `theme` for the turn in a story, or a whole video on tech and money |
| Soft | `soft` | peach gradient, centred captions | tiny, bottom corner | when the visuals carry it: screenshots, before and after |
| Studio | `studio` | pale blue, glowing frame cards, centred captions | large, bottom centre | a personal, host-led feel |

## 2. Script
When you write it, show it and wait for approval before any voice work.
- Short: line 1 states the problem in under 6 words. Line 2 promises the payoff. About 2.7 words per second. The closing line pays off the hook.
- Long: about 2.5 words per second. Give each chapter a question the viewer wants answered.
- Every sentence should be something the screen can show. If a line has nothing to show, rewrite it or decide now what's on screen.
- Mark one key word per sentence with `*asterisks*`. It becomes the red serif word and the presenter nods on it.
- Save as `projects/<slug>/script.txt`, one paragraph per line. Claims must be real: check every number against a source, and cut what you can't check.

## 3. Voice
The user records the script on their phone or computer and gives you the file.
```bash
.venv/bin/python $T/voice.py import --project projects/<slug> --audio <file> --format short
```
It writes the time of every word, trims long pauses for the format and compares the voice with the script. Read back any "script and voice differ" lines and tell the user. With no script.txt it writes one from what it heard. Never change the speed of the user's voice. `--pauses off` leaves their pauses alone; `--pauses 0.4` sets another cap.

## 4. Plan the scenes
Write `projects/<slug>/plan.json` (and `demos.js` for custom demos). Read `references/plan.md` first.
- Build most scenes with `stage` and the prop kit. Every scene should show the thing being talked about: the document, the chart, the phone, not a card describing it.
- No more than two card scenes in a row. In long form, change something big every 60-90 s: a chapter wipe, a `host` moment, the presenter moving (`left`), a theme change.
- Start a scene close to its title word, so the stage is never empty for over a second.
- Keep every on-screen title to two words. Text has no full stops.
- Give the presenter something to do: a `pose` on the words that matter, about one per scene, and a `face` about every 10 s on a word that earns it. Don't pose in `host` mode.
- Banned: stock photos, emoji, any moment over 1 s where nothing moves, and props over the presenter's face.
- A plan isn't portable between formats: write a separate plan for each format.

**Real web pages.** When the page itself is the proof (a README line, a price, a licence), capture it with `node $T/webshot.mjs projects/<slug>` and use the `webpage` prop. See `references/plan.md`. It needs Google Chrome; set `CHROME_PATH` if Chrome isn't in /Applications.

**Real footage.** The `screen` prop draws an empty video window (`clip`, `url`, `tall:true` for a 9:16 clip). After the final render, `clips.py` lays your footage into those windows:
```bash
.venv/bin/python $T/clips.py layout --project projects/<slug>   # needs clips.json: [{"scene","at","file"}]
.venv/bin/python $T/clips.py apply --project projects/<slug>    # writes out/<slug>-final.mp4
```
A clip plays from its word to the end of its scene, and loops if it is short. Only use footage the user owns or may use.

## 5. Build and check
```bash
node $T/build.mjs projects/<slug> --prep                 # builds the page, finds bad word anchors, writes sound cues
.venv/bin/python $T/sound.py mix --project projects/<slug> # or --music <file>, or --no-music
node $T/build.mjs projects/<slug> --check                # must show 0 errors (see Gotchas for one exception)
node $T/build.mjs projects/<slug> --still 3.5,9,16       # look at stills/sheet.png
```
Look at the sheet. Check: nothing covers the presenter's face, captions don't run onto the presenter, cards fit, the stage isn't half empty. Fix, then:
```bash
node $T/build.mjs projects/<slug> --preview              # fast draft for the user. Long form: add --to 60 first
node $T/build.mjs projects/<slug>                        # final: out/<slug>.mp4
```
- Rendering runs at about real time on a recent Mac. Temp files go to `~/Library/Caches/presenter-explainer/<slug>` and are deleted after.
- The final render prints how many moments stood still for over 1 s. It must be 0.
- Mix: voice, a quiet original music bed, synthesised sound effects, -14 LUFS. Re-run `--prep` then `sound.py mix` whenever the plan changes.

## Deliver
Tell the user the file path, length, mix level and anything you couldn't check. Say you can't hear the audio, and ask them to listen for lip-sync and sound levels.

## Gotchas
- Whisper may hear a different word from the script ("No one" for "Nobody"). Anchors use the script's word.
- Anchors must be words as spoken, in the script's spelling ("ninety percent", not "90 %").
- Don't add files to a project's `build/`. It's wiped on every run. Put pictures for `polaroid` (`img`) in `projects/<slug>/pages/pics/`.
- faster-whisper must be given PCM, not a path. The tools already do this.
- A `contrast` error on a caption word (a `span` in the captions) is the check catching a word during its 0.2 s turn from grey to ink. It is not a real problem. Every other error must be fixed.
- Tested on macOS. Building your own presenter is not part of this free version.

Made by Chris Ife. Help, new presenters and more skills: Chris Ife Studio on Skool.
