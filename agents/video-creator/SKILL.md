# Emily's Video Creation Agent

Orchestrates a professional video creation workflow inspired by Emily Higgins' cinematic process.

## Overview

This agent replicates Emily Higgins' end-to-end video creation pipeline:

```
Brief → Script → Storyboard → Image Prompts → Image Generation → Animation → Video Assembly
```

Each step is iterative with user approval gates and checkpoint recovery.

## Quick Start

### Create New Video Project

```bash
npm run create-video -- \
  --brief "Video Title" \
  --audience "target audience" \
  --message "key message" \
  --duration 30 \
  --tone energetic
```

Or run interactively:
```bash
npm run create-video
```

### Resume Existing Project

```bash
npm run resume-video -- --project my-video
```

## Workflow Steps

### 1. Scripting (5-10 min)
- Claude generates a 30-second script with 3-5 scenes
- Each scene includes voiceover copy and visual cues
- User reviews and can request revisions
- Iterates until approved

**Output:** `script.json`

### 2. Storyboarding (5-10 min)
- System breaks script into scenes
- Claude writes visual descriptions for each scene
- Includes cinematography hints (camera angle, motion, lighting)
- User reviews and optionally uploads reference images (Flim style)

**Output:** `storyboard.json`

### 3. Image Prompts (2-5 min)
- Claude transforms visual descriptions into kie.ai prompts
- Optimizes for image model quality and consistency
- Includes animation hints for Kling
- User can manually refine prompts

**Output:** `image-prompts.json`

### 4. Image Generation (10-20 min)
- Batch requests to kie.ai API (5 parallel by default)
- Auto-retry on failures
- User reviews and can regenerate specific scenes
- Saves PNG sequence

**Output:** `images/` directory + `image-manifest.json`

### 5. Animation (15-30 min)
- Primary: Kling API (best quality motion)
- Fallback: Remotion Ken Burns effect
- Creates video clips from static images
- User can review and re-animate specific clips

**Output:** `clips/` directory + `animation-manifest.json`

### 6. Video Assembly (5-10 min)
- Remotion composition combines all clips
- Voiceover audio synced to timing
- Transitions applied between scenes
- Final MP4 rendered

**Output:** `out.mp4`

## Architecture

```
VideoProjectManager (Orchestrator)
  ├── ProjectCheckpoint (State machine)
  ├── workflows/
  │   ├── script-generation.ts (Claude + iterative refinement)
  │   ├── storyboard-generation.ts (Visual descriptions)
  │   ├── prompt-engineering.ts (kie.ai format optimization)
  │   ├── image-generation.ts (kie.ai API wrapper)
  │   ├── animation-handler.ts (Kling + Remotion fallback)
  │   └── video-assembly.ts (Remotion composition)
  └── checkpoint.json (Recovery state)
```

## Environment Variables

### Required
```env
# Claude API (for script/storyboard generation)
CLAUDE_API_KEY=sk_...
CLAUDE_MODEL=claude-opus

# kie.ai (image generation)
KIE_API_KEY=sk_...
```

### Optional
```env
# Kling API (for animation - fallback to Remotion if not set)
KLING_API_KEY=sk_...
KLING_API_ENDPOINT=https://api.kling.ai/v1
KLING_ANIMATION_MODEL=kling-v1

# Agent settings
VIDEO_AUTO_APPROVE_AFTER_MINUTES=0  # 0 = require approval
VIDEO_PROJECT_DIR=./outputs/videos
VIDEO_APPROVAL_REQUIRED=true
```

## Approval Gates

By default, the agent pauses at each major step for user review:

```
┌──────────────────────────────────────┐
│ Script Generated                     │
│ ✓ 4 scenes, 30 seconds              │
│ ✓ Tone: energetic                   │
│                                      │
│ [Preview] [Approve] [Edit] [Cancel] │
└──────────────────────────────────────┘
```

To auto-approve all steps (for testing):
```env
VIDEO_APPROVAL_REQUIRED=false
VIDEO_AUTO_APPROVE_AFTER_MINUTES=0
```

## Checkpoint Recovery

If the process interrupts (network error, API timeout, etc.), the project saves checkpoints.

Resume from the last completed step:
```bash
npm run resume-video -- --project my-video
```

The agent will:
1. Load the last checkpoint
2. Show current progress
3. Offer to continue or restart any step

## Project Structure

Each project generates:

```
outputs/videos/{project-name}/
├── brief.json                    # Input brief
├── checkpoint.json               # Current state (for recovery)
├── script.json                   # Generated script
├── storyboard.json               # Visual descriptions
├── image-prompts.json            # kie.ai prompts
├── images/                       # Generated PNGs
│   ├── scene-01.png
│   ├── scene-02.png
│   └── ...
├── clips/                        # Animated MP4s
│   ├── scene-01-animated.mp4
│   ├── scene-02-animated.mp4
│   └── ...
├── out.mp4                       # Final video
└── manifest.json                 # Complete project manifest
```

## Example: Create Productivity Video

```bash
npm run create-video -- \
  --brief "3 Productivity Hacks for ADHD" \
  --audience "ADHD individuals" \
  --message "Simple strategies to manage hyperfocus and context switching" \
  --duration 30 \
  --tone energetic
```

This will:
1. Generate a 30-second script with 4-5 scenes
2. Create visual storyboard (cinematic, realistic style)
3. Optimize prompts for kie.ai image generation
4. Generate high-quality imagery
5. Animate with motion (Kling or Remotion)
6. Assemble into final MP4

Total time: ~60-90 minutes (depending on API response times)

## Integration with MCP

The agent is designed to integrate with the authoflow MCP server:

```typescript
// MCP tools
"create_video_project" - Start new project
"advance_video_step" - Move to next step
"get_video_status" - Check progress
```

## Advanced Options

### Custom Reference Images

Upload reference images from Flim at the storyboarding step:
```json
{
  "scenes": [
    {
      "sceneNumber": 1,
      "referenceImageUrl": "https://flim.ai/image/12345"
    }
  ]
}
```

The agent will use these as style references for all image generations.

### Manual Prompt Refinement

Edit image prompts manually before generation:

```json
{
  "sceneNumber": 1,
  "basePrompt": "Original description...",
  "customNotes": "Make it more cinematic, add dramatic lighting"
}
```

### Batch Processing

Generate multiple videos from campaign templates:

```bash
npm run create-video -- --from-campaign 3-modos-tdah
```

## Troubleshooting

### "CLAUDE_API_KEY not set"
Set your Anthropic API key:
```bash
export CLAUDE_API_KEY=sk_...
```

### "KIE_API_KEY not set"
The agent will use template images for demonstration. Set the key for real generation:
```bash
export KIE_API_KEY=sk_...
```

### Animation fails with Kling
Agent automatically falls back to Remotion. No action needed.

### Video assembly hangs
Check Remotion is installed:
```bash
npm list remotion
```

## Implementation Status

- ✅ Core types and interfaces
- ✅ VideoProjectManager (orchestrator)
- ✅ Script generation workflow
- ✅ Storyboard generation workflow
- ✅ Image prompt engineering
- ✅ Image generation wrapper
- ✅ Animation handler (stub)
- ✅ Video assembly (stub)
- ⏳ MCP server integration
- ⏳ Terminal UI/approval gates
- ⏳ Full API integration

## Next Steps

1. Implement full MCP server integration
2. Build interactive terminal UI with prompts
3. Connect real API calls for kie.ai/Kling
4. Add full Remotion composition generation
5. Implement voiceover audio syncing
6. Add preview capabilities
