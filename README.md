# Video Creator - Emily's Professional Video Generation Agent

Automatic cinematic video creation with advanced visual enhancements. Generate professional-grade videos end-to-end without interruptions using AI-powered script generation, storyboarding, and visual coherence validation.

## Features

### Core Video Creation
- **6-Step Workflow:** Script generation → Storyboarding → Prompt optimization → Image generation → Animation → Assembly
- **Automatic Execution:** Runs to completion without approval gates
- **Checkpoint Recovery:** Resume interrupted projects without re-running completed steps
- **Multiple Output Formats:** MP4, frame sequences, visual reports

### Visual Enhancement Suite

#### 1. Color Schemes & Cinematographic References
**Requirement:** `CLAUDE_API_KEY`

The agent generates detailed color palettes and cinematographic inspiration for each scene:
- Primary, secondary, and accent colors (hex format)
- Mood selection: warm, cool, vibrant, neutral
- Grading style: cinematic, modern, vintage, documentary
- Movie/TV show references with visual inspiration briefs

**Example output:**
```json
{
  "colorScheme": {
    "primary": "#FF6B6B",
    "secondary": "#4ECDC4",
    "accent": "#FFE66D",
    "mood": "warm",
    "grading": "cinematic"
  },
  "cinematicReference": {
    "tvShow": "The Bear",
    "style": "warm golden hour lighting",
    "inspirationBrief": "Professional kitchen cinematography with dramatic shadows"
  }
}
```

#### 2. Kling 3.0 Motion Options
**Requirement:** `KLING_API_KEY`

Enhanced motion parameter support for professional video animations:
- **Subtle Camera Motion:** Gentle pans, zooms, tilts (intensity: 0-50%)
- **Subject Motion:** Person or object movement with stable camera (intensity: 20-60%)
- **Complex Motion:** Coordinated camera and subject movement (intensity: 40-100%)
- **Static:** No camera motion, focus on lighting and composition

Each option includes speed, intensity, and subject-specific motion hints for fine-grained control over animation style.

**Example:**
```json
{
  "motionOption": {
    "type": "subtle-camera",
    "camera": {
      "motion": "pan-left",
      "speed": "slow",
      "intensity": 25
    },
    "description": "Smooth camera pan revealing scene details"
  }
}
```

#### 3. Frame Continuity System
**Requirement:** FFmpeg installed (`brew install ffmpeg`)

Automatically links the final frame of one video clip to the start frame of the next, ensuring visual continuity across scene transitions:
- Extracts final frame of each animated clip as high-quality PNG
- Provides frame continuity hints to animation engine
- Eliminates jump cuts between scenes
- Gracefully degrades if FFmpeg unavailable

**How it works:**
1. Scene 1 animates and completes
2. Final frame extracted and saved
3. Scene 2 animation begins with Scene 1's final frame as starting point
4. Smooth visual transition without discontinuity

#### 4. Visual Coherence Validator
**Requirement:** None (always enabled)

Analyzes visual consistency across all scenes and provides actionable feedback:

**Color Consistency:** Checks RGB distance between consecutive scenes (0-100 scale)
- Flags large color jumps (>100 RGB distance)
- Detects excessive mood changes (3+ mood shifts)
- Recommends color grading adjustments

**Motion Flow:** Analyzes camera movement intensity progression
- Detects abrupt motion intensity jumps (>50%)
- Scores smooth motion transitions (0-100)
- Flags overuse of extreme motions

**Style Consistency:** Validates grading and cinematographic choices
- 1 consistent style = 100 score (perfect)
- 2 styles = 90 (acceptable)
- 3 styles = 70 (borderline)
- 4+ styles = 40 (needs review)

**Sample report:**
```
Overall Score: 73/100
  ├─ Color Consistency: 68/100
  ├─ Motion Flow: 75/100
  └─ Style Consistency: 78/100

Issues detected:
  ⚠️  Scene 1→2: Large color jump (RGB distance: 145)
  ⚠️  Scene 2→3: Motion intensity jump 40% → 100% (150% increase)

Recommendation: Good coherence, minor style variations. Consider adjusting Scene 2 motion intensity or lighting.
```

## Quick Start

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd authoflow-video-creator
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp config/video-agent.env.template .env
# Edit .env with your API keys
```

### Get API Keys

- **Claude API:** https://console.anthropic.com
- **kie.ai Images:** https://kie.ai/dashboard
- **Kling AI Animation:** https://kling.ai/dashboard

### Create Your First Video

```bash
npm run video-creator -- \
  --brief "3 Productivity Tips for ADHD" \
  --audience "ADHD professionals" \
  --message "Simple strategies to improve focus"
```

Or as a CLI command:
```bash
npx ts-node scripts/video-creator-skill.ts \
  --brief "3 Productivity Tips for ADHD" \
  --audience "ADHD professionals" \
  --message "Simple strategies to improve focus"
```

## Configuration

### Environment Setup

Copy and configure the template:
```bash
cp config/video-agent.env.template .env
```

### Feature Toggles

Features are automatically enabled/disabled based on API key availability:

| Feature | Enabled If | Fallback |
|---------|-----------|----------|
| Color Schemes | `CLAUDE_API_KEY` set | Basic colors, no mood |
| Cinematographic References | `CLAUDE_API_KEY` set | Generic style hints |
| Motion Options | `KLING_API_KEY` set | Static/minimal motion |
| Frame Continuity | FFmpeg installed | No frame linking |
| Visual Coherence | Always | Always enabled |

### Configuration File

Key settings in `agents/video-creator/config.ts`:

```typescript
// Visual enhancement thresholds
coherenceThresholds: {
  colorAcceptable: 70,      // Acceptable color coherence score
  motionAcceptable: 70,     // Acceptable motion flow score
  styleAcceptable: 70,      // Acceptable style consistency score
  overallMinimum: 60        // Warn if overall < 60
}

// Available options
defaults: {
  colorMoodOptions: ['warm', 'cool', 'vibrant', 'neutral'],
  gradingStyles: ['cinematic', 'modern', 'vintage', 'documentary'],
  motionTypes: ['subtle-camera', 'subject-motion', 'complex-motion', 'static'],
  motionIntensityRange: { min: 0, max: 100 }
}
```

## Usage

### Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `brief` | ✅ Yes | Video title | `"3 ADHD Productivity Hacks"` |
| `audience` | ✅ Yes | Target audience | `"ADHD individuals"` |
| `message` | ✅ Yes | Key message | `"Simple strategies to improve focus"` |
| `duration` | ❌ No | Video length (seconds) | `"30"` (default) |
| `tone` | ❌ No | Video tone | `"energetic"`, `"steady"`, `"comedic"`, `"professional"` |
| `project` | ❌ No | Resume project | `"my-video-name"` |
| `resume` | ❌ No | Resume mode | `"true"` |
| `verbose` | ❌ No | Verbose logging | `"true"` |

### Output Files

Each video project generates:
```
outputs/videos/{project-name}/
├── script.json                      # Script with voiceover text
├── storyboard.json                  # Visual descriptions + enhancements
├── image-prompts.json               # Kling-optimized image prompts
├── images/                          # Generated images (PNG sequence)
│   ├── scene-1.png
│   ├── scene-2.png
│   └── ...
├── clips/                           # Animated video clips (MP4)
│   ├── scene-1.mp4
│   ├── scene-2.mp4
│   └── ...
├── visual-coherence-report.json     # Coherence analysis
├── frame-continuity-manifest.json   # Frame link tracking (if FFmpeg available)
└── out.mp4                          # Final assembled video
```

### Usage Examples

#### Basic Video
```bash
npm run video-creator -- \
  --brief "5 Morning Habits" \
  --audience "Busy professionals" \
  --message "Start your day intentionally"
```

#### With Custom Tone
```bash
npm run video-creator -- \
  --brief "Social Media Tips" \
  --audience "Content creators" \
  --message "Grow your audience authentically" \
  --tone "energetic"
```

#### Resume Interrupted Project
```bash
npm run video-creator -- \
  --project "social-media-tips" \
  --resume true
```

#### Verbose Logging
```bash
npm run video-creator -- \
  --brief "Test Video" \
  --audience "test" \
  --message "testing" \
  --verbose true
```

## Setup Guide

### System Requirements

- Node.js 18 or higher
- FFmpeg (optional, for frame continuity)

### Install FFmpeg

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
apt-get install ffmpeg
```

**Windows (Chocolatey):**
```bash
choco install ffmpeg
```

Or download from https://ffmpeg.org/download.html

### Verify Installation

```bash
# Check Node.js
node --version      # Should be v18+

# Check FFmpeg (optional)
ffmpeg -version     # If you need frame continuity
```

### Set Up API Keys

1. **Claude API:**
   - Visit https://console.anthropic.com
   - Create a new API key
   - Add to `.env`: `CLAUDE_API_KEY=sk_...`

2. **kie.ai:**
   - Visit https://kie.ai/dashboard
   - Create API key
   - Add to `.env`: `KIE_API_KEY=sk_...`

3. **Kling AI:**
   - Visit https://kling.ai/dashboard
   - Create API key
   - Add to `.env`: `KLING_API_KEY=sk_...`

## Project Structure

```
.
├── agents/
│   └── video-creator/
│       ├── SKILL.md                     # Skill documentation
│       ├── orchestrator.ts              # Main orchestration logic
│       ├── auto-executor.ts             # Automatic execution flow
│       ├── config.ts                    # Configuration & defaults
│       ├── types.ts                     # TypeScript interfaces
│       ├── workflows/
│       │   ├── script-generation.ts     # Claude script generation
│       │   ├── storyboard-generation.ts # Visual descriptions
│       │   ├── prompt-engineering.ts    # Image prompt optimization
│       │   ├── image-generation.ts      # kie.ai integration
│       │   ├── animation.ts             # Kling/Remotion animation
│       │   ├── assembly.ts              # Final video assembly
│       │   └── validators/
│       │       ├── frame-continuity.ts  # Frame linking
│       │       └── visual-coherence.ts  # Coherence analysis
│       ├── templates/                   # JSON templates
│       └── index.ts                     # Exports
├── scripts/
│   ├── video-creator-skill.ts           # CLI entry point
│   └── create-video.js                  # Auto-executor script
├── config/
│   └── video-agent.env.template         # Environment template
├── docs/                                # Documentation
├── outputs/                             # Generated videos
├── package.json
├── tsconfig.json
├── README.md (this file)
└── VIDEO_CREATOR_SKILL.md              # Skill frontend
```

## Troubleshooting

### "Frame continuity failed"
**Problem:** Frame continuity not working
**Solution:**
- Ensure FFmpeg is installed: `ffmpeg -version`
- Install FFmpeg: `brew install ffmpeg` (or `apt-get install ffmpeg`)
- Frame continuity is optional; video still generates without it
- Set `FFMPEG_AVAILABLE=false` to disable frame continuity checks

### "Color schemes not generating"
**Problem:** Color schemes missing from storyboard
**Solution:**
- Verify `CLAUDE_API_KEY` is set in `.env`
- Check API key validity at https://console.anthropic.com
- Ensure API key has sufficient credits/quota
- Check console logs for Claude API errors
- Try running with `--verbose true`

### "Motion options not applied"
**Problem:** Motion parameters ignored or Kling failing
**Solution:**
- Verify `KLING_API_KEY` is set in `.env`
- Check Kling API endpoint accessibility
- Confirm Kling model availability in your region
- Check Kling dashboard for API errors
- Fallback occurs automatically if Kling unavailable

### "Visual coherence report missing"
**Problem:** No coherence analysis in output
**Solution:**
- Coherence validation should always run
- Check `outputs/{project}/visual-coherence-report.json` exists
- If missing, check console logs for validation errors
- Ensure all scene images were generated successfully

### "API errors in logs"
**Problem:** Repeated API timeouts or authentication errors
**Solution:**
- Verify all API keys are valid
- Check network connectivity
- Increase timeout values in `agents/video-creator/config.ts`
- Try running with fewer scenes: `--duration 15`
- Check API dashboards for rate limiting

## Performance

Typical execution times:

| Step | Time | Notes |
|------|------|-------|
| Script | 5-10m | Claude API call |
| Storyboard | 5-10m | Claude API call with enhancements |
| Prompts | 2-5m | Claude optimization |
| Images | 10-20m | Batch requests to kie.ai |
| Animation | 15-30m | Kling API or Remotion |
| Assembly | 5-10m | Video composition |

**Total:** 60-90 minutes for typical 30-second video with 5-6 scenes

**Factors affecting speed:**
- Number of scenes (more scenes = longer time)
- Video duration (longer videos = longer animation)
- Image quality setting (high > normal > fast)
- API response times (varies by service)

## Development

### Running Locally

Install dependencies:
```bash
npm install
```

Compile TypeScript:
```bash
npm run build
```

Run in development mode:
```bash
DEBUG=true npm run video-creator -- --brief "Test" --audience "test" --message "test"
```

### Testing Individual Components

Test script generation:
```bash
npx ts-node agents/video-creator/workflows/script-generation.test.ts
```

Test storyboarding:
```bash
npx ts-node agents/video-creator/workflows/storyboard-generation.test.ts
```

Test end-to-end:
```bash
npm run video-creator -- --brief "Test Video" --audience "test" --message "testing"
```

### Debugging

Enable verbose logging:
```bash
DEBUG=true npm run video-creator -- \
  --brief "Test" \
  --audience "test" \
  --message "test" \
  --verbose true
```

This logs:
- All API requests and responses
- Checkpoint saves and loads
- Full error stack traces
- Execution timing information
- Feature availability status

## Architecture

### Workflow Steps

1. **Script Generation:** Claude creates narrative script with scenes
2. **Storyboarding:** Visual descriptions with enhanced metadata (color, cinematography, motion)
3. **Prompt Engineering:** Kling-optimized image prompts with motion hints
4. **Image Generation:** Batch image creation via kie.ai
5. **Animation:** Video clip generation with motion via Kling or Remotion
6. **Assembly:** Frame continuity linking + final video composition
7. **Validation:** Visual coherence analysis and report generation

### Component Interaction

```
User Input
    ↓
Script Generation (Claude)
    ↓
Enhanced Storyboarding (Claude + Color Schemes)
    ↓
Prompt Engineering (Kling Hints)
    ↓
Image Generation (kie.ai)
    ↓
Animation (Kling/Remotion + Motion Options)
    ↓
Frame Continuity (FFmpeg)
    ↓
Assembly & Composition
    ↓
Visual Coherence Validation
    ↓
Final Video Output + Reports
```

### Checkpoint System

Projects are checkpointed after each major step. Resume using:
```bash
npm run video-creator -- --project "my-project" --resume true
```

This:
- Skips completed steps
- Reuses cached images/clips
- Continues from interruption point
- Saves computation time

## Contributing

To extend visual enhancement features:

1. **Add new validator:**
   Create `agents/video-creator/validators/my-validator.ts`

2. **Update config:**
   Add toggle to `VISUAL_ENHANCEMENT_CONFIG` in `agents/video-creator/config.ts`

3. **Wire up:**
   Integrate in `agents/video-creator/auto-executor.ts`

4. **Document:**
   Add section to this README

5. **Test:**
   Run full workflow and verify output

## License

MIT

---

**Created:** 2026-05-22
**Version:** 2.0 (Visual Enhancements)
**Status:** Production Ready
