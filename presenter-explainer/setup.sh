#!/bin/bash
# Presenter Explainer studio: builds ~/PresenterStudio. Safe to re-run. Installs nothing outside that folder.
set -e
SKILL="$(cd "$(dirname "$0")" && pwd)"; S=~/PresenterStudio; mkdir -p $S/projects; cd $S
command -v node >/dev/null || { echo "Node is missing. Install Node 22 or newer from https://nodejs.org"; exit 1; }
command -v ffmpeg >/dev/null || { echo "FFmpeg is missing. Mac: brew install ffmpeg. Windows: winget install Gyan.FFmpeg"; exit 1; }
command -v uv >/dev/null || { echo "uv is missing. Mac: curl -LsSf https://astral.sh/uv/install.sh | sh. Windows: winget install astral-sh.uv"; exit 1; }
[ -d .venv ] || uv venv --python 3.12 .venv
# Windows: uv puts python in .venv/Scripts; add .venv/bin/python so every command in SKILL.md works in Git Bash
if [ -f .venv/Scripts/python.exe ] && [ ! -e .venv/bin/python ]; then mkdir -p .venv/bin; printf '#!/bin/sh\nexec "$(dirname "$0")/../Scripts/python.exe" "$@"\n' > .venv/bin/python; chmod +x .venv/bin/python; fi
PY=.venv/bin/python; [ -f .venv/Scripts/python.exe ] && PY=.venv/Scripts/python.exe
uv pip install --python $PY numpy scipy pillow opencv-python-headless faster-whisper requests
[ -f package.json ] || npm init -y >/dev/null
npm i hyperframes@0.9.9 gsap@3.14.2 puppeteer-core >/dev/null
mkdir -p "$SKILL/engine/lib" && cp node_modules/gsap/dist/gsap.min.js "$SKILL/engine/lib/gsap.min.js"
npx hyperframes browser ensure
echo "ready: $S"
