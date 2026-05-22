import { Storyboard, ImagePrompts, ImagePrompt } from '../types';
import { VIDEO_AGENT_CONFIG } from '../config';

const PROMPT_ENGINEERING_PROMPT = (storyboard: Storyboard) => `
You are an expert at writing image generation prompts for professional video production.

Transform these visual storyboard descriptions into optimized prompts for the kie.ai image model (GPT-4 compatible).

Storyboard:
${JSON.stringify(storyboard, null, 2)}

For each scene, create a detailed prompt that:
1. Describes the visual scene in vivid detail (100-150 words)
2. Specifies cinematography style and lighting
3. Includes technical parameters (aspect ratio, quality level)
4. Adds animation hints for smooth transitions

Important: Each prompt should be between 100-150 words, specific enough for consistency, but general enough for variation.

Format as JSON array:
[
  {
    "sceneNumber": 1,
    "basePrompt": "Detailed prompt optimized for image generation...",
    "kieaiFormat": {
      "model": "gpt4o-image",
      "prompt": "[exact prompt text]",
      "ar": "16:9",
      "quality": "high"
    },
    "animationHints": {
      "motion": "pan-left",
      "duration": 5,
      "transitions": "crossfade"
    }
  }
]
`;

interface PromptEngineeringOptions {
  onProgress?: (message: string) => void;
}

/**
 * Generate image prompts from storyboard using Claude
 */
export async function engineerPrompts(
  storyboard: Storyboard,
  options: PromptEngineeringOptions = {}
): Promise<ImagePrompts> {
  const { onProgress } = options;

  onProgress?.('Engineering image prompts with Claude...');

  if (VIDEO_AGENT_CONFIG.claude.apiKey) {
    return await engineerPromptsWithAPI(storyboard);
  } else {
    console.log('⚠️  Using template prompts for demonstration');
    return generateTemplatePrompts(storyboard);
  }
}

/**
 * Generate prompts using Claude API
 */
async function engineerPromptsWithAPI(storyboard: Storyboard): Promise<ImagePrompts> {
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
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: PROMPT_ENGINEERING_PROMPT(storyboard),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const promptText = data.content[0].text;

    const jsonMatch = promptText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const promptsArray = JSON.parse(jsonMatch[0]);
    return {
      scenes: promptsArray,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error calling Claude API for prompt engineering:', error);
    throw error;
  }
}

/**
 * Generate template prompts based on storyboard
 */
function generateTemplatePrompts(storyboard: Storyboard): ImagePrompts {
  const motionTypes = ['pan-left', 'pan-right', 'zoom-in', 'zoom-out', 'static', 'dolly-forward'];

  const prompts: ImagePrompt[] = storyboard.scenes.map((scene, index) => {
    const basePrompt = `${scene.visualDescription}. Cinematography style: ${scene.style}. Camera angle: ${scene.camera}. Lighting: professional, cinematic. Resolution: 1920x1080. High quality, detailed, professional video production style.`;

    return {
      sceneNumber: scene.sceneNumber,
      basePrompt,
      kieaiFormat: {
        model: 'gpt4o-image',
        prompt: basePrompt,
        ar: '16:9',
        quality: VIDEO_AGENT_CONFIG.image.quality,
      },
      animationHints: {
        motion: motionTypes[index % motionTypes.length],
        duration: scene.duration,
        transitions: 'crossfade',
      },
    };
  });

  return {
    scenes: prompts,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Enhance prompt with quality parameters
 */
export function enhancePrompt(basePrompt: string, quality: 'high' | 'normal' | 'fast'): string {
  const qualityAddons = {
    high: ', ultra-detailed, professional quality, 8K resolution, cinema4D, ray-traced',
    normal: ', detailed, professional quality, 4K resolution',
    fast: ', decent quality, 1080p resolution',
  };

  return basePrompt + qualityAddons[quality];
}

/**
 * Validate prompts
 */
export function validatePrompts(prompts: ImagePrompts): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!prompts.scenes || prompts.scenes.length === 0) {
    errors.push('Prompts must have at least one scene');
  }

  prompts.scenes.forEach((prompt) => {
    if (!prompt.basePrompt) {
      errors.push(`Scene ${prompt.sceneNumber} missing base prompt`);
    }
    if (!prompt.kieaiFormat || !prompt.kieaiFormat.prompt) {
      errors.push(`Scene ${prompt.sceneNumber} missing kieai format`);
    }
    if (!prompt.animationHints) {
      errors.push(`Scene ${prompt.sceneNumber} missing animation hints`);
    }

    // Check prompt length (should be 100-200 words)
    const wordCount = prompt.basePrompt.split(' ').length;
    if (wordCount < 50) {
      errors.push(`Scene ${prompt.sceneNumber} prompt too short (${wordCount} words)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Allow user to manually adjust prompts
 */
export function updatePrompt(
  prompts: ImagePrompts,
  sceneNumber: number,
  newPrompt: string
): ImagePrompts {
  return {
    ...prompts,
    scenes: prompts.scenes.map((prompt) => {
      if (prompt.sceneNumber === sceneNumber) {
        return {
          ...prompt,
          basePrompt: newPrompt,
          kieaiFormat: {
            ...prompt.kieaiFormat,
            prompt: newPrompt,
          },
        };
      }
      return prompt;
    }),
    generatedAt: new Date().toISOString(),
  };
}
