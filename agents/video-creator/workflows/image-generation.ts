import * as fs from 'fs';
import * as path from 'path';
import { ImagePrompts, ImageAsset, ImageManifest } from '../types';
import { VIDEO_AGENT_CONFIG } from '../config';

const KIE_BASE_URL = 'https://api.kie.ai';
const KIE_IMAGE_ENDPOINT = `${KIE_BASE_URL}/api/v1/gpt4o-image/generate`;
const KIE_IMAGE_STATUS_ENDPOINT = `${KIE_BASE_URL}/api/v1/gpt4o-image/record-info`;
const KIE_POLL_INTERVAL_MS = 3000;
const KIE_POLL_TIMEOUT_MS = 120000; // 2 minutes

interface KieTaskResponse {
  code: number;
  msg: string;
  data: { taskId: string };
}

interface KieImageStatusResponse {
  data: {
    taskId: string;
    successFlag: number; // 0 = processing, 1 = done, 2 = failed
    progress: string;
    response?: { result_urls: string[] };
  };
}

/**
 * Generate images from prompts using kie.ai
 */
export async function generateImages(
  prompts: ImagePrompts,
  outputDir: string,
  onProgress?: (message: string) => void
): Promise<ImageManifest> {
  const kieApiKey = process.env.KIE_API_KEY;
  if (!kieApiKey) {
    console.log('⚠️  KIE_API_KEY not set. Returning template manifest.');
    return generateTemplateManifest(prompts, outputDir);
  }

  const batchSize = VIDEO_AGENT_CONFIG.image.batchSize;
  const assets: ImageAsset[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Create images directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  onProgress?.(`Generating ${prompts.scenes.length} images with kie.ai...`);

  // Process in batches
  for (let i = 0; i < prompts.scenes.length; i += batchSize) {
    const batch = prompts.scenes.slice(i, Math.min(i + batchSize, prompts.scenes.length));

    const batchPromises = batch.map((prompt) =>
      generateSingleImage(
        prompt.kieaiFormat.prompt,
        prompt.sceneNumber,
        outputDir,
        kieApiKey,
        prompt
      )
    );

    try {
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value) {
            assets.push(result.value);
            successCount++;
            onProgress?.(`✓ Generated scene ${batch[index].sceneNumber}`);
          }
        } else {
          failureCount++;
          onProgress?.(`✗ Failed to generate scene ${batch[index].sceneNumber}`);
        }
      });

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < prompts.scenes.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing batch:', error);
      failureCount += batch.length;
    }
  }

  onProgress?.(`Completed: ${successCount} succeeded, ${failureCount} failed`);

  return {
    totalScenes: prompts.scenes.length,
    generatedImages: successCount,
    failedImages: failureCount,
    assets: assets.sort((a, b) => a.sceneNumber - b.sceneNumber),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a single image with retry logic
 */
async function generateSingleImage(
  prompt: string,
  sceneNumber: number,
  outputDir: string,
  apiKey: string,
  sourcePrompt: any
): Promise<ImageAsset | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < VIDEO_AGENT_CONFIG.image.retryAttempts; attempt++) {
    try {
      // Step 1: Submit task to kie.ai GPT-4o image endpoint
      const submitResponse = await fetch(KIE_IMAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          size: '16:9',
          nVariants: 1,
          isEnhance: false,
        }),
      });

      if (!submitResponse.ok) {
        throw new Error(`kie.ai submit error: ${submitResponse.status} ${submitResponse.statusText}`);
      }

      const submitData = (await submitResponse.json()) as KieTaskResponse;
      if (submitData.code !== 200 || !submitData.data?.taskId) {
        throw new Error(`kie.ai task creation failed: ${submitData.msg}`);
      }

      const taskId = submitData.data.taskId;

      // Step 2: Poll until done
      const imageUrl = await pollKieImageTask(taskId, apiKey);

      // Step 3: Download image
      const filename = `scene-${String(sceneNumber).padStart(2, '0')}.png`;
      const filepath = path.join(outputDir, filename);
      await downloadImage(imageUrl, filepath);

      return {
        sceneNumber,
        filePath: filepath,
        generatedAt: new Date().toISOString(),
        prompt,
        metadata: {
          size: '16:9',
          quality: VIDEO_AGENT_CONFIG.image.quality,
          taskId,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < VIDEO_AGENT_CONFIG.image.retryAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, VIDEO_AGENT_CONFIG.image.retryDelayMs)
        );
      }
    }
  }

  console.error(
    `Failed to generate image for scene ${sceneNumber} after ${VIDEO_AGENT_CONFIG.image.retryAttempts} attempts:`,
    lastError
  );
  return null;
}

/**
 * Poll kie.ai task until image is ready, return image URL
 */
async function pollKieImageTask(taskId: string, apiKey: string): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < KIE_POLL_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, KIE_POLL_INTERVAL_MS));

    const statusResponse = await fetch(
      `${KIE_IMAGE_STATUS_ENDPOINT}?taskId=${taskId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!statusResponse.ok) {
      throw new Error(`kie.ai status check failed: ${statusResponse.statusText}`);
    }

    const status = (await statusResponse.json()) as KieImageStatusResponse;
    const { successFlag, response } = status.data;

    if (successFlag === 1 && response?.result_urls?.[0]) {
      return response.result_urls[0];
    }
    if (successFlag === 2) {
      throw new Error(`kie.ai image generation failed for task ${taskId}`);
    }
    // successFlag === 0 → still processing, keep polling
  }

  throw new Error(`kie.ai image task ${taskId} timed out after ${KIE_POLL_TIMEOUT_MS / 1000}s`);
}

/**
 * Download image from URL to disk
 */
async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
}

/**
 * Generate template manifest for demonstration
 */
function generateTemplateManifest(
  prompts: ImagePrompts,
  outputDir: string
): ImageManifest {
  const assets: ImageAsset[] = prompts.scenes.map((prompt) => {
    const filename = `scene-${String(prompt.sceneNumber).padStart(2, '0')}.png`;
    const filepath = path.join(outputDir, filename);

    // Create placeholder files for demonstration
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(filepath, 'PNG_PLACEHOLDER');

    return {
      sceneNumber: prompt.sceneNumber,
      filePath: filepath,
      generatedAt: new Date().toISOString(),
      prompt: prompt.basePrompt,
      metadata: {
        source: 'template',
        size: '1920x1080',
        quality: VIDEO_AGENT_CONFIG.image.quality,
      },
    };
  });

  return {
    totalScenes: prompts.scenes.length,
    generatedImages: assets.length,
    failedImages: 0,
    assets,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Regenerate specific image
 */
export async function regenerateImage(
  sceneNumber: number,
  prompt: string,
  outputDir: string,
  onProgress?: (message: string) => void
): Promise<ImageAsset | null> {
  onProgress?.(`Regenerating image for scene ${sceneNumber}...`);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    console.log('⚠️  KIE_API_KEY not set');
    return null;
  }

  return await generateSingleImage(prompt, sceneNumber, outputDir, apiKey, {});
}

/**
 * Validate image manifest
 */
export function validateImageManifest(
  manifest: ImageManifest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (manifest.generatedImages === 0) {
    errors.push('No images were generated');
  }

  if (manifest.failedImages > 0) {
    errors.push(`${manifest.failedImages} images failed to generate`);
  }

  manifest.assets.forEach((asset) => {
    if (!fs.existsSync(asset.filePath) && asset.filePath !== 'PNG_PLACEHOLDER') {
      // Only warn for non-placeholder files
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
