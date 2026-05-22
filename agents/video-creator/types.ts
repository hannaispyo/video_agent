export interface VideoBrief {
  title: string;
  audience: string;
  keyMessage: string;
  duration?: number; // seconds
  tone?: 'energetic' | 'steady' | 'comedic' | 'educational';
  campaign?: string;
}

export interface Scene {
  number: number;
  duration: number;
  scriptLine: string;
  voiceover?: string;
}

export interface Script {
  title: string;
  duration: number;
  tone: string;
  scenes: Scene[];
  musicMood?: string;
  generatedAt: string;
}

export interface VisualScene {
  sceneNumber: number;
  duration: number;
  scriptLine: string;
  visualDescription: string;
  imagePromptSeed: string;
  style?: string;
  camera?: string;
  animation?: string;
  referenceImageUrl?: string;
}

export interface Storyboard {
  title: string;
  duration: number;
  scenes: VisualScene[];
  generatedAt: string;
}

export interface ImagePrompt {
  sceneNumber: number;
  basePrompt: string;
  kieaiFormat: {
    model: string;
    prompt: string;
    ar?: string;
    quality?: 'high' | 'normal' | 'fast';
  };
  animationHints: {
    motion?: string;
    duration: number;
    transitions?: string;
  };
  customNotes?: string;
}

export interface ImagePrompts {
  scenes: ImagePrompt[];
  generatedAt: string;
}

export interface ImageAsset {
  sceneNumber: number;
  filePath: string;
  generatedAt: string;
  prompt: string;
  metadata?: Record<string, any>;
}

export interface ImageManifest {
  totalScenes: number;
  generatedImages: number;
  failedImages: number;
  assets: ImageAsset[];
  generatedAt: string;
}

export interface AnimationHints {
  motion: string;
  duration: number;
  transitions: string;
}

export interface VideoClip {
  sceneNumber: number;
  filePath: string;
  duration: number;
  codec?: string;
  frameCount?: number;
  generatedAt: string;
}

export interface AnimationManifest {
  totalClips: number;
  generatedClips: number;
  failedClips: number;
  animationModel: string;
  clips: VideoClip[];
  generatedAt: string;
}

export interface ProjectCheckpoint {
  projectName: string;
  currentStep: 'scripting' | 'storyboarding' | 'prompts' | 'images' | 'animation' | 'assembly' | 'completed';
  completedSteps: string[];
  status: 'pending' | 'in_progress' | 'approved' | 'completed' | 'failed';
  approvals: Record<string, boolean>;
  assets: {
    script?: string;
    storyboard?: string;
    prompts?: string;
    images?: string;
    clips?: string;
    finalVideo?: string;
  };
  timestamps: Record<string, string>;
  errorLog?: string[];
}

export interface ProjectStatus {
  projectName: string;
  currentStep: string;
  progress: number; // 0-100
  completedSteps: string[];
  estimatedTimeRemaining: number; // minutes
  lastUpdate: string;
  assets: Record<string, any>;
}

export interface WorkflowResult {
  success: boolean;
  step: string;
  output?: Record<string, any>;
  error?: string;
  timestamp: string;
}
