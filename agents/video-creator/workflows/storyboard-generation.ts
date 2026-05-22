import { Script, Storyboard, VisualScene } from '../types';
import { VIDEO_AGENT_CONFIG } from '../config';

const STORYBOARD_PROMPT = (script: Script) => `
You are a cinematographer and art director helping create professional cinematic videos.

Create a visual storyboard for this ${script.duration}s video script, including:
1. Detailed visual descriptions for each scene (50-100 words)
2. Color palette recommendations (primary, secondary, accent colors in hex)
3. Cinematographic style (cinematic, modern, vintage, documentary)
4. Mood (warm golden hour, cool blue tones, vibrant, etc.)
5. Cinematic inspiration (reference a movie, TV show, or visual style)
6. Camera motion specifics (pan, zoom, dolly, static)
7. Subject motion if applicable (hand movements, people walking, etc.)
8. Frame continuity hints (if this scene should link to previous via final frame)

Script:
${JSON.stringify(script, null, 2)}

For each scene, create a JSON object with these fields:
{
  "sceneNumber": 1,
  "visualDescription": "Detailed description...",
  "colorScheme": {
    "primary": "#FF6B35",
    "secondary": "#004E89",
    "accent": "#F7B801",
    "mood": "warm",
    "grading": "cinematic"
  },
  "motionOption": {
    "type": "subtle-camera",
    "camera": {
      "motion": "pan-left",
      "speed": "slow",
      "intensity": 30
    },
    "subject": null
  },
  "cinematicReference": {
    "movie": "Inception",
    "tvShow": null,
    "style": "warm golden hour cinematography",
    "inspirationBrief": "Morning light scenes with deep color grading"
  },
  "frameContinuity": false
}

Ensure visual cohesion across all scenes. Colors should work together. Motion should flow naturally between clips.
Return as JSON array of scene objects.
`;

interface StoryboardGenerationOptions {
  onProgress?: (message: string) => void;
}

/**
 * Generate visual storyboard from script using Claude
 */
export async function generateStoryboard(
  script: Script,
  options: StoryboardGenerationOptions = {}
): Promise<Storyboard> {
  const { onProgress } = options;

  onProgress?.('Generating cinematic storyboard with Claude...');

  if (VIDEO_AGENT_CONFIG.claude.apiKey) {
    return await generateStoryboardWithClaudeEnhanced(script);
  } else {
    console.log('⚠️  CLAUDE_API_KEY not set. Using template storyboard.');
    return generateTemplateStoryboard(script);
  }
}

/**
 * Generate enhanced storyboard using Claude API with color schemes and cinematic references
 */
async function generateStoryboardWithClaudeEnhanced(script: Script): Promise<Storyboard> {
  const apiKey = VIDEO_AGENT_CONFIG.claude.apiKey;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not set for enhanced storyboarding');
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
        max_tokens: 6000,
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

    // Extract JSON array from response
    const jsonMatch = storyboardText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to extract storyboard JSON from Claude response');
    }

    const scenesArray = JSON.parse(jsonMatch[0]);

    return {
      title: script.title,
      duration: script.duration,
      scenes: scenesArray.map((scene: any, index: number) => ({
        sceneNumber: scene.sceneNumber || index + 1,
        duration: script.scenes[index]?.duration || 5,
        scriptLine: script.scenes[index]?.scriptLine || '',
        visualDescription: scene.visualDescription,
        imagePromptSeed: scene.visualDescription,
        colorScheme: scene.colorScheme,
        motionOption: scene.motionOption,
        cinematicReference: scene.cinematicReference,
        frameContinuity: scene.frameContinuity || {
          linkedFromScene: undefined,
          useAsStartFrame: false,
        },
        style: scene.colorScheme?.grading || 'cinematic',
        camera: scene.motionOption?.camera?.motion || 'medium shot',
        animation: scene.motionOption?.type || 'subtle motion',
      })),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error calling Claude API for enhanced storyboarding:', error);
    throw error;
  }
}

/**
 * Generate template storyboard for demonstration
 */
function generateTemplateStoryboard(script: Script): Storyboard {
  const visualStyles = [
    {
      camera: 'wide establishing shot',
      animation: 'slow pan left',
      style: 'cinematic',
      colorScheme: {
        primary: '#FF6B35',
        secondary: '#004E89',
        accent: '#F7B801',
        mood: 'warm' as const,
        grading: 'cinematic' as const,
      },
      motionOption: {
        type: 'subtle-camera' as const,
        camera: {
          motion: 'pan-left' as const,
          speed: 'slow' as const,
          intensity: 25,
        },
      },
      cinematicReference: {
        style: 'warm golden hour cinematography',
        inspirationBrief: 'Morning light establishing shot',
      },
    },
    {
      camera: 'close-up detail',
      animation: 'zoom in',
      style: 'modern',
      colorScheme: {
        primary: '#1A1A1A',
        secondary: '#FFFFFF',
        accent: '#00D9FF',
        mood: 'cool' as const,
        grading: 'modern' as const,
      },
      motionOption: {
        type: 'subtle-camera' as const,
        camera: {
          motion: 'zoom-in' as const,
          speed: 'medium' as const,
          intensity: 40,
        },
      },
      cinematicReference: {
        style: 'high-contrast digital aesthetic',
        inspirationBrief: 'Modern tech product reveal',
      },
    },
    {
      camera: 'overhead flat lay',
      animation: 'static with movement in frame',
      style: 'minimalist',
      colorScheme: {
        primary: '#F5F5F5',
        secondary: '#2D2D2D',
        accent: '#85C1E9',
        mood: 'neutral' as const,
        grading: 'documentary' as const,
      },
      motionOption: {
        type: 'static' as const,
      },
      cinematicReference: {
        style: 'clean minimalist composition',
        inspirationBrief: 'Carefully arranged overhead shot',
      },
    },
    {
      camera: 'medium shot',
      animation: 'pan right',
      style: 'documentary',
      colorScheme: {
        primary: '#8B7355',
        secondary: '#D4A574',
        accent: '#3D5A3D',
        mood: 'warm' as const,
        grading: 'documentary' as const,
      },
      motionOption: {
        type: 'subtle-camera' as const,
        camera: {
          motion: 'pan-right' as const,
          speed: 'slow' as const,
          intensity: 30,
        },
      },
      cinematicReference: {
        style: 'natural documentary lighting',
        inspirationBrief: 'Authentic documentary-style coverage',
      },
    },
    {
      camera: 'extreme close-up',
      animation: 'slow zoom',
      style: 'cinematic',
      colorScheme: {
        primary: '#2C3E50',
        secondary: '#E74C3C',
        accent: '#ECF0F1',
        mood: 'vibrant' as const,
        grading: 'cinematic' as const,
      },
      motionOption: {
        type: 'subtle-camera' as const,
        camera: {
          motion: 'zoom-in' as const,
          speed: 'slow' as const,
          intensity: 35,
        },
      },
      cinematicReference: {
        style: 'dramatic detail cinematography',
        inspirationBrief: 'Intimate close-up with emotional depth',
      },
    },
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
    const style = visualStyles[styleIndex];

    return {
      sceneNumber: scene.number,
      duration: scene.duration,
      scriptLine: scene.scriptLine,
      visualDescription: visualDescriptions[descIndex],
      imagePromptSeed: visualDescriptions[descIndex],
      style: style.style,
      camera: style.camera,
      animation: style.animation,
      colorScheme: style.colorScheme,
      motionOption: style.motionOption,
      cinematicReference: style.cinematicReference,
      frameContinuity: {
        linkedFromScene: undefined,
        useAsStartFrame: false,
      },
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
