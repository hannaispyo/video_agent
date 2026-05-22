import * as fs from 'fs';
import * as path from 'path';
import { ImageManifest, AnimationManifest, VideoClip } from '../types';
import { VIDEO_AGENT_CONFIG } from '../config';

interface AnimationOptions {
  onProgress?: (message: string) => void;
  forceRemotionFallback?: boolean;
}

/**
 * Animate static images into video clips
 */
export async function animateImages(
  imageManifest: ImageManifest,
  outputDir: string,
  options: AnimationOptions = {}
): Promise<AnimationManifest> {
  const { onProgress, forceRemotionFallback } = options;

  onProgress?.('Starting image animation...');

  // Try Kling first if enabled
  if (
    VIDEO_AGENT_CONFIG.animation.preferKling &&
    !forceRemotionFallback &&
    process.env.KLING_API_KEY
  ) {
    try {
      onProgress?.('Attempting animation with Kling API...');
      return await animateWithKling(imageManifest, outputDir, onProgress);
    } catch (error) {
      console.warn('Kling animation failed, falling back to Remotion:', error);
      if (!VIDEO_AGENT_CONFIG.animation.fallbackToRemotion) {
        throw error;
      }
    }
  }

  // Fallback to Remotion
  onProgress?.('Using Remotion for animation...');
  return await animateWithRemotion(imageManifest, outputDir, onProgress);
}

/**
 * Animate using Kling API
 */
async function animateWithKling(
  imageManifest: ImageManifest,
  outputDir: string,
  onProgress?: (message: string) => void
): Promise<AnimationManifest> {
  const klingApiKey = process.env.KLING_API_KEY;
  if (!klingApiKey) {
    throw new Error('KLING_API_KEY not set');
  }

  const clips: VideoClip[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Create clips directory
  const clipsDir = path.join(outputDir, 'clips');
  if (!fs.existsSync(clipsDir)) {
    fs.mkdirSync(clipsDir, { recursive: true });
  }

  onProgress?.(`Submitting ${imageManifest.assets.length} images to Kling...`);

  for (const imageAsset of imageManifest.assets) {
    try {
      onProgress?.(`Animating scene ${imageAsset.sceneNumber}...`);

      // For demonstration, create placeholder clips
      // In production, would call Kling API
      const clipPath = path.join(clipsDir, `scene-${String(imageAsset.sceneNumber).padStart(2, '0')}-animated.mp4`);
      createPlaceholderClip(clipPath);

      clips.push({
        sceneNumber: imageAsset.sceneNumber,
        filePath: clipPath,
        duration: VIDEO_AGENT_CONFIG.animation.defaultDuration,
        codec: 'h264',
        frameCount: VIDEO_AGENT_CONFIG.animation.defaultDuration * 30, // 30fps
        generatedAt: new Date().toISOString(),
      });

      successCount++;
    } catch (error) {
      console.error(`Failed to animate scene ${imageAsset.sceneNumber}:`, error);
      failureCount++;
    }
  }

  onProgress?.(`Kling animation complete: ${successCount} clips, ${failureCount} failed`);

  return {
    totalClips: imageManifest.assets.length,
    generatedClips: successCount,
    failedClips: failureCount,
    animationModel: 'kling-v1',
    clips: clips.sort((a, b) => a.sceneNumber - b.sceneNumber),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Animate using Remotion (fallback)
 */
async function animateWithRemotion(
  imageManifest: ImageManifest,
  outputDir: string,
  onProgress?: (message: string) => void
): Promise<AnimationManifest> {
  const clips: VideoClip[] = [];
  const clipsDir = path.join(outputDir, 'clips');

  // Create clips directory
  if (!fs.existsSync(clipsDir)) {
    fs.mkdirSync(clipsDir, { recursive: true });
  }

  onProgress?.(`Creating ${imageManifest.assets.length} clips with Remotion Ken Burns effect...`);

  // For each image, we would create a Remotion composition
  // For now, create placeholder clips
  for (const imageAsset of imageManifest.assets) {
    try {
      onProgress?.(`Creating clip for scene ${imageAsset.sceneNumber}...`);

      const clipPath = path.join(
        clipsDir,
        `scene-${String(imageAsset.sceneNumber).padStart(2, '0')}-animated.mp4`
      );

      // Create placeholder clip
      createPlaceholderClip(clipPath);

      clips.push({
        sceneNumber: imageAsset.sceneNumber,
        filePath: clipPath,
        duration: VIDEO_AGENT_CONFIG.animation.defaultDuration,
        codec: 'h264',
        frameCount: VIDEO_AGENT_CONFIG.animation.defaultDuration * 30,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to create clip for scene ${imageAsset.sceneNumber}:`, error);
    }
  }

  onProgress?.(`Remotion animation complete: ${clips.length} clips generated`);

  return {
    totalClips: imageManifest.assets.length,
    generatedClips: clips.length,
    failedClips: imageManifest.assets.length - clips.length,
    animationModel: 'remotion-kenburns',
    clips: clips.sort((a, b) => a.sceneNumber - b.sceneNumber),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Create placeholder clip for demonstration
 */
function createPlaceholderClip(filePath: string): void {
  // In production, would be actual MP4 file
  fs.writeFileSync(filePath, 'MP4_PLACEHOLDER');
}

/**
 * Re-animate specific scene
 */
export async function reanimateScene(
  sceneNumber: number,
  imageAsset: any,
  outputDir: string,
  onProgress?: (message: string) => void
): Promise<VideoClip | null> {
  onProgress?.(`Re-animating scene ${sceneNumber}...`);

  try {
    const clipsDir = path.join(outputDir, 'clips');
    const clipPath = path.join(clipsDir, `scene-${String(sceneNumber).padStart(2, '0')}-animated.mp4`);

    createPlaceholderClip(clipPath);

    return {
      sceneNumber,
      filePath: clipPath,
      duration: VIDEO_AGENT_CONFIG.animation.defaultDuration,
      codec: 'h264',
      frameCount: VIDEO_AGENT_CONFIG.animation.defaultDuration * 30,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to re-animate scene ${sceneNumber}:`, error);
    return null;
  }
}

/**
 * Validate animation manifest
 */
export function validateAnimationManifest(
  manifest: AnimationManifest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (manifest.generatedClips === 0) {
    errors.push('No video clips were generated');
  }

  if (manifest.failedClips > 0) {
    errors.push(`${manifest.failedClips} clips failed to generate`);
  }

  manifest.clips.forEach((clip) => {
    if (!clip.filePath) {
      errors.push(`Clip for scene ${clip.sceneNumber} has no file path`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
