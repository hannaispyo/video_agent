import * as fs from 'fs';
import * as path from 'path';
import { VIDEO_AGENT_CONFIG, STEPS, STEP_ESTIMATES } from './config';
import {
  ProjectCheckpoint,
  ProjectStatus,
  VideoBrief,
  Script,
  Storyboard,
  ImagePrompts,
  ImageManifest,
  AnimationManifest,
  VisualCoherence,
  AudioManifest,
} from './types';

export class VideoProjectManager {
  projectName: string;
  projectDir: string;
  state: ProjectCheckpoint;
  createdAt: Date;
  coherenceReport?: VisualCoherence;
  frameContinuityManifest?: Record<string, any>;
  audioPath?: string;
  audioManifest?: AudioManifest;
  audioGenerated: boolean = false;

  constructor(projectName: string) {
    this.projectName = projectName;
    this.projectDir = path.join(VIDEO_AGENT_CONFIG.projectDir, projectName);
    this.createdAt = new Date();

    // Initialize default state
    this.state = {
      projectName,
      currentStep: 'scripting',
      completedSteps: [],
      status: 'pending',
      approvals: {},
      assets: {},
      timestamps: {
        created: new Date().toISOString(),
      },
      errorLog: [],
    };
  }

  async initialize(brief: VideoBrief): Promise<void> {
    // Create project directory
    if (!fs.existsSync(this.projectDir)) {
      fs.mkdirSync(this.projectDir, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['images', 'clips', 'temp'];
    for (const subdir of subdirs) {
      const fullPath = path.join(this.projectDir, subdir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }

    // Save brief
    this.saveBrief(brief);
    console.log(`✓ Initialized project: ${this.projectName}`);
  }

  async advance(nextStep?: string): Promise<boolean> {
    const currentIndex = STEPS.indexOf(this.state.currentStep as any);
    const nextIndex = nextStep
      ? STEPS.indexOf(nextStep as any)
      : currentIndex + 1;

    if (nextIndex >= STEPS.length) {
      this.state.currentStep = 'completed';
      this.state.status = 'completed';
      return true;
    }

    this.state.currentStep = STEPS[nextIndex] as any;
    await this.saveCheckpoint();
    return true;
  }

  async recordApproval(step: string, approved: boolean): Promise<void> {
    this.state.approvals[step] = approved;
    if (approved && !this.state.completedSteps.includes(step)) {
      this.state.completedSteps.push(step);
      this.state.timestamps[`${step}Completed`] = new Date().toISOString();
    }
    await this.saveCheckpoint();
  }

  async updateManifest(step: string, output: Record<string, any>): Promise<void> {
    const manifestPath = path.join(this.projectDir, `${step}-manifest.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(output, null, 2));
    (this.state.assets as Record<string, string>)[step] = manifestPath;
    await this.saveCheckpoint();
  }

  async saveCheckpoint(): Promise<void> {
    const checkpointPath = path.join(this.projectDir, 'checkpoint.json');
    fs.writeFileSync(checkpointPath, JSON.stringify(this.state, null, 2));
  }

  async loadCheckpoint(): Promise<void> {
    const checkpointPath = path.join(this.projectDir, 'checkpoint.json');
    if (fs.existsSync(checkpointPath)) {
      const data = fs.readFileSync(checkpointPath, 'utf-8');
      this.state = JSON.parse(data);
      console.log(`✓ Loaded checkpoint from step: ${this.state.currentStep}`);
    }
  }

  getStatus(): ProjectStatus {
    const totalSteps = STEPS.length;
    const completedCount = this.state.completedSteps.length;
    const progress = Math.round((completedCount / totalSteps) * 100);

    // Estimate remaining time based on what's left
    let estimatedMinutes = 0;
    const currentIndex = STEPS.indexOf(this.state.currentStep as any);
    for (let i = currentIndex; i < STEPS.length; i++) {
      estimatedMinutes += STEP_ESTIMATES[STEPS[i] as keyof typeof STEP_ESTIMATES];
    }

    return {
      projectName: this.projectName,
      currentStep: this.state.currentStep,
      progress,
      completedSteps: this.state.completedSteps,
      estimatedTimeRemaining: estimatedMinutes,
      lastUpdate: new Date().toISOString(),
      assets: this.state.assets,
    };
  }

  private saveBrief(brief: VideoBrief): void {
    const briefPath = path.join(this.projectDir, 'brief.json');
    fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2));
  }

  async getAsset<T>(assetName: string): Promise<T | null> {
    const assetPath = (this.state.assets as Record<string, string>)[assetName];
    if (!assetPath) return null;

    try {
      const data = fs.readFileSync(assetPath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Failed to load asset: ${assetName}`, error);
      return null;
    }
  }

  async saveAsset(name: string, data: Record<string, any>): Promise<string> {
    const assetPath = path.join(this.projectDir, `${name}.json`);
    fs.writeFileSync(assetPath, JSON.stringify(data, null, 2));
    (this.state.assets as Record<string, string>)[name] = assetPath;
    await this.saveCheckpoint();
    return assetPath;
  }

  addError(error: string): void {
    if (!this.state.errorLog) {
      this.state.errorLog = [];
    }
    this.state.errorLog.push(`[${new Date().toISOString()}] ${error}`);
  }

  generateReport(): string {
    const status = this.getStatus();
    const report = `
╔═══════════════════════════════════════╗
║   VIDEO PROJECT STATUS REPORT         ║
╚═══════════════════════════════════════╝

Project: ${this.projectName}
Current Step: ${status.currentStep}
Progress: ${status.progress}% (${status.completedSteps.length}/${STEPS.length} steps)

Completed Steps:
${status.completedSteps.map((s) => `  ✓ ${s}`).join('\n')}

Estimated Time Remaining: ${status.estimatedTimeRemaining} minutes

Assets Generated:
${Object.entries(status.assets)
  .map(([key, val]) => `  ${key}: ${val}`)
  .join('\n')}

${this.state.errorLog && this.state.errorLog.length > 0
  ? `\nErrors:\n${this.state.errorLog.map((e) => `  ⚠ ${e}`).join('\n')}`
  : ''}

Last Updated: ${status.lastUpdate}
    `;
    return report;
  }
}
