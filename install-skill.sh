#!/bin/bash
# ============================================================
# install-skill.sh — Video Creator skill installer
# Run from the project root after `git clone` and `npm install`
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$HOME/.claude/skills/video-creator"

echo ""
echo "🎬 Video Creator — Skill Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Prerequisites ─────────────────────────────────────────

echo "▸ Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "  ❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "  ✅ Node $(node --version)"

if ! command -v claude &>/dev/null; then
  echo "  ❌ Claude Code CLI not found."
  echo "     Install from https://claude.ai/download and run: claude login"
  exit 1
fi
echo "  ✅ Claude Code $(claude --version 2>/dev/null | head -1)"

if command -v ffmpeg &>/dev/null; then
  echo "  ✅ FFmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"
else
  echo "  ⚠️  FFmpeg not found — frame continuity will be disabled"
  echo "     Install with: brew install ffmpeg"
fi

echo ""

# ── 2. npm install ───────────────────────────────────────────

echo "▸ Installing dependencies..."
cd "$PROJECT_DIR"
npm install --silent
echo "  ✅ Dependencies installed"
echo ""

# ── 3. .env setup ───────────────────────────────────────────

if [ ! -f "$PROJECT_DIR/.env" ]; then
  cp "$PROJECT_DIR/config/video-agent.env.template" "$PROJECT_DIR/.env"
  echo "▸ Setting up .env..."
  echo ""
  echo "  A KIE API key is required for image generation and animation."
  echo "  Get yours at: https://kie.ai → Dashboard → API Keys"
  echo ""
  read -r -p "  Paste your KIE_API_KEY (or press Enter to skip): " KIE_KEY
  if [ -n "$KIE_KEY" ]; then
    sed -i.bak "s/your-kie-api-key-here/$KIE_KEY/" "$PROJECT_DIR/.env" && rm -f "$PROJECT_DIR/.env.bak"
    echo "  ✅ KIE_API_KEY saved to .env"
  else
    echo "  ⚠️  Skipped — add KIE_API_KEY to .env manually before running videos"
  fi
else
  echo "  ✅ .env already exists — skipping"
fi
echo ""

# ── 4. Install Claude Code skill ─────────────────────────────

echo "▸ Installing /video-creator skill for Claude Code..."
mkdir -p "$SKILL_DIR"

cat > "$SKILL_DIR/SKILL.md" << SKILLEOF
---
name: video-creator
type: skill
description: Automatic video creation - generates professional MP4 videos end-to-end without interruptions
---

# video-creator

Fully automatic video creation in 6 steps — generates a finished MP4 in 60-90 minutes.

**Project directory:** \`$PROJECT_DIR\`

## Usage

**Required — all 3 must be provided:**

\`\`\`
/video-creator --brief "Video Title" --audience "who it's for" --message "main point"
\`\`\`

| Parameter | Description | Example |
|-----------|-------------|---------|
| \`--brief\` | Video title | "3 ADHD Productivity Hacks" |
| \`--audience\` | Target audience | "ADHD individuals" |
| \`--message\` | Main message | "Simple strategies to improve focus" |

**Optional:**
- \`--duration 60\` — Video length in seconds (default: 30)
- \`--tone energetic\` — Tone: energetic, steady, comedic, educational, professional
- \`--style "flat lay con objetos físicos"\` — Visual concept
- \`--motion subtle-camera\` — Motion type: subtle-camera, subject-motion, complex-motion, static
- \`--color-mood warm\` — Palette: warm, cool, vibrant, neutral
- \`--project my-video --resume\` — Resume an interrupted video

## Examples

\`\`\`
/video-creator --brief "Authoflow Launch" --audience "ADHD professionals" --message "AI task management" --tone energetic

/video-creator --brief "3 Focus Tips" --audience "students" --message "Simple techniques" --tone educational --duration 60 --motion static

/video-creator --project authoflow-launch --resume
\`\`\`

## What it does

\`\`\`
1. Script      → Claude writes the script with N scenes       (5-10 min)
2. Voiceover   → Eleven Labs synthesizes audio                (1-2 min)
3. Storyboard  → Claude designs each scene visually           (5-10 min)
4. Prompts     → Claude generates kie.ai image prompts        (2-5 min)
5. Images      → kie.ai (GPT-4o) generates one image/scene   (10-20 min)
6. Animation   → Kling 2.6 animates each image               (15-30 min)
7. Assembly    → Remotion combines clips + audio → out.mp4   (5-10 min)

Total: ~60-90 minutes
\`\`\`

## Execution

When this skill is invoked, run the following command:

\`\`\`bash
cd "$PROJECT_DIR" && npm run video-creator -- "\$@"
\`\`\`

Pass all parameters as-is to the npm script.

## Output

\`\`\`
$PROJECT_DIR/outputs/videos/{project-name}/
├── out.mp4           ← Final video
├── script.json
├── storyboard.json
├── image-prompts.json
├── images/
└── clips/
\`\`\`

## Setup

- **Claude Code CLI** — used automatically for script/storyboard (no API key needed)
- **KIE_API_KEY** — required for images + animation (set in \`.env\`)
- **FFmpeg** — optional, for frame continuity (\`brew install ffmpeg\`)
SKILLEOF

echo "  ✅ Skill installed at $SKILL_DIR"
echo ""

# ── 5. Done ──────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Installation complete!"
echo ""
echo "Usage in Claude Code or Cowork:"
echo ""
echo '  /video-creator --brief "My Video" --audience "my audience" --message "my message"'
echo ""
echo "For Cowork: set your work folder to:"
echo "  $PROJECT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
