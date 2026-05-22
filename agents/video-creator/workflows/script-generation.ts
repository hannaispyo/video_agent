import { VideoBrief, Script, Scene } from '../types';
import { VIDEO_AGENT_CONFIG } from '../config';

const SCRIPT_GENERATION_PROMPT = (brief: VideoBrief) => `
You are a professional video scriptwriter. Create a ${brief.duration || 30}-second video script for the following brief:

Title: ${brief.title}
Target Audience: ${brief.audience}
Key Message: ${brief.keyMessage}
Tone: ${brief.tone || 'professional'}

Requirements:
- Break the script into 3-5 scenes
- Each scene should be 5-10 seconds
- Write natural, engaging voiceover copy
- Include visual cues for each scene (what you'll see/do in the video)
- Make it compelling and hook the viewer in the first 3 seconds

Format your response as JSON with this structure:
{
  "title": "Script Title",
  "duration": ${brief.duration || 30},
  "tone": "${brief.tone || 'professional'}",
  "scenes": [
    {
      "number": 1,
      "duration": 5,
      "scriptLine": "Exact voiceover text",
      "visualDescription": "What happens on screen"
    }
  ],
  "musicMood": "Suggested music style"
}
`;

interface ScriptGenerationOptions {
  useClaudeAPI?: boolean;
  onProgress?: (message: string) => void;
}

/**
 * Generate a video script using Claude (either API or placeholder)
 * For now, returns a template script. In production, calls Claude Opus API
 */
export async function generateScript(
  brief: VideoBrief,
  options: ScriptGenerationOptions = {}
): Promise<Script> {
  const { onProgress } = options;

  onProgress?.('Generating script with Claude...');

  // TODO: Call Claude Opus API when CLAUDE_API_KEY is available
  // For now, return a template script that demonstrates the structure
  if (VIDEO_AGENT_CONFIG.claude.apiKey) {
    return await generateScriptWithAPI(brief);
  } else {
    console.log('⚠️  CLAUDE_API_KEY not set. Using template script for demonstration.');
    return generateTemplateScript(brief);
  }
}

/**
 * Generate script using Claude Opus API (requires CLAUDE_API_KEY)
 */
async function generateScriptWithAPI(brief: VideoBrief): Promise<Script> {
  const apiKey = VIDEO_AGENT_CONFIG.claude.apiKey;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not set in environment');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: VIDEO_AGENT_CONFIG.claude.model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: SCRIPT_GENERATION_PROMPT(brief),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const scriptText = data.content[0].text;

    // Parse JSON from response
    const jsonMatch = scriptText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const scriptJson = JSON.parse(jsonMatch[0]);
    return {
      ...scriptJson,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Generate template script for demonstration
 */
function generateTemplateScript(brief: VideoBrief): Script {
  const duration = brief.duration || 30;
  const sceneCount = Math.max(2, Math.ceil(duration / 8));

  const scenes: Scene[] = [];
  const baseDuration = Math.floor(duration / sceneCount);
  let remainingTime = duration;

  // Scene 1: Hook
  const scene1Duration = Math.min(3, duration - (sceneCount - 1) * baseDuration);
  scenes.push({
    number: 1,
    duration: scene1Duration,
    scriptLine: `Did you know? ${brief.keyMessage}`,
    voiceover: `Did you know? ${brief.keyMessage}`,
  });
  remainingTime -= scene1Duration;

  // Middle scenes: Main content
  for (let i = 2; i < sceneCount; i++) {
    scenes.push({
      number: i,
      duration: baseDuration,
      scriptLine: `[Scene ${i}: Main content point]`,
      voiceover: `[Content for ${brief.audience}]`,
    });
    remainingTime -= baseDuration;
  }

  // Final scene: CTA - gets remaining time to ensure exact duration
  if (sceneCount > 1) {
    scenes.push({
      number: sceneCount,
      duration: Math.max(1, remainingTime),
      scriptLine: 'Take action today.',
      voiceover: 'Take action today.',
    });
  }

  return {
    title: brief.title,
    duration,
    tone: brief.tone || 'professional',
    scenes,
    musicMood: brief.tone === 'energetic' ? 'upbeat' : 'cinematic',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Refine a script based on user feedback
 * In production, would loop with Claude for iterative refinement
 */
export async function refineScript(script: Script, feedback: string): Promise<Script> {
  console.log(`Refining script based on feedback: "${feedback}"`);

  // TODO: Call Claude API with refinement prompt
  // For now, just mark as refined
  return {
    ...script,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validate script quality
 */
export function validateScript(script: Script): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!script.title) errors.push('Script must have a title');
  if (!script.scenes || script.scenes.length === 0) errors.push('Script must have at least one scene');
  if (script.duration <= 0) errors.push('Script duration must be positive');

  const totalDuration = script.scenes.reduce((sum, s) => sum + s.duration, 0);
  if (Math.abs(totalDuration - script.duration) > 1) {
    errors.push(`Scene durations (${totalDuration}s) don't match script duration (${script.duration}s)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
