import { Script, Storyboard, VisualScene } from '../types';
import { VIDEO_AGENT_CONFIG } from '../config';

const STORYBOARD_PROMPT = (script: Script) => `
You are a professional cinematographer and visual director. Create a detailed visual storyboard for this video script:

Script:
${JSON.stringify(script, null, 2)}

For each scene, provide:
1. A vivid visual description (30-50 words) describing what appears on screen
2. Cinematography style (e.g., "wide establishing shot", "close-up", "overhead")
3. Camera movement (e.g., "pan left", "zoom in", "static")
4. Lighting mood (e.g., "morning light", "dramatic shadows", "bright and clean")
5. Color palette suggestions

Focus on creating a cohesive, cinematic look that supports the script's message and tone.

Format as JSON:
{
  "title": "${script.title}",
  "scenes": [
    {
      "sceneNumber": 1,
      "visualDescription": "Detailed visual description...",
      "style": "cinematic, realistic",
      "camera": "wide establishing shot",
      "animation": "slow pan left",
      "colorPalette": "warm, earthy tones"
    }
  ]
}
`;

interface StoryboardOptions {
  onProgress?: (message: string) => void;
}

/**
 * Generate visual storyboard from script using Claude
 */
export async function generateStoryboard(
  script: Script,
  options: StoryboardOptions = {}
): Promise<Storyboard> {
  const { onProgress } = options;

  onProgress?.('Generating visual storyboard...');

  if (VIDEO_AGENT_CONFIG.claude.apiKey) {
    return await generateStoryboardWithAPI(script);
  } else {
    console.log('⚠️  Using template storyboard for demonstration');
    return generateTemplateStoryboard(script);
  }
}

/**
 * Generate storyboard using Claude API
 */
async function generateStoryboardWithAPI(script: Script): Promise<Storyboard> {
  const apiKey = VIDEO_AGENT_CONFIG.claude.apiKey;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not set');
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
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: STORYBOARD_PROMPT(script),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const storyboardText = data.content[0].text;

    const jsonMatch = storyboardText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const storyboardJson = JSON.parse(jsonMatch[0]);
    return {
      title: storyboardJson.title,
      duration: script.duration,
      scenes: storyboardJson.scenes.map((scene: any, index: number) => ({
        sceneNumber: scene.sceneNumber || index + 1,
        duration: script.scenes[index]?.duration || 5,
        scriptLine: script.scenes[index]?.scriptLine || '',
        visualDescription: scene.visualDescription,
        imagePromptSeed: scene.visualDescription,
        style: scene.style || 'cinematic',
        camera: scene.camera || 'medium shot',
        animation: scene.animation || 'subtle motion',
      })),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error calling Claude API for storyboard:', error);
    throw error;
  }
}

/**
 * Generate template storyboard for demonstration
 */
function generateTemplateStoryboard(script: Script): Storyboard {
  const visualStyles = [
    { camera: 'wide establishing shot', animation: 'slow pan left', style: 'cinematic' },
    { camera: 'close-up detail', animation: 'zoom in', style: 'modern' },
    { camera: 'overhead flat lay', animation: 'static with movement in frame', style: 'minimalist' },
    { camera: 'medium shot', animation: 'pan right', style: 'documentary' },
    { camera: 'extreme close-up', animation: 'slow zoom', style: 'cinematic' },
  ];

  const visualDescriptions = [
    'A clean, well-lit workspace with morning light streaming through a window. Papers and objects arranged thoughtfully.',
    'Hands interacting with objects on a surface. Precise, purposeful movements. Warm, natural lighting.',
    'A bird\'s eye view of organized items arranged in a meaningful pattern. Soft shadows, clean composition.',
    'A person or subject in their environment, engaged and focused. Atmospheric lighting creating depth.',
    'Details and close-ups revealing texture, emotion, and authenticity. Rich color grading.',
  ];

  const scenes: VisualScene[] = script.scenes.map((scene, index) => {
    const styleIndex = index % visualStyles.length;
    const descIndex = index % visualDescriptions.length;

    return {
      sceneNumber: scene.number,
      duration: scene.duration,
      scriptLine: scene.scriptLine,
      visualDescription: visualDescriptions[descIndex],
      imagePromptSeed: visualDescriptions[descIndex],
      style: visualStyles[styleIndex].style,
      camera: visualStyles[styleIndex].camera,
      animation: visualStyles[styleIndex].animation,
    };
  });

  return {
    title: script.title,
    duration: script.duration,
    scenes,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Update visual descriptions with reference images
 */
export function applyReferenceImages(
  storyboard: Storyboard,
  referenceUrls: Record<number, string>
): Storyboard {
  return {
    ...storyboard,
    scenes: storyboard.scenes.map((scene) => ({
      ...scene,
      referenceImageUrl: referenceUrls[scene.sceneNumber],
    })),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validate storyboard
 */
export function validateStoryboard(storyboard: Storyboard): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!storyboard.title) errors.push('Storyboard must have a title');
  if (!storyboard.scenes || storyboard.scenes.length === 0) {
    errors.push('Storyboard must have at least one scene');
  }

  const totalDuration = storyboard.scenes.reduce((sum, s) => sum + s.duration, 0);
  if (Math.abs(totalDuration - storyboard.duration) > 1) {
    errors.push(`Scene durations (${totalDuration}s) don't match storyboard duration (${storyboard.duration}s)`);
  }

  storyboard.scenes.forEach((scene) => {
    if (!scene.visualDescription) {
      errors.push(`Scene ${scene.sceneNumber} missing visual description`);
    }
    if (!scene.camera) {
      errors.push(`Scene ${scene.sceneNumber} missing camera direction`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
