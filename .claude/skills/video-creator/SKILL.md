---
name: video-creator
type: skill
description: Automatic video creation - generates professional videos end-to-end without interruptions
keywords: [video, generation, ai, automation, emily-higgins]
---

# Video Creator

Fully automatic video creation in 6 steps - no interruptions, no approvals needed.

## What it does

Generates professional videos automatically:

```
Brief → Script (Claude) → Storyboard → Prompts → Images → Animation → Video
```

Takes a simple idea and outputs a finished MP4 in 60-90 minutes.

## How to use

```
/video-creator --brief "Video title" --audience "target people" --message "key point"
```

**Required:**
- `--brief` - Video title
- `--audience` - Who it's for  
- `--message` - Main point

**Optional:**
- `--duration 30` - Length in seconds (default 30)
- `--tone energetic` - Style: energetic, steady, comedic, professional
- `--project name --resume` - Continue a video you started

## Examples

### Create a marketing video

```
/video-creator --brief "Authoflow Features" --audience "ADHD professionals" --message "AI-powered task management" --tone energetic
```

### Create a funny video

```
/video-creator --brief "ADHD Relatable Moments" --audience "ADHD community" --message "Funny daily struggles" --tone comedic --duration 60
```

### Resume an interrupted video

```
/video-creator --project my-video-name --resume
```

## The 6 steps (automatic)

| Step | Time | What happens |
|------|------|--------------|
| **1. Script** | 5-10m | Claude writes a 30-second script with scenes |
| **2. Storyboard** | 5-10m | Claude describes visuals for each scene |
| **3. Prompts** | 2-5m | Claude optimizes prompts for image AI |
| **4. Images** | 10-20m | AI generates images (with auto-retry) |
| **5. Animation** | 15-30m | Animates images with motion effects |
| **6. Assembly** | 5-10m | Assembles final MP4 video |

**Total: ~60-90 minutes, completely automatic**

## Where your video goes

```
outputs/videos/your-video-name/
├── out.mp4           ← Your finished video
├── script.json
├── storyboard.json
├── image-prompts.json
├── images/           ← Generated images
├── clips/            ← Animated clips
└── checkpoint.json   ← For recovery if interrupted
```

## API Keys (optional)

Add to `.env` for better results:

```env
CLAUDE_API_KEY=sk_...        # For better scripts
KIE_API_KEY=sk_...           # For custom images
KLING_API_KEY=sk_...         # For better animation
```

Without them, the skill uses templates (still fully functional for testing).

## Automatic fallbacks

- No Claude key? → Uses template script ✓
- No kie.ai key? → Uses template images ✓
- Kling fails? → Falls back to Remotion ✓
- Image fails? → Retries automatically 3x ✓

**Everything keeps working even if APIs fail.**

## Real examples

### ADHD Productivity Tips
```
/video-creator \
  --brief "3 ADHD Productivity Hacks" \
  --audience "ADHD individuals" \
  --message "Simple strategies to stay focused" \
  --tone energetic
```

Output: 30-second professional video with Claude-written script, AI-generated visuals, smooth animations.

### Product Launch
```
/video-creator \
  --brief "Authoflow Launch" \
  --audience "productivity enthusiasts" \
  --message "Revolutionary ADHD management platform" \
  --tone professional \
  --duration 60
```

Output: 60-second marketing video ready for social media.

## Tips

- **Be specific** - Better brief = better video
- **Test first** - Run once to see if you like the process
- **Check output** - Video saves to `outputs/videos/project-name/out.mp4`
- **Resume anytime** - If it stops, just add `--resume` to continue

## Troubleshooting

**Skill not appearing?**
- Make sure this file is in `.claude/skills/video-creator/SKILL.md`
- Reload Claude Code

**Videos are slow?**
- That's normal - AI generation takes time
- 60-90 minutes is expected for full quality

**Want to check status?**
- Look at `outputs/videos/project-name/checkpoint.json`
- Or just look for `out.mp4` in that folder

---

**Ready?** Start with:

```
/video-creator --brief "My First Video" --audience "everyone" --message "This is awesome"
```

No settings, no config, no waiting. Just results.
