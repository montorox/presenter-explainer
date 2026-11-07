# Presenter Explainer

Make explainer videos with a talking cartoon presenter, from a script and a voice note. No camera, no studio, no editor.

You record your script on your phone. Your coding agent (Claude Code or Codex) times every word, plans the scenes, animates the presenter so her mouth moves on every word, adds props, captions, sound and music, checks its own work and renders an MP4. It makes YouTube videos (16:9) and Shorts, Reels and TikToks (9:16).

This is the same skill I use for my YouTube channel, Chris Ife Studio, with a free presenter called **Remi**.

**Setup guide, help and new presenters: Chris Ife Studio on Skool:** https://www.skool.com/chris-ife-studio-6145

## Install

### The easy way: ask your agent

Open Claude Code or Codex and paste this:

> Read https://github.com/montorox/presenter-explainer and install the skill for me. Set up anything that's missing.

Your agent reads this page, installs what's missing (it asks first), sets up the studio and checks it works. It takes about 10 minutes. Restart your agent when it's done.

Downloaded the files instead? Drag the folder or the zip into your agent and say:

> Read the README in this and install the skill for me. Set up anything that's missing.

### The manual way

What you need:

- A Mac or a Windows PC (Windows support is new: post in Help on Skool if anything goes wrong)
- Claude Code or Codex
- Node 22 or newer: https://nodejs.org
- FFmpeg: Mac `brew install ffmpeg`, Windows `winget install Gyan.FFmpeg`
- uv (for Python): Mac `curl -LsSf https://astral.sh/uv/install.sh | sh`, Windows `winget install astral-sh.uv`
- Google Chrome, only if you want real web pages in your videos

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
   bash ~/.claude/skills/presenter-explainer/setup.sh
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

## For AI agents: how to install this skill

If a user asked you to install this, follow these steps in order. Tell the user what you're doing in plain words.

1. **Get the files.** If you only have this page, run `git clone https://github.com/montorox/presenter-explainer.git` into a temporary folder. If the user gave you a zip or folder, unzip it and find the folder that contains `presenter-explainer/SKILL.md`.
2. **Check the computer.** It runs on macOS and Windows. On Windows, run every command in Git Bash (install Git for Windows with `winget install Git.Git` if it's missing; Claude Code on Windows already uses it). Windows support is new: if a step fails, fix what you can and tell the user exactly what went wrong.
3. **Install what's missing**, asking the user before each install:
   - Node 22 or newer (`node -v`). Mac: `brew install node`. Windows: `winget install OpenJS.NodeJS.LTS`.
   - FFmpeg (`ffmpeg -version`). Mac: `brew install ffmpeg` (no Homebrew? ask before installing it from https://brew.sh). Windows: `winget install Gyan.FFmpeg`.
   - uv (`uv --version`). Mac: `curl -LsSf https://astral.sh/uv/install.sh | sh`. Windows: `winget install astral-sh.uv`.
   - After installing on Windows, open a new terminal so the new tools are on PATH.
4. **Copy the skill folder.** Claude Code: copy `presenter-explainer/presenter-explainer` to `~/.claude/skills/presenter-explainer`. Codex: to `~/.codex/skills/presenter-explainer`. If one is already there, replace it; never touch `~/PresenterStudio`, which holds the user's videos.
5. **Build the studio:** `bash <skills folder>/presenter-explainer/setup.sh`. It installs into `~/PresenterStudio` only and ends with `ready: ...`. If it stops with a message about a missing tool, install that tool (ask first) and run it again. It is safe to re-run.
6. **Check it worked:** `ls ~/PresenterStudio/.venv ~/PresenterStudio/node_modules/hyperframes`, both should exist. On Windows also check `~/PresenterStudio/.venv/bin/python --version` works.
7. **Finish:** tell the user to restart their agent, then try: "Make a 30-second test Short with Remi about why the sky is blue. Write the script first."

## Licence

MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for credits.
