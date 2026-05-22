import {
  Storyboard,
  ImagePrompts,
  ImagePrompt,
  ColorScheme,
  MotionOption,
  CinematicReference,
} from '../types';
import { VIDEO_AGENT_CONFIG, KLING_CONFIG } from '../config';

const PROMPT_ENGINEERING_PROMPT = (storyboard: Storyboard) => `
You are an expert at writing image generation prompts for professional video production.

Transform these visual storyboard descriptions into optimized prompts for the kie.ai image model (GPT-4 compatible).

Storyboard:
${JSON.stringify(storyboard, null, 2)}

For each scene, create a detailed prompt that:
1. Describes the visual scene in vivid detail (150+ words)
2. Specifies cinematography style and lighting
3. Includes technical parameters (aspect ratio, quality level)
4. Adds animation hints for smooth transitions

Important: Each prompt should be between 150-200 words, specific enough for consistency, but general enough for variation.

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
      "transitions": "crossfade",
      "intensity": 30,
      "subjectMotion": "none"
    }
  }
]
`;

interface PromptEngineeringOptions {
  onProgress?: (message: string) => void;
}

/**
 * Build Kling 3.0 prompt with motion, color, and cinematic parameters
 */
function buildKlingPrompt(
  basePrompt: string,
  colorScheme: ColorScheme | undefined,
  motionOption: MotionOption | undefined,
  cinematicRef: CinematicReference | undefined
): string {
  const motionDescription = motionOption
    ? buildMotionDescription(motionOption)
    : 'Static or minimal motion: Camera positioned for optimal composition, focus on visual elements and lighting design, with stable framing throughout the duration.';

  const colorGradingInstructions = colorScheme
    ? buildColorGradingInstructions(colorScheme)
    : 'Color grading style: professional, clean, modern. Ensure color consistency and visual harmony throughout all frames.';

  const cinematicStyleGuide = cinematicRef ? buildCinematicStyleGuide(cinematicRef) : '';

  return `
${basePrompt}

MOTION PARAMETERS FOR KLING 3.0:
${motionDescription}

COLOR & GRADING:
${colorGradingInstructions}

${cinematicStyleGuide ? `\nCINEMATOGRAPHIC STYLE:\n${cinematicStyleGuide}` : ''}

TECHNICAL REQUIREMENTS:
- Output format: MP4 video, 16:9 aspect ratio, 1920x1080 resolution
- Quality: Professional cinematography standard with sharp focus, excellent detail, and clean rendering
- Consistency: Ensure smooth transitions, visual continuity, and professional color grading throughout
- Lighting: Balanced exposure, professional-grade illumination with appropriate shadows and highlights
- Focus: Maintain sharp focus on primary subjects while managing depth of field appropriately
`;
}

/**
 * Build motion description based on motion option type
 */
function buildMotionDescription(motion: MotionOption): string {
  if (motion.type === 'subtle-camera') {
    return `
Subtle camera motion (Kling 3.0 "subtle camera motion" option):
- Motion type: ${motion.camera?.motion || 'gentle pan'} with smooth easing
- Speed: ${motion.camera?.speed || 'slow'} and deliberate
- Intensity: ${motion.camera?.intensity || 30}% for professional feel
- Subject remains stable and in sharp focus throughout
- Movement is fluid, elegant, and enhances visual storytelling
- Smooth transitions between camera positions with professional timing
`;
  }

  if (motion.type === 'subject-motion') {
    return `
Subject motion (Kling 3.0 "subject motion" option):
- Subject action: ${motion.subject?.motion || 'hands, person, object movement'}
- Camera: Mostly stable with subtle supportive movements
- Intensity: ${motion.camera?.intensity || 40}% for impactful yet controlled movement
- Subject movement drives the visual narrative forward
- Camera supports subject action with minimal independent movement
- Ensure movement is purposeful, natural, and well-motivated within the scene context
`;
  }

  if (motion.type === 'complex-motion') {
    return `
Complex motion with both camera and subject (Kling 3.0 "complex motion" option):
- Camera movement: ${motion.camera?.motion || 'dynamic pan, dolly, or orbit'} synchronized with action
- Subject action: ${motion.subject?.motion || 'coordinated movement with camera'} in dynamic interaction
- Intensity: ${motion.camera?.intensity || 60}% for sophisticated, layered motion
- Movement is purposeful, coordinated, and cinematic in quality
- Camera and subject motion work together to enhance visual interest and narrative flow
- All motion must feel intentional, well-choreographed, and professional in execution
`;
  }

  if (motion.type === 'static') {
    return `Static or minimal motion: Camera positioned for optimal composition, focus on visual elements and lighting design, with stable framing throughout the duration.`;
  }

  throw new Error(`Unknown motion type: ${motion.type}`);
}

/**
 * Build color grading instructions
 */
function buildColorGradingInstructions(colors: ColorScheme): string {
  const MOOD_DESCRIPTIONS: Record<string, string> = {
    warm: 'golden, amber, orange, and warm red tones for inviting, energetic feeling',
    cool: 'blue, teal, cyan tones for calm, professional, or mysterious mood',
    vibrant: 'bold, saturated, high-contrast colors for dynamic, engaging visual impact',
    neutral: 'balanced, neutral tones with selective color emphasis for versatility',
  };

  const GRADING_DESCRIPTIONS: Record<string, string> = {
    cinematic: 'cinematic depth, film-like quality with refined color curves',
    modern: 'contemporary, clean aesthetic with crisp colors',
    vintage: 'retro, nostalgic quality with period-appropriate color treatment',
    documentary: 'authentic, unmanipulated visual presentation',
  };

  return `
Color Palette:
- Primary: ${colors.primary} - dominant color establishing mood and visual identity
- Secondary: ${colors.secondary} - supporting color for depth and visual interest
- Accent: ${colors.accent} - highlight color for focus points and visual emphasis
- Mood: ${colors.mood} (${MOOD_DESCRIPTIONS[colors.mood] || 'balanced, neutral tones'})
- Color grading style: ${colors.grading} - ensuring ${GRADING_DESCRIPTIONS[colors.grading] || 'professional quality'}

Apply consistent color grading throughout all frames. Use primary color dominantly, secondary for compositional depth and layering, accent for guiding viewer attention to key elements. Maintain color consistency between shots for visual coherence.
`;
}

/**
 * Build cinematographic style guide
 */
function buildCinematicStyleGuide(ref: CinematicReference): string {
  const reference = ref.movie ? `movie "${ref.movie}"` : ref.tvShow ? `TV show "${ref.tvShow}"` : 'visual reference';
  return `
Cinematic inspiration: ${reference}
Style: ${ref.style}
Guidance: ${ref.inspirationBrief}

Match this cinematographic style in composition, lighting, color treatment, and overall visual aesthetic. Capture the essence of the reference while maintaining originality and authenticity for the current project context. Consider framing choices, depth of field, lighting direction, and color palette from the reference material.
`;
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
 * Generate template prompts based on storyboard with Kling 3.0 motion builders
 */
function generateTemplatePrompts(storyboard: Storyboard): ImagePrompts {
  const prompts: ImagePrompt[] = storyboard.scenes.map((scene) => {
    let basePrompt = '';

    // Use Kling prompt builder if motion option is defined
    if (scene.motionOption || scene.colorScheme || scene.cinematicReference) {
      basePrompt = buildKlingPrompt(scene.visualDescription, scene.colorScheme, scene.motionOption, scene.cinematicReference);
    } else {
      // Fallback to template prompts with generic motion hints
      const lightingStyles = [
        'golden hour warm',
        'cool blue accent',
        'warm amber glow',
        'bright daylight',
        'soft studio lights',
      ];
      const depthDescriptions = [
        'with depth of field',
        'sharp throughout',
        'selective focus',
        'cinematic blur',
        'dramatic contrast',
      ];

      const lightingIndex = scene.sceneNumber % lightingStyles.length;
      const depthIndex = scene.sceneNumber % depthDescriptions.length;

      const lighting = lightingStyles[lightingIndex];
      const depth = depthDescriptions[depthIndex];

      basePrompt = `${scene.visualDescription}. Professional cinematic videography style with ${lighting} lighting. Camera composition: ${scene.camera}, ${depth}. Visual style: ${scene.style || 'cinematic'}. Animation hints: ${scene.animation}. High-quality, detailed, production-ready cinematography suitable for professional video. Aspect ratio 16:9, 1920x1080 resolution. Color grading: professional, clean, modern. Mood: engaging, dynamic, visually compelling. Shot composition with professional framing and visual hierarchy.`;
    }

    // Extract motion intensity and subject motion from motion option
    const motionIntensity = scene.motionOption?.camera?.intensity ?? KLING_CONFIG.defaultMotionIntensity;
    const subjectMotionValue = scene.motionOption?.subject?.motion;

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
        motion: scene.motionOption?.camera?.motion || 'static',
        duration: scene.duration,
        transitions: 'crossfade',
        intensity: motionIntensity,
        subjectMotion: subjectMotionValue,
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

    // Check prompt length (should be 150+ words for quality)
    const wordCount = prompt.basePrompt.split(/\s+/).length;
    if (wordCount < 150) {
      errors.push(`Scene ${prompt.sceneNumber} prompt too short (${wordCount} words, minimum 150)`);
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
