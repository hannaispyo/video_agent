import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ImageManifest, ImagePrompts, AnimationManifest, VideoClip, VisualScene } from '../types';
import { VIDEO_AGENT_CONFIG } from '../config';
import { FrameContinuityManager, FrameLink } from './frame-continuity';

const execFileAsync = promisify(execFile);

const KIE_BASE_URL = 'https://api.kie.ai';
const KIE_CREATE_TASK = `${KIE_BASE_URL}/api/v1/jobs/createTask`;
const KIE_TASK_STATUS = `${KIE_BASE_URL}/api/v1/jobs/recordInfo`;
const KLING_MODEL = 'kling-2.6/image-to-video';
const KIE_POLL_INTERVAL_MS = 5000;
const KIE_POLL_TIMEOUT_MS = 300000; // 5 minutes per clip

interface KieCreateTaskResponse {
  code: number;
  msg: string;
  data: { taskId: string };
}

interface KieTaskStatusResponse {
  data: {
    taskId: string;
    state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
    resultJson?: string; // JSON string: { "resultUrls": ["https://..."] }
  };
}

interface AnimationOptions {
  onProgress?: (message: string) => void;
  forceRemotionFallback?: boolean;
  imagePrompts?: ImagePrompts;
}

/**
 * Animate static images into video clips
 */
export async function animateImages(
  imageManifest: ImageManifest,
  outputDir: string,
  options: AnimationOptions = {}
): Promise<AnimationManifest> {
  const { onProgress, forceRemotionFallback, imagePrompts } = options;

  onProgress?.('Starting image animation...');

  // Try Kling first if enabled (via kie.ai — uses KIE_API_KEY)
  if (
    VIDEO_AGENT_CONFIG.animation.preferKling &&
    !forceRemotionFallback &&
    process.env.KIE_API_KEY
  ) {
    try {
      onProgress?.('Attempting animation with Kling API...');
      return await animateWithKling(imageManifest, outputDir, onProgress, imagePrompts);
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
 * Extract the very last frame of a video to a JPEG file using ffmpeg.
 * Used for frame chaining: last frame of clip N becomes start of clip N+1.
 */
async function extractLastFrame(videoPath: string, outputJpeg: string): Promise<void> {
  // -sseof -0.1 → seek 100ms before end; -vframes 1 → capture 1 frame
  await execFileAsync('ffmpeg', [
    '-sseof', '-0.1',
    '-i', videoPath,
    '-vframes', '1',
    '-q:v', '2',
    '-y',
    outputJpeg,
  ], { timeout: 30000 });

  if (!fs.existsSync(outputJpeg)) {
    throw new Error(`ffmpeg did not produce frame file: ${outputJpeg}`);
  }
}

/**
 * Animate using Kling model via kie.ai API.
 *
 * Scenes are processed SEQUENTIALLY so the final frame of each clip can be
 * fed as the start frame of the next Kling job, ensuring visual continuity.
 *
 * Chain logic per scene N (N > 1):
 *   image_urls[0]  = last frame of clip N-1  (temporal start — where we left off)
 *   tail_image_url = generated scene image N  (visual target — where we're going)
 *
 * Scene 1 uses its generated image directly (no previous clip exists).
 * If ffmpeg is unavailable or frame extraction fails, the chain resets and
 * scene N uses its generated image as normal (graceful degradation).
 */
async function animateWithKling(
  imageManifest: ImageManifest,
  outputDir: string,
  onProgress?: (message: string) => void,
  imagePrompts?: ImagePrompts
): Promise<AnimationManifest> {
  const kieApiKey = process.env.KIE_API_KEY;
  if (!kieApiKey) {
    throw new Error('KIE_API_KEY not set');
  }

  // Build lookup: sceneNumber → imagePrompt
  const promptsByScene = new Map(
    (imagePrompts?.scenes ?? []).map((p) => [p.sceneNumber, p])
  );

  const clips: VideoClip[] = [];
  let successCount = 0;
  let failureCount = 0;
  // Holds the path to the last extracted frame; null = no chain available
  let previousLastFramePath: string | null = null;

  const clipsDir = path.join(outputDir, 'clips');
  const framesDir = path.join(outputDir, 'chain-frames');
  if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

  // Check ffmpeg once upfront
  const ffmpegAvailable = await FrameContinuityManager.isFfmpegAvailable();
  if (!ffmpegAvailable) {
    onProgress?.('⚠️  ffmpeg not found — frame chaining disabled (clips will be independent)');
  }

  // Sort by scene number: sequential processing is required for frame chaining
  const sortedAssets = [...imageManifest.assets].sort((a, b) => a.sceneNumber - b.sceneNumber);
  onProgress?.(`Submitting ${sortedAssets.length} scenes to Kling (sequential, frame-chained)...`);

  for (const imageAsset of sortedAssets) {
    try {
      onProgress?.(`Animating scene ${imageAsset.sceneNumber}...`);

      const scenePrompt = promptsByScene.get(imageAsset.sceneNumber);
      const motionPrompt = scenePrompt?.animationHints?.motion || '';
      const sceneDuration = scenePrompt?.animationHints?.duration
        ?? VIDEO_AGENT_CONFIG.animation.defaultDuration;

      // Resolve image URLs
      const toUrl = (p: string) =>
        p.startsWith('http') ? p : `file://${path.resolve(p)}`;

      const sceneImageUrl = toUrl(imageAsset.filePath);

      // Build Kling input — chain if we have a previous last frame
      const klingInput: Record<string, unknown> = {
        prompt: motionPrompt,
        duration: String(sceneDuration),
        sound: false,
      };

      if (previousLastFramePath) {
        // Start from where the last clip ended, animate toward this scene's image
        klingInput.image_urls = [toUrl(previousLastFramePath)];
        klingInput.tail_image_url = sceneImageUrl;
        onProgress?.(`  → chaining from scene ${imageAsset.sceneNumber - 1}'s last frame`);
      } else {
        // First scene or chain broken: use scene image directly
        klingInput.image_urls = [sceneImageUrl];
      }

      if (motionPrompt) {
        onProgress?.(`  motion: "${motionPrompt}" (${sceneDuration}s)`);
      }

      // Step 1: Submit task
      const submitResponse = await fetch(KIE_CREATE_TASK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${kieApiKey}`,
        },
        body: JSON.stringify({ model: KLING_MODEL, input: klingInput }),
      });

      if (!submitResponse.ok) {
        throw new Error(`kie.ai submit error: ${submitResponse.status} ${submitResponse.statusText}`);
      }

      const submitData = (await submitResponse.json()) as KieCreateTaskResponse;
      if (submitData.code !== 200 || !submitData.data?.taskId) {
        throw new Error(`kie.ai task creation failed: ${submitData.msg}`);
      }

      const taskId = submitData.data.taskId;
      onProgress?.(`  task ${taskId} queued`);

      // Step 2: Poll until ready
      const videoUrl = await pollKlingTask(taskId, kieApiKey, imageAsset.sceneNumber, onProgress);

      // Step 3: Download MP4
      const clipPath = path.join(clipsDir, `scene-${String(imageAsset.sceneNumber).padStart(2, '0')}-animated.mp4`);
      await downloadVideo(videoUrl, clipPath);

      clips.push({
        sceneNumber: imageAsset.sceneNumber,
        filePath: clipPath,
        duration: sceneDuration,
        codec: 'h264',
        frameCount: sceneDuration * 30,
        generatedAt: new Date().toISOString(),
      });

      successCount++;

      // Step 4: Extract last frame for next scene's chain (non-blocking failure)
      if (ffmpegAvailable) {
        try {
          const framePath = path.join(framesDir, `scene-${String(imageAsset.sceneNumber).padStart(2, '0')}-last.jpg`);
          await extractLastFrame(clipPath, framePath);
          previousLastFramePath = framePath;
          onProgress?.(`  ✅ Scene ${imageAsset.sceneNumber} done + last frame saved for next chain`);
        } catch (frameErr) {
          onProgress?.(`  ⚠️  Frame extraction failed — next scene won't chain: ${frameErr}`);
          previousLastFramePath = null;
        }
      } else {
        onProgress?.(`  ✅ Scene ${imageAsset.sceneNumber} done (${sceneDuration}s)`);
        previousLastFramePath = null;
      }
    } catch (error) {
      console.error(`Failed to animate scene ${imageAsset.sceneNumber}:`, error);
      failureCount++;
      previousLastFramePath = null; // reset chain on any failure
    }
  }

  onProgress?.(`Kling complete: ${successCount} clips, ${failureCount} failed`);

  return {
    totalClips: imageManifest.assets.length,
    generatedClips: successCount,
    failedClips: failureCount,
    animationModel: KLING_MODEL,
    clips: clips.sort((a, b) => a.sceneNumber - b.sceneNumber),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Poll kie.ai until Kling task completes, return video URL
 */
async function pollKlingTask(
  taskId: string,
  apiKey: string,
  sceneNumber: number,
  onProgress?: (message: string) => void
): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < KIE_POLL_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, KIE_POLL_INTERVAL_MS));

    const statusResponse = await fetch(
      `${KIE_TASK_STATUS}?taskId=${taskId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!statusResponse.ok) {
      throw new Error(`kie.ai status check failed: ${statusResponse.statusText}`);
    }

    const status = (await statusResponse.json()) as KieTaskStatusResponse;
    const { state, resultJson } = status.data;

    onProgress?.(`  Scene ${sceneNumber}: ${state}`);

    if (state === 'success' && resultJson) {
      const result = JSON.parse(resultJson) as { resultUrls: string[] };
      if (result.resultUrls?.[0]) return result.resultUrls[0];
      throw new Error(`Kling task ${taskId} succeeded but returned no URL`);
    }
    if (state === 'fail') {
      throw new Error(`Kling task ${taskId} failed`);
    }
    // waiting | queuing | generating → keep polling
  }

  throw new Error(`Kling task ${taskId} timed out after ${KIE_POLL_TIMEOUT_MS / 1000}s`);
}

/**
 * Download video MP4 from URL to disk
 */
async function downloadVideo(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
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
 * Animate with frame continuity between clips
 */
export async function animateWithContinuity(
  imageManifest: ImageManifest,
  scenes: VisualScene[],
  outputDir: string,
  projectDir: string,
  onProgress?: (message: string) => void
): Promise<{ manifest: AnimationManifest; continuityManifest: object }> {
  const continuityManager = new FrameContinuityManager(projectDir);
  const clipPaths: VideoClip[] = [];
  const frameLinks: FrameLink[] = [];

  // Check ffmpeg availability
  if (!(await FrameContinuityManager.isFfmpegAvailable())) {
    onProgress?.('⚠️  ffmpeg not found. Frame continuity disabled. Install with: brew install ffmpeg');
    // Fall back to regular animation without continuity
    return {
      manifest: await animateImages(imageManifest, outputDir, { onProgress }),
      continuityManifest: { totalLinks: 0, links: [], warning: 'ffmpeg not available' },
    };
  }

  onProgress?.('Starting animation with frame continuity...');

  // Create clips directory
  const clipsDir = path.join(outputDir, 'clips');
  if (!fs.existsSync(clipsDir)) {
    fs.mkdirSync(clipsDir, { recursive: true });
  }

  let successCount = 0;
  let failureCount = 0;

  // Ensure arrays match in length to prevent off-by-one errors
  const sceneCount = Math.min(imageManifest.assets.length, scenes.length);

  if (imageManifest.assets.length !== scenes.length) {
    console.warn(
      `⚠️  Image sequence length (${imageManifest.assets.length}) != scenes length (${scenes.length}). ` +
      `Processing ${sceneCount} scenes.`
    );
  }

  for (let i = 0; i < sceneCount; i++) {
    const imageAsset = imageManifest.assets[i];
    const scene = scenes[i];

    // Verify scene matches by sceneNumber
    if (scene.sceneNumber !== imageAsset.sceneNumber) {
      console.warn(
        `⚠️  Scene number mismatch at index ${i}: ` +
        `scenes[${i}].sceneNumber=${scene.sceneNumber}, ` +
        `imageAsset.sceneNumber=${imageAsset.sceneNumber}`
      );
      failureCount++;
      continue;
    }

    try {
      onProgress?.(`Animating scene ${imageAsset.sceneNumber}...`);

      // Add frame continuity hint to scene if linked
      let continuityHint = '';
      if (scene.frameContinuity?.linkedFromScene !== undefined) {
        continuityHint = continuityManager.getFrameLinkHint(
          scene.frameContinuity.linkedFromScene,
          scene.sceneNumber
        );
      }

      // Animate clip (use existing animation logic)
      const clipPath = await animateSingleClip(imageAsset.filePath, scene, continuityHint, clipsDir);

      clipPaths.push({
        sceneNumber: imageAsset.sceneNumber,
        filePath: clipPath,
        duration: VIDEO_AGENT_CONFIG.animation.defaultDuration,
        codec: 'h264',
        frameCount: VIDEO_AGENT_CONFIG.animation.defaultDuration * 30,
        generatedAt: new Date().toISOString(),
      });

      // Extract final frame if next scene is linked (use sceneCount to prevent off-by-one)
      if (i < sceneCount - 1 && scenes[i + 1].frameContinuity?.linkedFromScene === scene.sceneNumber) {
        try {
          const finalFrame = await continuityManager.extractFinalFrame(clipPath, scene.sceneNumber);
          frameLinks.push({
            fromScene: scene.sceneNumber,
            toScene: scenes[i + 1].sceneNumber,
            frameFile: finalFrame,
            extractedAt: new Date().toISOString(),
          });
          onProgress?.(`✓ Frame link created: Scene ${scene.sceneNumber} → Scene ${scenes[i + 1].sceneNumber}`);
        } catch (error) {
          console.warn(
            `⚠️  Frame extraction failed for scene ${scene.sceneNumber}: ` +
            `${error instanceof Error ? error.message : 'Unknown error'}. Continuing without frame link.`
          );
          // Continue without frame linking - graceful degradation
        }
      }

      successCount++;
    } catch (error) {
      console.error(`Failed to animate scene ${imageAsset.sceneNumber}:`, error);
      failureCount++;
    }
  }

  onProgress?.(`Animation complete with continuity: ${successCount} clips, ${failureCount} failed`);

  const manifest: AnimationManifest = {
    totalClips: imageManifest.assets.length,
    generatedClips: successCount,
    failedClips: failureCount,
    animationModel: 'kling-v1-with-continuity',
    clips: clipPaths.sort((a, b) => a.sceneNumber - b.sceneNumber),
    generatedAt: new Date().toISOString(),
  };

  const continuityManifest = continuityManager.createManifest(frameLinks);

  return { manifest, continuityManifest };
}

/**
 * Animate a single clip with optional continuity hint
 *
 * In future: integrate with Kling API or Remotion with Ken Burns effect
 * Currently: creates placeholder for testing frame continuity logic
 */
async function animateSingleClip(
  imagePath: string,
  scene: VisualScene,
  continuityHint: string,
  outputDir: string
): Promise<string> {
  const clipPath = path.join(outputDir, `scene-${String(scene.sceneNumber).padStart(2, '0')}-animated.mp4`);

  // TODO: Implement Kling API integration with continuityHint in prompt
  // TODO: Or integrate Remotion with Ken Burns effect
  // For MVP: create placeholder clip for testing frame continuity logic

  if (continuityHint) {
    console.log(`[Scene ${scene.sceneNumber}] Frame continuity hint (not yet integrated):`);
    console.log(continuityHint);
  }

  createPlaceholderClip(clipPath);
  return clipPath;
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
