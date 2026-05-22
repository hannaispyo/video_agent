import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface FrameLink {
  fromScene: number;
  toScene: number;
  frameFile: string;
  extractedAt: string;
}

export class FrameContinuityManager {
  private projectDir: string;
  private frameCache: Map<number, string> = new Map();

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.ensureFrameDir();
  }

  private ensureFrameDir(): void {
    const frameDir = path.join(this.projectDir, 'frame-links');
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }
  }

  /**
   * Extract final frame from a video clip using ffmpeg
   * Extracts the last 3 seconds and takes the final frame
   */
  async extractFinalFrame(videoPath: string, sceneNumber: number): Promise<string> {
    // Check cache first
    if (this.frameCache.has(sceneNumber)) {
      return this.frameCache.get(sceneNumber)!;
    }

    const frameDir = path.join(this.projectDir, 'frame-links');
    const frameFile = path.join(frameDir, `scene-${sceneNumber}-final-frame.png`);

    try {
      // Use ffmpeg to extract final frame
      // -sseof -3 means start 3 seconds before end
      // -update 1 overwrites output file on each frame
      // -q:v 1 means quality (1=best, 31=worst)
      await execFileAsync('ffmpeg', [
        '-sseof', '-3',
        '-i', videoPath,
        '-update', '1',
        '-q:v', '1',
        frameFile
      ], {
        timeout: 30000  // 30 second timeout
      });

      if (!fs.existsSync(frameFile)) {
        throw new Error(`Frame extraction did not create file: ${frameFile}`);
      }

      this.frameCache.set(sceneNumber, frameFile);
      return frameFile;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Frame extraction failed for scene ${sceneNumber}: ${errorMsg}`);
    }
  }

  /**
   * Get frame link hint for next scene in storyboard
   * Returns text to include in animation prompt
   */
  getFrameLinkHint(fromScene: number, toScene: number): string {
    const frameFile = this.frameCache.get(fromScene);
    if (!frameFile) {
      return '';
    }

    return `
FRAME CONTINUITY:
This scene should start with visual framing similar to the final frame of Scene ${fromScene}.
Ensure smooth visual transition from previous clip.
Maintain similar composition, camera angle, and subject position if applicable.
`;
  }

  /**
   * Create manifest of all frame links
   */
  createManifest(links: FrameLink[]): object {
    return {
      totalLinks: links.length,
      links,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get directory where frames are stored
   */
  getFrameDir(): string {
    return path.join(this.projectDir, 'frame-links');
  }

  /**
   * Check if ffmpeg is available
   */
  static async isFfmpegAvailable(): Promise<boolean> {
    try {
      await execFileAsync('ffmpeg', ['-version'], {
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }
}
