# Presenter Explainer

Make explainer videos with a talking cartoon presenter, from a script and a voice note. No camera, no studio, no editor.

You record your script on your phone. Your coding agent (Claude Code or Codex) times every word, plans the scenes, animates the presenter so her mouth moves on every word, adds props, captions, sound and music, checks its own work and renders an MP4. It makes YouTube videos (16:9) and Shorts, Reels and TikToks (9:16).

This is the same skill I use for my YouTube channel, Chris Ife Studio, with a free presenter called **Remi**.

**Setup guide, help and new presenters: Chris Ife Studio on Skool.** _(link)_

## What you need

- A Mac (this is what it's tested on)
- Claude Code or Codex
- Node 22 or newer: https://nodejs.org
- FFmpeg: `brew install ffmpeg`
- uv (for Python): `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Google Chrome, only if you want real web pages in your videos

## Install

1. Download this repo:

   ```bash
   git clone https://github.com/montorox/presenter-explainer.git
   ```

2. Copy the skill into your agent's skills folder.

   Claude Code:
   ```bash
   mkdir -p ~/.claude/skills && cp -R presenter-explainer/presenter-explainer ~/.claude/skills/
   ```

   Codex:
   ```bash
   mkdir -p ~/.codex/skills && cp -R presenter-explainer/presenter-explainer ~/.codex/skills/
   ```

3. Build the studio (once, takes a few minutes):

   ```bash
   zsh ~/.claude/skills/presenter-explainer/setup.sh
   ```
   (Use `~/.codex/skills/...` if you installed it for Codex.) It creates `~/PresenterStudio`, where your videos live.

4. Restart your agent.

## Make your first video

Tell your agent, in plain English:

> Make a Short with Remi about [your topic]. Write the script first.

Approve the script, record it on your phone, then:

> Here's my recording: [drag the file in]. Make the video.

Your agent checks the stills, renders a preview, and then the final MP4.

Things you can say along the way:

- "Use the night look for the twist."
- "Move the presenter to the left for the chart."
- "Show the real pricing page from [url]."
- "Make the long YouTube version too."

## Good to know

- HyperFrames, the renderer this uses, sends anonymous usage data to HeyGen. Turn it off with `npx hyperframes telemetry disable` inside `~/PresenterStudio`.
- The first voice import downloads the speech model (about 500 MB), once.

## Tips

- Write sentences the screen can show. "Three tools" becomes three cards landing on the word "three".
- Check every number before you record.
- Record in a quiet room. Your phone is fine.
- Listen to the final video before you post it. The agent can't hear audio.

## Licence

MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for credits.
