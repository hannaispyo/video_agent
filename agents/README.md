# Authoflow Agents

Custom AI agents and automation workflows for authoflow-marketing.

## Agents

### video-creator
**Emily's Video Creation Agent** - Orchestrates a professional video creation workflow.

Creates cinematic videos through a 6-step process:
1. Script generation (Claude collaboration)
2. Storyboard creation (visual descriptions)
3. Image prompt optimization
4. Image generation (kie.ai)
5. Animation (Kling or Remotion)
6. Final video assembly

**Quick Start:**
```bash
npm run create-video -- --brief "Video Title" --audience "target" --message "key point"
```

**Documentation:** [video-creator/SKILL.md](./video-creator/SKILL.md)

## Architecture

All agents follow this pattern:

```
Agent/
├── SKILL.md                    # User-facing documentation
├── index.ts                    # MCP server / main entry
├── orchestrator.ts             # State machine / flow control
├── workflows/                  # Modular workflow steps
│   ├── step1.ts
│   ├── step2.ts
│   └── ...
├── types.ts                    # TypeScript interfaces
├── config.ts                   # Configuration & defaults
└── templates/                  # JSON templates for workflows
    ├── template1.json
    └── ...
```

## Adding New Agents

1. Create directory: `agents/{agent-name}/`
2. Create core files:
   - `types.ts` - TypeScript interfaces
   - `config.ts` - Configuration
   - `orchestrator.ts` - State machine
   - `workflows/` - Workflow implementations
3. Document in `SKILL.md`
4. Register in `.claude/settings.json` if using MCP
5. Add npm script in `package.json`

## Integration

### MCP Server
Agents integrate with authoflow MCP server at `.claude/worktrees/authoflow-mcp-build/`

Register new tools:
```typescript
server.registerTool("agent_name", {
  description: "...",
  inputSchema: z.object({...}),
  handler: async (params) => {...}
});
```

### CLI Entry Points
Create scripts in `/scripts/` directory:

```bash
npm run create-video        # video-creator agent
npm run create-carousel     # future agent
npm run create-comic        # future agent
```

### Environment Variables
Copy `../config/video-agent.env.template` to project root:
```bash
cp config/video-agent.env.template .env.local
```

Edit with your API keys and settings.

## Development

### File Structure
```
agents/
├── video-creator/
│   ├── SKILL.md              # User docs
│   ├── index.ts              # Exports
│   ├── orchestrator.ts        # State machine
│   ├── types.ts              # Interfaces
│   ├── config.ts             # Config
│   ├── workflows/
│   │   ├── step1.ts
│   │   ├── step2.ts
│   │   └── step3.ts
│   └── templates/
│       ├── template1.json
│       └── ...
├── future-agent/
└── README.md (this file)
```

### Type Safety
All agents use TypeScript with strict mode:

```typescript
interface AgentConfig {
  apiKey: string;
  timeout: number;
  retries: number;
}

async function runAgent(config: AgentConfig): Promise<Result> {
  // Implementation
}
```

### Error Handling
Agents implement checkpoint recovery:

```typescript
class Orchestrator {
  async saveCheckpoint(): Promise<void> { }
  async loadCheckpoint(): Promise<void> { }
  async recover(): Promise<void> { }
}
```

## Testing

Test individual workflows:
```bash
# Test script generation
npx ts-node agents/video-creator/workflows/script-generation.test.ts

# Test storyboarding
npx ts-node agents/video-creator/workflows/storyboard-generation.test.ts
```

Test end-to-end:
```bash
# Create demo project (uses placeholder APIs)
npm run create-video -- --brief "Test Video" --audience "test" --message "test"
```

## Performance

Typical execution times:

| Step | Time | Notes |
|------|------|-------|
| Script | 5-10m | Claude API call |
| Storyboard | 5-10m | Claude API call |
| Prompts | 2-5m | Claude API call |
| Images | 10-20m | Batch requests to kie.ai |
| Animation | 15-30m | Kling API or Remotion |
| Assembly | 5-10m | Remotion rendering |

**Total:** ~60-90 minutes

## Debugging

Enable verbose logging:
```bash
DEBUG=true npm run create-video -- ...
```

This logs:
- API requests/responses
- Checkpoint saves
- Error stack traces
- Timing information

## Contributing

When adding new agents:

1. Follow the established pattern
2. Use TypeScript with strict types
3. Document public APIs in SKILL.md
4. Implement checkpoint recovery
5. Add sample usage in README
6. Register in settings.json if using MCP
