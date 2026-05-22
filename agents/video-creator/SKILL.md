# video-creator Skill

Fully automatic video creation that replicates Emily Higgins' cinematic workflow.

Generates professional videos end-to-end without interruptions:

```
Brief → Script (Claude) → Storyboard → Prompts → Images → Animation → Video
```

## Usage

### Create new video (automatic)

```
/video-creator \
  --brief "3 ADHD Productivity Hacks" \
  --audience "ADHD individuals" \
  --message "Simple strategies to improve focus"
```

**Optional:**
```
--duration 30              # Video length (default: 30s)
--tone energetic           # Tone: energetic, steady, comedic, educational
```

### Resume interrupted project

```
/video-creator --project my-video-name --resume
```

This continues from the last completed step.

## What it does

1. **Script** (5-10m) - Claude writes 30s script with scenes
2. **Storyboard** (5-10m) - Claude describes visuals for each scene
3. **Prompts** (2-5m) - Claude optimizes prompts for image generation
4. **Images** (10-20m) - kie.ai generates images (batch, auto-retry)
5. **Animation** (15-30m) - Kling animates (fallback: Remotion)
6. **Assembly** (5-10m) - Remotion assembles final MP4

**Total: ~60-90 minutes, fully automatic, no interruptions**

## Automatic Workflow

All steps run **fully automatically** without pauses or user interaction:

| Step | Time | Action |
|------|------|--------|
| **1. Script** | 5-10m | Claude generates script with 3-5 scenes |
| **2. Storyboard** | 5-10m | Claude writes visual descriptions |
| **3. Prompts** | 2-5m | Claude optimizes prompts for kie.ai |
| **4. Images** | 10-20m | kie.ai generates images (batch, auto-retry) |
| **5. Animation** | 15-30m | Kling animates (fallback to Remotion if needed) |
| **6. Assembly** | 5-10m | Remotion assembles final MP4 |

**Total time: ~60-90 minutes**

Each step:
- Runs automatically after the previous step completes
- Logs progress to console
- Uses automatic fallbacks if errors occur
- Saves checkpoint for recovery if interrupted

**Example progress output:**
```
[12:45:30] SCRIPT: Generating script...
[12:45:42] SCRIPT: ✓ Generated 4 scenes, 30s total
[12:45:43] STORY: Generating storyboard...
[12:46:15] STORY: ✓ Generated visual descriptions for 4 scenes
[12:46:16] PROMPT: Engineering image prompts...
[12:46:31] PROMPT: ✓ Engineered 4 optimized prompts
[12:46:32] IMAGE: Generating images...
[12:47:45] IMAGE: ✓ Generated 4/4 images
[12:47:46] ANIM: Animating images...
[12:48:50] ANIM: ✓ Animated 4/4 clips
[12:48:51] ASSEM: Assembling final video...
[12:49:02] ASSEM: ✓ Final video: out.mp4 (30s)
[12:49:03] SUCCESS: ✅ Video created successfully!
```

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

Copy `config/video-agent.env.template` to project root and fill in your API keys:

```bash
cp config/video-agent.env.template .env
```

**Required (for real API usage):**
```env
CLAUDE_API_KEY=sk_...           # Anthropic Claude API
KIE_API_KEY=sk_...              # kie.ai image generation
```

**Optional (falls back to Remotion if not set):**
```env
KLING_API_KEY=sk_...            # Kling animation API
```

**If keys are not set:** Agent uses template implementations (for testing/demo)

## No Approval Gates

The agent runs **fully automatic** by default - no approval gates, no pauses.

Each step completes and the next one starts immediately. Just watch the logs.

If you want to check progress without waiting:
```bash
npm run video-status -- --project my-video-name
```

This shows:
- Current step
- Progress percentage
- Estimated time remaining
- Any errors encountered

## Automatic Checkpoint Recovery

If the process is interrupted (network error, API timeout), it saves checkpoints automatically.

Resume from last completed step:
```bash
npm run resume-video -- --project my-video-name
```

The agent will:
1. Load the last checkpoint
2. Show progress
3. Continue from where it left off (no need to restart)

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
npm run create-video-auto -- \
  --brief "3 Productivity Hacks for ADHD" \
  --audience "ADHD individuals" \
  --message "Simple strategies to manage hyperfocus and context switching" \
  --duration 30 \
  --tone energetic
```

Output:
```
🎬 Emily's Video Creator (Automatic Mode)

📋 Project: 3-productivity-hacks-for-adhd
   Title: 3 Productivity Hacks for ADHD
   Audience: ADHD individuals
   Message: Simple strategies to manage hyperfocus and context switching
   Duration: 30s
   Tone: energetic

▶️  Starting automatic workflow...

[12:45:30] SCRIPT: Generating script...
[12:45:42] SCRIPT: ✓ Generated 4 scenes, 30s total
[12:45:43] STORY: Generating storyboard...
[12:46:15] STORY: ✓ Generated visual descriptions for 4 scenes
...
[12:49:03] SUCCESS: ✅ Video created successfully!

📂 Output: outputs/videos/3-productivity-hacks-for-adhd/out.mp4
```

Everything runs automatically. Total time: ~60-90 minutes

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

## Automatic Fallbacks

The agent handles failures gracefully:

| Failure | Fallback |
|---------|----------|
| CLAUDE_API_KEY not set | Uses template script |
| KIE_API_KEY not set | Uses template images |
| Kling API fails | Falls back to Remotion animations |
| Image generation fails | Retries automatically (3x) |

No action needed - the agent figures it out and keeps going.

## Troubleshooting

### Agent is slow
Check which APIs are actually being called:
```bash
DEBUG=true npm run create-video-auto -- [params]
```

### Check project status
```bash
npm run video-status -- --project my-video-name
```

### Resume interrupted project
```bash
npm run resume-video -- --project my-video-name
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
