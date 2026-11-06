# plan.json: what the video does, in word order

```json
{"format":"short|long","presenter":"remi","title":"…","loop":true,"captions":true,"captionWords":9,"seed":7,"scenes":[ … ]}
```
- `loop` Shorts only: the last frame matches the first.
- Every `at`, `titleAt`, `strikeAt` etc. is a phrase from the voice. It resolves to the real start of that word, searching forward from the scene start. `"word@0.2"` adds an offset. A phrase that can't be found stops the build and names it.
- Scenes must be in spoken order. Scene `at` is searched forward from the previous scene.

Fields on every scene: `type`, `at`, `label`, `n`, `stat`, `wipe:true` (halftone wipe 0.3 s before), `presenter:"corner|host|left|small|off"`, `stamp:{text,at,x,y}`.
A scene exits upward 0.3 s before the next begins unless the next one wipes.

| type | fields | use |
|---|---|---|
| `hook` | `problem`, `cardLabel`, `strikeAt`, `promiseAt`, `chips[]`, `ring`, `ringAt` | First scene. UI card, red strike, chips pop 0.16 s apart, ring on the payoff |
| `point` | `title:[a,b]`, `titleAt`, `card:{value,prefix,suffix,decimals,text,at}`, `typed:{kind:"terminal|search",text,at}` | Title slams, underline +0.12, card +0.18, count 1.15 s, #N badge +0.6, type under 0.9 s. Raises the pointing hand |
| `flow` | `title`, `titleAt`, `steps:[{text,at}]`, `gesture` | Steps light on their words. Open palm |
| `list` | `title`, `titleAt`, `items:[{text,at}]` | Ticks drawn on the words |
| `bars` | `title`, `titleAt`, `rows:[{label,value,prefix,suffix,hot,at}]` | Bars grow on the words |
| `compare` | `title`, `titleAt`, `left/right:{head,text,at,lose,loseAt}` | Two cards, loser gets a red slash |
| `chat` | `lines:[{text,me,at}]` | Bubbles pop on the words |
| `quote` | `text`, `by` | Big serif line |
| `host` | `title`, `titleAt` | The presenter comes forward. Use it for a line with nothing to show |
| `chapter` | `num`, `title`, `titleAt` | Long form section opener. Pair with `wipe:true` |
| `closing` | `title`, `titleAt` | The line that pays off the hook |
| `custom` | `name` | A demo written for this script (below) |

## Custom demos: demos.js
This is where the video gets good. Whenever the voice describes something happening, write the thing happening.

```js
MX.custom.bed = function ({ sc, root, box, el, M, tl, cue, svg, at, SHORT, W, H }) {
  const card = el('div', 'card mini', 'to do');
  gsap.set(card, { opacity: 0 }); box.append(card);
  M.rise(card, sc.t0);                                // pop rise exit slam stamp spin draw count type idle
  tl.to(card, { x: -400, duration: .6 }, at('follows'));
  cue('thud', at('bed'));                             // sound lands with the action
};
```
- Hide elements from the start with `gsap.set` or CSS, never with a timeline set at 0.
- Use `tl` only, never timers, `Math.random` (use `MX.rng(seed)`) or `Date.now`. Every frame must come from time alone.
- Style tokens: `--ink --red --grey --paper --card`; `.card .card.mini .stamp .title .num .term .search .bubble`.
- Layout box sizes: Short 940x690 at (70, 470). Long 1120x710 at (84, 112).

## Sound cues
Built-in events cue themselves. `cue(name, t, gain)` adds more: `pop tick tickroll typing thud swipe wipe whoosh scratch hit tap`. `scratch` is the user's record scratch: use it to land a joke or a caught-out moment, and act the pause rather than narrating it.

## Styles and themes
Top level: `"style": "paper" | "night" | "soft" | "studio"`. It sets the captions, the presenter's place and the props' look.
Any scene can add `"theme": "night" | "paper" | "soft" | "studio" | "studioDark"`, which stays until another scene changes it. With `"wipe": true` the change happens under the wipe; without, it crossfades. The classic move: a `paper` video turns `night` at the twist, then back to `paper` for the takeaway. `studio` alternates well with `studioDark`.
Scene `presenter`: `corner` (default, follows the style), `host` (huge, for a punch-in), `center`, `mini`, `left`, `off`.

## Poses
Scene `"pose": {"name","at","d"}`, or a list of them. `at` is a word, `d` is seconds (default 1.7).

Scene `"face": {"name","at","d"}`, or a list of them: `surprised`, `skeptical` or `laughing`, on rigs that have them (Remi has all three). `d` defaults to 1.3 s. Only the eyes and brows change, so lip-sync carries on. Use about one per 10 s, on a word that earns it. Rigs without expressions ignore it. Built with `tools/rig_expressions.py <presenter> <sheet>`.
`point` `pointdown` `palm` `both` `shrug` `stop` `mouth` (hand over mouth) `eyes` (hands over eyes) `think` `yes` (points to the other side).

## Stage scene: the prop kit
`{"type":"stage","at":"...","items":[...],"camera":[...],"center":true,"stamp":{"text","at","x","y"}}`
The collage is centred in the available height; `"center": false` keeps your y values.

Each item: `{"kit":"browser","at":"word","x":0,"y":0,"w":100,"rot":0,"z":1,"anim":"pop","float":true,"do":[...], ...props}`. `x`, `y`, `w` are % of the stage.
`anim`: `pop` `rise` `slam` `stamp` `spin` `drop` `slideL` `slideR` `flip` `none`.

| kit | props |
|---|---|
| `browser` `app` (dark) | `url`, `title`, then `rows:[{text,value,hot}]`, `text`, `input:""`, `linesN`, or `html` |
| `phone` | `title` and the same body props |
| `terminal` | `title`, `lines:[]`, ends in a prompt for the `type` action |
| `doc` | `title`, `paras:[]`; `[[text]]` marks a highlight for the `highlight` action |
| `profile` | `name`, `stats:[[n,label]]`, `color` |
| `folder` `envelope` | `label`, `sub` / `label`, `items:[]` |
| `polaroid` `sticky` `note` | `label,icon,color` / `text` / `head,text,bar` (bar is a % progress) |
| `bigtitle` `tag` `bubble` `band` | `a,b,size` (auto-fits) / `text` |
| `stat` `gauge` `calendar` | `value,prefix,suffix,label` / `value,max,suffix,label` / `head,value,label` |
| `candles` `linechart` `fan` | `n,seed` / `label,start,trend,seed` / `label,seed` |
| `crowd` `icons` `film` `wave` | `cols,rows,hot,seed` / `items:[{mark,text}]` / `items:[]` / `n,seed` |
| `pin` `cursor` `shape` `nope` | none / none / `color,round` / `icon,text` |
| `comment` | `head`, `sub`; use the `type` action to fill it |
| `webpage` | `page` (a capture id), `h` window height in px, `top:true` to start at the page top, `url`. Set `do:[{do:'focus',mark,at,zoom}]`. See below |
| `repo` | `owner,name,desc,stars,lic,lang`: a repository card. Use the real numbers from `gh api` |
| `timeline` | `title,text,tracks:[[w,w],[...]]`: a small video editor with a playhead |

Charts draw made-up shapes from the seed: they illustrate a mood. Never present them as real data; use `bars` or labelled values for real numbers.

`do` actions, each `{"do":..,"at":"word"}`: `ring` `strike` `cross` `type{text,d}` `count{to,from,d}` `highlight{n}` `reveal{d}` (candles, fan) `draw{d}` (linechart, gauge) `crowd{d}` `click` `shake` `pulse` `move{x,y,w,rot,d}` `exit` `fade{to}`.

## HUD
Top level `"hud": {"label","value","x","y","from":"word","until":"word","updates":[{"at":"word","value":"..."}]}`: a small panel that stays on screen across scenes, such as a step counter or a running total. It follows the current theme. Its default place suits the corner presenter; set `x`,`y` for other layouts, and `until` before a `host` scene.

## Comic beats and sound on a scene
- `musicDrop:{at,until,hit,gain}` cuts the music from the word `at` until the word `until`, with an optional hit sound on the drop. Pair it with a `hold` in `edits.json` so the silence lands.
- `sfx:[{name,at,gain}]` plays a sound on a word, such as `scratch` on a punchline.
- `edits.json` sets the gap after a phrase with `hold`: it sets the gap, longer or shorter, so a value below the natural pause shortens it.
- The `eyes` pose covers the mouth. Don't use it while the presenter is speaking; the lip-sync disappears.
- On long form, check the bottom of the stage: props taller than y 80 touch the captions.

## Real web pages (`webpage`)
Use a real page when the page itself is the proof: a README line, a star count, a licence. Don't record the screen: capture the page, then move over it in the engine, so every move lands on a word and survives re-edits to the audio.
1. Write `projects/<slug>/pages.json`: `[{"id":"lemo-tuned","url":"https://...","top":false,"width":1280,"scale":2,"marks":{"tuned":"The styles are tuned for Claude Opus 5.5"}}]`. A mark is exact text on the page, or `{"css":"selector"}`. `top:true` keeps the page top in the capture.
2. Run `node $T/webshot.mjs projects/<slug>` (`--only id,id` for a few). It fails if a phrase is not on the page, so a highlight can't point at something the page doesn't say. It writes `pages/` and `pages.data.json`, which the build picks up.
3. In a scene: `{"kit":"webpage","page":"lemo-tuned","at":"The catch","x":0,"y":0,"w":100,"anim":"rise","do":[{"do":"focus","mark":"tuned","at":"tuned"}]}` and set `"center":false` on the scene. `focus` scrolls and zooms there, moves the cursor and draws the highlight starting on the word. Several `focus` steps run in order.
- Long form: window height 640 keeps it clear of the captions. Short: `h` about 720 and `zoom` 2.1-2.5 in each focus, `width` 900 and `scale` 3 in the capture, or the text is too small on a phone.
- Check quoted numbers against what the page shows today; pages change after you capture them.
- Use it where the page is the point, about 1 scene in 4. Keep jokes as drawn props.
- Stage empty check: no scene should wait over about 1.5 s for its first prop. Put a `tag` on the scene's first words if it would.
