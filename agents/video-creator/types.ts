export interface VideoBrief {
  title: string;
  audience: string;
  keyMessage: string;
  duration?: number; // seconds
  tone?: 'energetic' | 'steady' | 'comedic' | 'educational' | 'professional';
  campaign?: string;
  // Visual direction — constrains Claude's choices for storyboard and Kling prompts
  style?: string;       // e.g. "flat lay con objetos físicos, iluminación cálida"
  motion?: 'subtle-camera' | 'subject-motion' | 'complex-motion' | 'static';
  colorMood?: 'warm' | 'cool' | 'vibrant' | 'neutral';
}

export interface SkillInput {
  brief?: string;
  audience?: string;
  message?: string;
  duration?: string;
  tone?: string;
  style?: string;       // visual concept: "flat lay con objetos físicos, iluminación cálida"
  motion?: string;      // Kling motion type: subtle-camera | subject-motion | complex-motion | static
  colorMood?: string;   // color palette mood: warm | cool | vibrant | neutral
  project?: string;
  resume?: boolean;
  verbose?: boolean;
}

export interface MotionOption {
  type: 'subtle-camera' | 'subject-motion' | 'complex-motion' | 'static';
  camera?: {
    motion: 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'dolly' | 'tilt' | 'none';
    speed: 'slow' | 'medium' | 'fast';
    intensity: number; // 0-100
  };
  subject?: {
    present: boolean;
    motion: 'walk' | 'gesture' | 'write' | 'idle' | 'custom';
    frameConsistency: boolean;
  };
}

export interface ColorScheme {
  primary: string; // hex color
  secondary: string; // hex color
  accent: string; // hex color
  mood: 'warm' | 'cool' | 'neutral' | 'vibrant';
  grading: 'cinematic' | 'modern' | 'vintage' | 'documentary';
}

export interface CinematicReference {
  movie?: string;
  tvShow?: string;
  style: string;
  inspirationBrief: string;
}

export interface Scene {
  number: number;
  duration: number;
  scriptLine: string;
  voiceover?: string;
  motionRequirements?: string;
  subjectPresent?: boolean;
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
  colorScheme?: ColorScheme;
  motionOption?: MotionOption;
  cinematicReference?: CinematicReference;
  frameContinuity?: {
    linkedFromScene?: number;
    linkedToScene?: number;
  };
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
    intensity?: number;
    subjectMotion?: string;
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

export interface AudioAsset {
  sceneNumber?: number; // Optional if audio is whole voiceover
  filePath: string;     // Path to MP3 file
  durationMs: number;   // Duration in milliseconds
  voiceId: string;      // Eleven Labs voice ID used
  generatedAt: string;  // ISO timestamp
}

export interface AudioManifest {
  totalDuration: number;  // Total audio duration in milliseconds
  voiceId: string;
  model: string;
  assets: AudioAsset[];
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

export interface ColorAnalysis {
  score: number;
  issues: string[];
  colorVariances: number[];
}

export interface MotionAnalysis {
  score: number;
  issues: string[];
  jumps: Array<{from: number, to: number, percentChange: number}>;
}

export interface StyleAnalysis {
  score: number;
  issues: string[];
  gradingStyles: string[];
  cinematicReferences: string[];
}

export interface VisualCoherence {
  overallScore: number;
  colorScore: number;
  motionScore: number;
  styleScore: number;
  issues: string[];
  recommendation: string;
}
