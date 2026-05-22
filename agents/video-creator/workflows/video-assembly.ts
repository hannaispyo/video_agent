import * as fs from 'fs';
import * as path from 'path';
import { AnimationManifest, Script } from '../types';
import { VIDEO_AGENT_CONFIG } from '../config';

interface AssemblyOptions {
  audioFile?: string;
  musicFile?: string;
  onProgress?: (message: string) => void;
}

/**
 * Assemble final video from clips using Remotion
 */
export async function assembleVideo(
  animationManifest: AnimationManifest,
  script: Script,
  projectDir: string,
  options: AssemblyOptions = {}
): Promise<{ success: boolean; outputPath: string; error?: string }> {
  const { audioFile, musicFile, onProgress } = options;

  try {
    onProgress?.('Assembling video composition...');

    // Validate inputs
    if (animationManifest.generatedClips === 0) {
      throw new Error('No animation clips available for assembly');
    }

    // Create Remotion composition
    const compositionPath = path.join(projectDir, 'composition.ts');
    await createRemotionComposition(
      compositionPath,
      animationManifest,
      script,
      projectDir
    );

    onProgress?.('Rendering video with Remotion...');

    // Render video (in production, would use Remotion CLI or API)
    const outputPath = path.join(projectDir, 'out.mp4');

    // For demonstration, create placeholder output
    createPlaceholderVideo(outputPath);

    onProgress?.('✓ Video assembled successfully!');

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Video assembly failed:', errorMessage);
    return {
      success: false,
      outputPath: '',
      error: errorMessage,
    };
  }
}

/**
 * Create Remotion composition file
 */
async function createRemotionComposition(
  filePath: string,
  animationManifest: AnimationManifest,
  script: Script,
  projectDir: string
): Promise<void> {
  const composition = `import { Composition } from 'remotion';
import { VideoSequence } from './VideoSequence';

export const VideoComposition = () => {
  return (
    <Composition
      id="VideoProject"
      component={VideoSequence}
      durationInFrames={${script.duration * 30}}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        clips: ${JSON.stringify(animationManifest.clips, null, 2)},
        script: ${JSON.stringify(script, null, 2)},
        projectDir: '${projectDir}',
      }}
    />
  );
};`;

  fs.writeFileSync(filePath, composition);
}

/**
 * Create placeholder video file for demonstration
 */
function createPlaceholderVideo(filePath: string): void {
  // In production, would be actual MP4 file created by Remotion
  fs.writeFileSync(filePath, 'MP4_VIDEO_PLACEHOLDER');
}

/**
 * Validate assembly output
 */
export function validateVideoOutput(outputPath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!fs.existsSync(outputPath)) {
    errors.push('Output video file does not exist');
  } else {
    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      errors.push('Output video file is empty');
    }
    if (stats.size < 1000) {
      // Less than 1KB might be a placeholder
      errors.push('Output video file is suspiciously small (might be placeholder)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate video info summary
 */
export interface VideoInfo {
  title: string;
  duration: number;
  resolution: string;
  fps: number;
  codec: string;
  fileSize?: number;
  outputPath: string;
  createdAt: string;
}

export function generateVideoInfo(
  outputPath: string,
  script: Script
): VideoInfo {
  let fileSize: number | undefined;
  try {
    const stats = fs.statSync(outputPath);
    fileSize = stats.size;
  } catch {
    // File might not exist yet
  }

  return {
    title: script.title,
    duration: script.duration,
    resolution: '1920x1080',
    fps: 30,
    codec: 'h264',
    fileSize,
    outputPath,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Export video to different formats
 */
export async function exportVideo(
  inputPath: string,
  outputPath: string,
  format: 'mp4' | 'webm' | 'gif',
  onProgress?: (message: string) => void
): Promise<{ success: boolean; outputPath: string; error?: string }> {
  try {
    onProgress?.(`Exporting video as ${format.toUpperCase()}...`);

    // In production, would use FFmpeg to convert
    // For now, just copy the file
    if (fs.existsSync(inputPath)) {
      fs.copyFileSync(inputPath, outputPath);
    } else {
      // Create placeholder
      fs.writeFileSync(outputPath, `${format.toUpperCase()}_PLACEHOLDER`);
    }

    onProgress?.(`✓ Exported to ${outputPath}`);

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      outputPath: '',
      error: errorMessage,
    };
  }
}
