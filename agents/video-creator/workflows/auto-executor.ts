import * as path from 'path';
import * as fs from 'fs';
import { VideoBrief, Script, Storyboard, ImagePrompts, ImageManifest, AnimationManifest, ProjectStatus, VisualCoherence, AudioManifest } from '../types';
import { VideoProjectManager } from '../orchestrator';
import { generateScript, validateScript } from './script-generation';
import { generateStoryboard, validateStoryboard } from './storyboard-generation';
import { engineerPrompts, validatePrompts } from './prompt-engineering';
import { generateImages, validateImageManifest } from './image-generation';
import { animateImages, validateAnimationManifest } from './animation-handler';
import { assembleVideo, validateVideoOutput, generateVideoInfo } from './video-assembly';
import { createAudioSynthesizer } from './audio-synthesis';
import { ELEVEN_LABS_CONFIG } from '../config';
import { VisualConsistencyValidator } from '../validators/visual-consistency';
import { FrameContinuityManager, FrameLink } from './frame-continuity';

interface AutoExecutorOptions {
  verbose?: boolean;
  skipStep?: string;
  onProgress?: (step: string, message: string) => void;
}

/**
 * Validate storyboard visual coherence
 */
async function validateStoryboardCoherence(
  storyboard: Storyboard,
  outputDir: string
): Promise<VisualCoherence | null> {
  try {
    const validator = new VisualConsistencyValidator();
    const coherenceReport = validator.analyzeVisualCoherence(storyboard);

    console.log('\n📊 Visual Coherence Analysis:');
    console.log(`   Overall Score: ${coherenceReport.overallScore}/100`);
    console.log(`   Color Consistency: ${coherenceReport.colorScore}/100`);
    console.log(`   Motion Flow: ${coherenceReport.motionScore}/100`);
    console.log(`   Style Consistency: ${coherenceReport.styleScore}/100`);
    console.log(`   Recommendation: ${coherenceReport.recommendation}`);

    if (coherenceReport.issues.length > 0) {
      console.log('\n⚠️  Issues detected:');
      coherenceReport.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    // Save coherence report
    const reportPath = path.join(outputDir, 'visual-coherence-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(coherenceReport, null, 2));
    console.log(`\n✅ Coherence report saved to: ${reportPath}`);

    return coherenceReport;
  } catch (error) {
    console.warn('⚠️  Visual coherence analysis failed (non-blocking):', error);
    return null;
  }
}

/**
 * Fully automatic video creation executor
 * Runs all steps without pauses or approval gates
 */
export class AutoVideoExecutor {
  manager: VideoProjectManager;
  options: AutoExecutorOptions;
  private brief!: VideoBrief;

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
      // Store brief for use in sub-steps (e.g. storyboarding visual constraints)
      this.brief = brief;

      // Initialize project
      await this.manager.initialize(brief);
      this.log('INIT', `Project created: ${this.manager.projectName}`);

      // Step 1: Generate script
      let script: Script | null = null;
      if (this.options.skipStep !== 'scripting') {
        await this.executeScripting(brief);
        script = await this.manager.getAsset<Script>('script');
      }

      // Step 2: Generate audio (non-blocking)
      if (script && this.options.skipStep !== 'audio') {
        try {
          await this.executeAudio(script);
        } catch (error) {
          this.log('AUDIO', `⚠️  Audio generation failed (non-blocking): ${error}`);
        }
      }

      // Step 3: Generate storyboard
      if (this.options.skipStep !== 'storyboarding') {
        await this.executeStoryboarding();
      }

      // Step 4: Engineer prompts
      if (this.options.skipStep !== 'prompts') {
        await this.executePromptEngineering();
      }

      // Step 5: Generate images
      if (this.options.skipStep !== 'images') {
        await this.executeImageGeneration();
      }

      // Step 6: Animate images
      if (this.options.skipStep !== 'animation') {
        await this.executeAnimation();
      }

      // Step 7: Assemble video
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

  private async executeAudio(script: Script) {
    this.log('AUDIO', 'Generating voiceover...');
    try {
      if (!ELEVEN_LABS_CONFIG.enabled) {
        this.log('AUDIO', '⚠️  Eleven Labs API key not configured. Skipping audio generation.');
        this.manager.audioGenerated = false;
        return;
      }

      // Compile full voiceover script from all scenes
      const voiceover = script.scenes.map((s) => s.voiceover || '').join(' ');

      // Generate audio
      const synthesizer = createAudioSynthesizer();
      this.log('AUDIO', `Voice: ${ELEVEN_LABS_CONFIG.voiceId}`);

      const voiceoverResult = await synthesizer.generateVoiceover(voiceover, ELEVEN_LABS_CONFIG.voiceId);

      // Validate duration
      const validation = synthesizer.validateDuration(
        voiceoverResult.durationMs,
        script.duration,
        ELEVEN_LABS_CONFIG.durationValidation.tolerance
      );

      this.log('AUDIO', `Generated: ${(voiceoverResult.durationMs / 1000).toFixed(1)}s`);
      this.log('AUDIO', validation.message);

      if (!validation.valid) {
        this.log('AUDIO', `⚠️  Audio duration variance: ${validation.variance.toFixed(1)}% (tolerance: ±${ELEVEN_LABS_CONFIG.durationValidation.tolerance}%)`);
      }

      // Save audio file
      const audioPath = path.join(this.manager.projectDir, 'voiceover.mp3');
      fs.writeFileSync(audioPath, voiceoverResult.buffer);
      this.log('AUDIO', `✅ Saved: ${audioPath}`);

      // Save manifest
      const audioManifest: AudioManifest = {
        totalDuration: voiceoverResult.durationMs,
        voiceId: ELEVEN_LABS_CONFIG.voiceId,
        model: ELEVEN_LABS_CONFIG.defaults.model_id,
        assets: [
          {
            filePath: audioPath,
            durationMs: voiceoverResult.durationMs,
            voiceId: ELEVEN_LABS_CONFIG.voiceId,
            generatedAt: new Date().toISOString(),
          },
        ],
        generatedAt: new Date().toISOString(),
      };

      const manifestPath = path.join(this.manager.projectDir, 'audio-manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(audioManifest, null, 2));

      this.manager.audioPath = audioPath;
      this.manager.audioManifest = audioManifest;
      this.manager.audioGenerated = true;

      await this.manager.recordApproval('audio', true);
      await this.manager.advance();

      this.log('AUDIO', `✓ Generated voiceover (${(voiceoverResult.durationMs / 1000).toFixed(1)}s)`);
    } catch (error) {
      this.log('AUDIO', `❌ Audio generation failed: ${error instanceof Error ? error.message : String(error)}`);
      this.log('AUDIO', '⚠️  Continuing without audio (non-blocking failure)');
      this.manager.audioGenerated = false;
    }
  }

  private async executeStoryboarding() {
    this.log('STORY', 'Generating storyboard...');
    try {
      const script = await this.manager.getAsset<Script>('script');
      if (!script) throw new Error('No script found');

      const storyboard = await generateStoryboard(script, {
        onProgress: (msg) => this.log('STORY', msg),
        brief: this.brief,
      });

      const validation = validateStoryboard(storyboard);
      if (!validation.valid) {
        throw new Error(`Storyboard validation failed: ${validation.errors.join(', ')}`);
      }

      await this.manager.saveAsset('storyboard', storyboard);

      // Validate visual coherence
      const coherenceReport = await validateStoryboardCoherence(storyboard, this.manager.projectDir);
      if (coherenceReport) {
        // Store coherence report in manager for later use
        this.manager.coherenceReport = coherenceReport;
      }

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

      // Load image prompts so Kling receives per-scene motion hints and real durations
      const imagePrompts = await this.manager.getAsset<ImagePrompts>('image-prompts');

      // Check if ffmpeg is available for frame continuity
      const ffmpegAvailable = await FrameContinuityManager.isFfmpegAvailable();
      if (ffmpegAvailable) {
        this.log('ANIM', '✅ FFmpeg available - frame continuity enabled');
      } else {
        this.log('ANIM', '⚠️  FFmpeg not available - frame continuity disabled');
      }

      // Pass projectDir — animateImages creates clips/ subdirectory internally
      const manifest = await animateImages(imageManifest, this.manager.projectDir, {
        onProgress: (msg) => this.log('ANIM', msg),
        imagePrompts: imagePrompts ?? undefined,
      });

      const validation = validateAnimationManifest(manifest);
      if (!validation.valid && manifest.generatedClips === 0) {
        throw new Error('No clips were generated');
      }

      // Create frame continuity manifest if clips were generated
      if (ffmpegAvailable && manifest.generatedClips > 0) {
        try {
          const frameContinuityManager = new FrameContinuityManager(this.manager.projectDir);
          const frameLinks: FrameLink[] = [];

          // Build frame links from consecutive clips
          for (let i = 0; i < manifest.clips.length - 1; i++) {
            const currentClip = manifest.clips[i];
            const nextClip = manifest.clips[i + 1];

            try {
              const frameFile = await frameContinuityManager.extractFinalFrame(
                currentClip.filePath,
                currentClip.sceneNumber
              );

              frameLinks.push({
                fromScene: currentClip.sceneNumber,
                toScene: nextClip.sceneNumber,
                frameFile,
                extractedAt: new Date().toISOString(),
              });
            } catch (error) {
              this.log('ANIM', `⚠️  Frame extraction failed for scene ${currentClip.sceneNumber}: ${error}`);
            }
          }

          // Save frame continuity manifest
          const frameContinuityManifest = frameContinuityManager.createManifest(frameLinks);
          const manifestPath = path.join(this.manager.projectDir, 'frame-continuity-manifest.json');
          fs.writeFileSync(manifestPath, JSON.stringify(frameContinuityManifest, null, 2));

          this.log('ANIM', `✅ Frame continuity manifest saved (${frameLinks.length} links)`);
          this.manager.frameContinuityManifest = frameContinuityManifest;
        } catch (error) {
          this.log('ANIM', `⚠️  Frame continuity processing failed (non-blocking): ${error}`);
        }
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
        audioPath: this.manager.audioPath,
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

      // Log final report with visual coherence and frame continuity
      this.logFinalReport(script);

      this.log('ASSEM', `✓ Final video: ${result.outputPath} (${script.duration}s)`);
    } catch (error) {
      throw new Error(`Assembly failed: ${error}`);
    }
  }

  private logFinalReport(script: Script) {
    console.log('\n📋 Final Report:');
    console.log('   Script: ✅');

    if (this.manager.audioGenerated) {
      console.log(`   Audio: ✅ (${(this.manager.audioManifest?.totalDuration || 0) / 1000}s)`);
    } else {
      console.log('   Audio: ⚠️  Not generated');
    }

    console.log('   Storyboard: ✅');

    if (this.manager.coherenceReport) {
      console.log(`   Visual Coherence: ${this.manager.coherenceReport.overallScore}/100`);
    } else {
      console.log('   Visual Coherence: ⚠️  Not available');
    }

    if (this.manager.frameContinuityManifest) {
      console.log('   Frame Continuity: ✅ Enabled');
    } else {
      console.log('   Frame Continuity: ⚠️  Disabled');
    }

    console.log('   Images: ✅');
    console.log('   Animation: ✅');
    console.log('   Assembly: ✅');
    console.log(`\n🎬 Final video: ${path.join(this.manager.projectDir, 'out.mp4')}`);
  }

  getStatus(): ProjectStatus {
    return this.manager.getStatus();
  }

  generateReport(): string {
    return this.manager.generateReport();
  }
}
