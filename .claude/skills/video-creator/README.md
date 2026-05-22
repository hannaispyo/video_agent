# Video Creator Skill

This is a Claude Code skill for automatic video creation.

## Structure

```
.claude/skills/video-creator/
├── SKILL.md          ← Skill definition and documentation
├── index.ts          ← Entry point for skill execution
└── README.md         ← This file
```

## How it works

1. **SKILL.md** - Defines the skill with frontmatter metadata
   - Shows up in Claude Code's skill menu
   - Provides usage examples
   - Documents parameters

2. **index.ts** - Executes when skill is invoked
   - Validates parameters
   - Calls the actual video creator agent
   - Returns results to Claude Code

## Using the skill

In Claude Code, type:

```
/video-creator --brief "Title" --audience "target" --message "key"
```

## Parameters

See SKILL.md for full parameter documentation.

Required:
- `--brief` - Video title
- `--audience` - Target audience
- `--message` - Key message

Optional:
- `--duration` - Video length (default: 30s)
- `--tone` - Style (energetic, steady, comedic, professional)
- `--project` + `--resume` - Continue interrupted video

## Integration with agent

When invoked, this skill triggers the full video creation agent:
- `agents/video-creator/` - Main agent code
- `agents/video-creator/workflows/` - Step implementations

## Next steps

1. Ensure `.env` has API keys (optional for testing)
2. Invoke with `/video-creator --brief "..."`
3. Video appears in `outputs/videos/{project-name}/out.mp4`
