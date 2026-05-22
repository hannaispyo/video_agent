import * as path from 'path';
import { VideoBrief, Script, Storyboard, ImagePrompts, ImageManifest, AnimationManifest, ProjectStatus } from '../types';
import { VideoProjectManager } from '../orchestrator';
import { generateScript, validateScript } from './script-generation';
import { generateStoryboard, validateStoryboard } from './storyboard-generation';
import { engineerPrompts, validatePrompts } from './prompt-engineering';
import { generateImages, validateImageManifest } from './image-generation';
import { animateImages, validateAnimationManifest } from './animation-handler';
import { assembleVideo, validateVideoOutput, generateVideoInfo } from './video-assembly';

interface AutoExecutorOptions {
  verbose?: boolean;
  skipStep?: string;
  onProgress?: (step: string, message: string) => void;
}

/**
 * Fully automatic video creation executor
 * Runs all steps without pauses or approval gates
 */
export class AutoVideoExecutor {
  manager: VideoProjectManager;
  options: AutoExecutorOptions;

  constructor(projectName: string, options: AutoExecutorOptions = {}) {
    this.manager = new VideoProjectManager(projectName);
    this.options = options;
  }

  private log(step: string, message: string) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ${step}: ${message}`);
    this.options.onProgress?.(step, message);
  }

  async executeFullWorkflow(brief: VideoBrief): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      // Initialize project
      await this.manager.initialize(brief);
      this.log('INIT', `Project created: ${this.manager.projectName}`);

      // Step 1: Generate script
      if (this.options.skipStep !== 'scripting') {
        await this.executeScripting(brief);
      }

      // Step 2: Generate storyboard
      if (this.options.skipStep !== 'storyboarding') {
        await this.executeStoryboarding();
      }

      // Step 3: Engineer prompts
      if (this.options.skipStep !== 'prompts') {
        await this.executePromptEngineering();
      }

      // Step 4: Generate images
      if (this.options.skipStep !== 'images') {
        await this.executeImageGeneration();
      }

      // Step 5: Animate images
      if (this.options.skipStep !== 'animation') {
        await this.executeAnimation();
      }

      // Step 6: Assemble video
      if (this.options.skipStep !== 'assembly') {
        await this.executeAssembly();
      }

      this.log('SUCCESS', '✅ Video created successfully!');

      const outputPath = path.join(this.manager.projectDir, 'out.mp4');
      return {
        success: true,
        outputPath,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('ERROR', `❌ ${errorMsg}`);
      this.manager.addError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  private async executeScripting(brief: VideoBrief) {
    this.log('SCRIPT', 'Generating script...');
    try {
      const script = await generateScript(brief, {
        onProgress: (msg) => this.log('SCRIPT', msg),
      });

      const validation = validateScript(script);
      if (!validation.valid) {
        throw new Error(`Script validation failed: ${validation.errors.join(', ')}`);
      }

      await this.manager.saveAsset('script', script);
      await this.manager.recordApproval('scripting', true);
      await this.manager.advance();

      this.log('SCRIPT', `✓ Generated ${script.scenes.length} scenes, ${script.duration}s total`);
    } catch (error) {
      throw new Error(`Scripting failed: ${error}`);
    }
  }

  private async executeStoryboarding() {
    this.log('STORY', 'Generating storyboard...');
    try {
      const script = await this.manager.getAsset<Script>('script');
      if (!script) throw new Error('No script found');

      const storyboard = await generateStoryboard(script, {
        onProgress: (msg) => this.log('STORY', msg),
      });

      const validation = validateStoryboard(storyboard);
      if (!validation.valid) {
        throw new Error(`Storyboard validation failed: ${validation.errors.join(', ')}`);
      }

      await this.manager.saveAsset('storyboard', storyboard);
      await this.manager.recordApproval('storyboarding', true);
      await this.manager.advance();

      this.log('STORY', `✓ Generated visual descriptions for ${storyboard.scenes.length} scenes`);
    } catch (error) {
      throw new Error(`Storyboarding failed: ${error}`);
    }
  }

  private async executePromptEngineering() {
    this.log('PROMPT', 'Engineering image prompts...');
    try {
      const storyboard = await this.manager.getAsset<Storyboard>('storyboard');
      if (!storyboard) throw new Error('No storyboard found');

      const prompts = await engineerPrompts(storyboard, {
        onProgress: (msg) => this.log('PROMPT', msg),
      });

      const validation = validatePrompts(prompts);
      if (!validation.valid) {
        throw new Error(`Prompts validation failed: ${validation.errors.join(', ')}`);
      }

      await this.manager.saveAsset('image-prompts', prompts);
      await this.manager.recordApproval('prompts', true);
      await this.manager.advance();

      this.log('PROMPT', `✓ Engineered ${prompts.scenes.length} optimized prompts`);
    } catch (error) {
      throw new Error(`Prompt engineering failed: ${error}`);
    }
  }

  private async executeImageGeneration() {
    this.log('IMAGE', 'Generating images...');
    try {
      const prompts = await this.manager.getAsset<ImagePrompts>('image-prompts');
      if (!prompts) throw new Error('No prompts found');

      const imagesDir = path.join(this.manager.projectDir, 'images');
      const manifest = await generateImages(prompts, imagesDir, (msg) =>
        this.log('IMAGE', msg)
      );

      const validation = validateImageManifest(manifest);
      if (!validation.valid && manifest.generatedImages === 0) {
        throw new Error('No images were generated');
      }

      await this.manager.updateManifest('images', manifest);
      await this.manager.recordApproval('images', true);
      await this.manager.advance();

      this.log(
        'IMAGE',
        `✓ Generated ${manifest.generatedImages}/${manifest.totalScenes} images (${manifest.failedImages} failed)`
      );
    } catch (error) {
      throw new Error(`Image generation failed: ${error}`);
    }
  }

  private async executeAnimation() {
    this.log('ANIM', 'Animating images...');
    try {
      const imageManifest = await this.manager.getAsset<ImageManifest>('images');
      if (!imageManifest) throw new Error('No image manifest found');

      const clipsDir = path.join(this.manager.projectDir, 'clips');
      const manifest = await animateImages(imageManifest, clipsDir, {
        onProgress: (msg) => this.log('ANIM', msg),
      });

      const validation = validateAnimationManifest(manifest);
      if (!validation.valid && manifest.generatedClips === 0) {
        throw new Error('No clips were generated');
      }

      await this.manager.updateManifest('animation', manifest);
      await this.manager.recordApproval('animation', true);
      await this.manager.advance();

      this.log(
        'ANIM',
        `✓ Animated ${manifest.generatedClips}/${manifest.totalClips} clips (${manifest.failedClips} failed)`
      );
    } catch (error) {
      throw new Error(`Animation failed: ${error}`);
    }
  }

  private async executeAssembly() {
    this.log('ASSEM', 'Assembling final video...');
    try {
      const script = await this.manager.getAsset<Script>('script');
      const animationManifest = await this.manager.getAsset<AnimationManifest>('animation');

      if (!script) throw new Error('No script found');
      if (!animationManifest) throw new Error('No animation manifest found');

      const result = await assembleVideo(animationManifest, script, this.manager.projectDir, {
        onProgress: (msg) => this.log('ASSEM', msg),
      });

      if (!result.success) {
        throw new Error(result.error || 'Assembly failed');
      }

      const validation = validateVideoOutput(result.outputPath);
      if (!validation.valid) {
        this.log('ASSEM', `⚠️  Warning: ${validation.errors.join(', ')}`);
      }

      await this.manager.recordApproval('assembly', true);
      await this.manager.advance();

      const videoInfo = generateVideoInfo(result.outputPath, script);
      await this.manager.saveAsset('video-info', videoInfo);

      this.log('ASSEM', `✓ Final video: ${result.outputPath} (${script.duration}s)`);
    } catch (error) {
      throw new Error(`Assembly failed: ${error}`);
    }
  }

  getStatus(): ProjectStatus {
    return this.manager.getStatus();
  }

  generateReport(): string {
    return this.manager.generateReport();
  }
}
