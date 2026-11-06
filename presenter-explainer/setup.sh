#!/bin/zsh
# Presenter Explainer studio: builds ~/PresenterStudio. Safe to re-run. Installs nothing outside that folder.
set -e
SKILL=${0:A:h}; S=~/PresenterStudio; mkdir -p $S/projects; cd $S
command -v node >/dev/null || { echo "Node is missing. Install Node 22 or newer from https://nodejs.org"; exit 1; }
command -v ffmpeg >/dev/null || { echo "FFmpeg is missing: brew install ffmpeg"; exit 1; }
command -v uv >/dev/null || { echo "uv is missing: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1; }
[ -d .venv ] || uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python numpy scipy pillow opencv-python-headless faster-whisper requests
[ -f package.json ] || npm init -y >/dev/null
npm i hyperframes@0.9.9 gsap@3.14.2 puppeteer-core >/dev/null
mkdir -p $SKILL/engine/lib && cp node_modules/gsap/dist/gsap.min.js $SKILL/engine/lib/gsap.min.js
npx hyperframes browser ensure
echo "ready: $S"
