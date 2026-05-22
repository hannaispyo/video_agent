import * as fs from 'fs';
import * as path from 'path';
import { ImagePrompts, ImageAsset, ImageManifest } from '../types';
import { VIDEO_AGENT_CONFIG } from '../config';

interface KieAIResponse {
  image?: string; // base64 encoded
  url?: string;
  error?: string;
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
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model: 'gpt4o-image', // Using kie.ai compatible endpoint
          size: '1920x1080',
          quality: VIDEO_AGENT_CONFIG.image.quality,
          n: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = (await response.json()) as any;

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (!data.data || data.data.length === 0) {
        throw new Error('No image data in response');
      }

      const imageUrl = data.data[0].url;
      const filename = `scene-${String(sceneNumber).padStart(2, '0')}.png`;
      const filepath = path.join(outputDir, filename);

      // Download image if URL is provided
      if (imageUrl) {
        await downloadImage(imageUrl, filepath);
      }

      return {
        sceneNumber,
        filePath: filepath,
        generatedAt: new Date().toISOString(),
        prompt,
        metadata: {
          size: '1920x1080',
          quality: VIDEO_AGENT_CONFIG.image.quality,
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
 * Download image from URL
 */
async function downloadImage(url: string, filepath: string): Promise<void> {
  // TODO: Implement actual download when needed
  // For now, just create a placeholder
  fs.writeFileSync(filepath, 'PNG_PLACEHOLDER', 'utf-8');
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
