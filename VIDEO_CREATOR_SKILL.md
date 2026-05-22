# Video Creator Skill

Fully automatic video creation agent - generates professional videos end-to-end without interruptions.

## Quick Start

### As a Skill (Recommended)

Invoke directly in Claude Code:

```
/video-creator \
  --brief "3 ADHD Productivity Hacks" \
  --audience "ADHD individuals" \
  --message "Simple strategies to improve focus"
```

### As CLI

```bash
npm run video-creator -- \
  --brief "3 ADHD Productivity Hacks" \
  --audience "ADHD individuals" \
  --message "Simple strategies to improve focus"
```

### Standalone

```bash
ts-node scripts/video-creator-skill.ts \
  --brief "3 ADHD Productivity Hacks" \
  --audience "ADHD individuals" \
  --message "Simple strategies to improve focus"
```

## Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `brief` | ✅ Yes | Video title | `"3 ADHD Productivity Hacks"` |
| `audience` | ✅ Yes | Target audience | `"ADHD individuals"` |
| `message` | ✅ Yes | Key message | `"Simple strategies to improve focus"` |
| `duration` | ❌ No | Video length (seconds) | `"30"` (default) |
| `tone` | ❌ No | Video tone | `"energetic"` `"steady"` `"comedic"` `"professional"` |
| `project` | ❌ No | Resume project | `"my-video-name"` |
| `resume` | ❌ No | Resume mode | `true` |
| `verbose` | ❌ No | Verbose logging | `true` |

## Examples

### Create a standard video

```
/video-creator \
  --brief "How to Use Authoflow" \
  --audience "productivity enthusiasts" \
  --message "AI-powered ADHD management platform"
```

### Create an energetic marketing video

```
/video-creator \
  --brief "Authoflow Launch" \
  --audience "ADHD community" \
  --message "Revolutionary productivity app" \
  --tone energetic \
  --duration 60
```

### Create a comedy video

```
/video-creator \
  --brief "ADHD Relatable Moments" \
  --audience "ADHD individuals" \
  --message "Funny stories about daily struggles" \
  --tone comedic
```

### Resume interrupted project

```
/video-creator --project my-video-name --resume
```

## Workflow

The skill executes 6 steps automatically:

```
1️⃣  Script generation        (Claude writes 30s script with scenes)
    ↓
2️⃣  Storyboarding            (Claude describes visuals)
    ↓
3️⃣  Image prompts            (Claude optimizes for kie.ai)
    ↓
4️⃣  Image generation         (kie.ai creates images, batch + retry)
    ↓
5️⃣  Animation               (Kling animates, fallback to Remotion)
    ↓
6️⃣  Video assembly          (Remotion creates final MP4)
    ↓
✅ Video output: outputs/videos/{project-name}/out.mp4
```

**Total time: ~60-90 minutes (fully automatic, no interruptions)**

## Output

Videos are saved to:
```
outputs/videos/{project-name}/
├── brief.json              # Input brief
├── script.json             # Generated script
├── storyboard.json         # Visual descriptions
├── image-prompts.json      # Optimized prompts
├── images/                 # Generated PNGs
├── clips/                  # Animated MP4s
├── out.mp4                 # Final video ✅
├── manifest.json           # Complete tracking
└── checkpoint.json         # For recovery
```

## Environment Setup

### Required API Keys

Copy template and add your keys:

```bash
cp config/video-agent.env.template .env
```

Edit `.env`:

```env
# Anthropic Claude - for script/storyboard generation
CLAUDE_API_KEY=sk_...

# kie.ai - for image generation
KIE_API_KEY=sk_...

# Kling - for animation (optional, falls back to Remotion)
KLING_API_KEY=sk_...
```

### Fallbacks (If Keys Not Set)

| API | Fallback | Status |
|-----|----------|--------|
| CLAUDE_API_KEY | Template script | Fully functional |
| KIE_API_KEY | Template images | Fully functional |
| KLING_API_KEY | Remotion animations | Fully functional |

You can test without any API keys - the skill uses templates.

## Features

- ✅ **100% Automatic** - No approval gates, no interruptions
- ✅ **Auto Fallback** - Kling fails → Remotion takes over
- ✅ **Auto Retry** - Failed images retry 3x automatically
- ✅ **Checkpoint Recovery** - Interrupted? Resume from last step
- ✅ **Progress Logging** - Watch status in real-time
- ✅ **Template Mode** - Test without API keys

## Troubleshooting

### Check Project Status

```bash
# Lists all projects and their status
ls -la outputs/videos/
```

### View Recent Logs

```bash
# Check specific project's status
cat outputs/videos/{project-name}/checkpoint.json
```

### Resume Interrupted Project

```
/video-creator --project my-video-name --resume
```

The skill will load from the last completed step.

## Performance

Typical execution:

| Scenario | Time | Notes |
|----------|------|-------|
| **Demo mode** (no APIs) | ~2m | Uses templates |
| **With Claude + kie.ai** | ~30-45m | API calls only |
| **Full end-to-end** | ~60-90m | All APIs + rendering |

## Architecture

```
skill-entry.ts          (CLI wrapper + Skill entry)
  ↓
auto-executor.ts        (Orchestrates full workflow)
  ↓
  ├─ script-generation.ts     (Step 1: Claude script)
  ├─ storyboard-generation.ts (Step 2: Claude visuals)
  ├─ prompt-engineering.ts    (Step 3: Claude prompts)
  ├─ image-generation.ts      (Step 4: kie.ai images)
  ├─ animation-handler.ts     (Step 5: Kling/Remotion)
  └─ video-assembly.ts        (Step 6: Final video)
```

## Next Steps

1. ✅ Set up API keys in `.env`
2. ✅ Run first video with `/video-creator`
3. ✅ Check `outputs/videos/{project-name}/out.mp4`

That's it. Everything else is automatic.
