export const VIDEO_AGENT_CONFIG = {
  // Workflow settings
  autoApproveAfterMinutes: parseInt(process.env.VIDEO_AUTO_APPROVE_AFTER_MINUTES || '0'),
  approvalRequired: process.env.VIDEO_APPROVAL_REQUIRED === 'true', // Changed: false by default
  projectDir: process.env.VIDEO_PROJECT_DIR || './outputs/videos',
  autoExecuteWorkflow: true, // New: skip all approval gates

  // Script generation
  script: {
    defaultDuration: 30, // seconds
    minScenes: 3,
    maxScenes: 8,
    maxIterations: 5,
  },

  // Image generation (kie.ai)
  image: {
    quality: (process.env.KIE_IMAGE_QUALITY || 'high') as 'high' | 'normal' | 'fast',
    batchSize: parseInt(process.env.KIE_BATCH_SIZE || '5'),
    aspectRatio: '16:9',
    resolution: '1920x1080',
    retryAttempts: 3,
    retryDelayMs: 2000,
    timeout: 120000, // 2 minutes
  },

  // Animation (Kling or Remotion fallback)
  animation: {
    preferKling: true,
    klingModel: process.env.KLING_ANIMATION_MODEL || 'kling-v1',
    klingEndpoint: process.env.KLING_API_ENDPOINT || 'https://api.kling.ai/v1',
    defaultDuration: parseInt(process.env.KLING_DEFAULT_DURATION || '5'),
    fallbackToRemotion: process.env.KLING_FALLBACK_TO_REMOTION !== 'false',
    timeout: 180000, // 3 minutes
  },

  // Remotion settings
  remotion: {
    codec: 'h264',
    crf: 18, // quality (0-51, lower = better)
    fps: 30,
    audioCodec: 'aac',
  },

  // Claude settings
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-opus',
    collaborationMode: (process.env.CLAUDE_COLLABORATION_MODE || 'interactive') as 'interactive' | 'batch',
    temperature: 0.7,
  },

  // Storage
  storage: {
    checkpointInterval: 5000, // ms
    enableCompression: false,
    maxCheckpoints: 10,
  },

  // UI
  ui: {
    showProgressBar: true,
    verboseLogging: process.env.DEBUG === 'true',
  },
};

export const STEP_ESTIMATES = {
  scripting: 5, // minutes
  audio: 2,
  storyboarding: 5,
  prompts: 2,
  images: 15,
  animation: 20,
  assembly: 5,
};

export const STEPS = [
  'scripting',
  'audio',
  'storyboarding',
  'prompts',
  'images',
  'animation',
  'assembly',
] as const;

export const KLING_CONFIG = {
  model: 'kling-v3',
  defaultMotionIntensity: 30,
  motionOptions: {
    'subtle-camera': {
      description: 'Smooth, subtle camera movements (pan, dolly)',
      intensity: 20,
    },
    'subject-motion': {
      description: 'Subject movement with camera stability',
      intensity: 40,
    },
    'complex-motion': {
      description: 'Complex camera and subject motion combined',
      intensity: 60,
    },
    'static': {
      description: 'Minimal motion, focus on composition',
      intensity: 0,
    },
  },
};

// Visual Enhancement Configuration
// Features are auto-enabled based on API key availability and system dependencies
export const VISUAL_ENHANCEMENT_CONFIG = {
  // Feature toggles (auto-detect based on API availability)
  colorSchemes: {
    enabled: !!process.env.CLAUDE_API_KEY,
    description: 'Claude-powered color scheme generation for storyboard scenes',
  },
  cinematicReferences: {
    enabled: !!process.env.CLAUDE_API_KEY,
    description: 'Movie/TV show cinematographic reference suggestions',
  },
  motionOptions: {
    enabled: !!process.env.KLING_API_KEY,
    description: 'Kling 3.0 motion hints (subtle-camera, subject-motion, complex-motion)',
  },
  frameContinuity: {
    enabled: process.env.FFMPEG_AVAILABLE !== 'false',
    description: 'Frame continuity linking - uses final frame of one clip as start of next',
  },
  visualCoherence: {
    enabled: true,
    description: 'Visual coherence validation - checks color consistency, motion flow, style coherence',
  },

  // Default values
  defaults: {
    colorMoodOptions: ['warm', 'cool', 'vibrant', 'neutral'] as const,
    gradingStyles: ['cinematic', 'modern', 'vintage', 'documentary'] as const,
    motionIntensityRange: { min: 0, max: 100 },
    motionTypes: ['subtle-camera', 'subject-motion', 'complex-motion', 'static'] as const,
  },

  // Thresholds for coherence analysis
  coherenceThresholds: {
    colorAcceptable: 70, // Scores >= 70 are acceptable
    motionAcceptable: 70,
    styleAcceptable: 70,
    overallMinimum: 60, // Warn if overall score < 60
  },
};

// Initialize and log which features are enabled on startup
export function initializeVisualEnhancements(): void {
  console.log('📊 Visual Enhancement Features:');
  const features = [
    { key: 'colorSchemes', config: VISUAL_ENHANCEMENT_CONFIG.colorSchemes },
    { key: 'cinematicReferences', config: VISUAL_ENHANCEMENT_CONFIG.cinematicReferences },
    { key: 'motionOptions', config: VISUAL_ENHANCEMENT_CONFIG.motionOptions },
    { key: 'frameContinuity', config: VISUAL_ENHANCEMENT_CONFIG.frameContinuity },
    { key: 'visualCoherence', config: VISUAL_ENHANCEMENT_CONFIG.visualCoherence },
  ];

  features.forEach(({ key, config }) => {
    const status = config.enabled ? '✅' : '⚠️';
    console.log(`   ${status} ${key}: ${config.description}`);
  });
}

// Eleven Labs Text-to-Speech Configuration
export const ELEVEN_LABS_CONFIG = {
  enabled: !!process.env.ELEVEN_LABS_API_KEY,
  apiKey: process.env.ELEVEN_LABS_API_KEY,
  voiceId: process.env.ELEVEN_LABS_VOICE_ID || 'bella', // Default voice

  // Voice options (popular Eleven Labs voices)
  voices: {
    bella: { id: '21m00Tcm4TlvDq8ikWAM', name: 'Bella', gender: 'female' },
    josh: { id: 'TXe3JqFHuPnl9XUzIHl7', name: 'Josh', gender: 'male' },
    samantha: { id: 'kL883cKlDUHpXJ4xm2aH', name: 'Samantha', gender: 'female' },
    thomas: { id: 'tLqHw0jjVvGdqD8cVJPf', name: 'Thomas', gender: 'male' },
  },

  // Default synthesis settings
  defaults: {
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  },

  // Duration validation
  durationValidation: {
    tolerance: 10, // ±10% variance acceptable
  },

  // API settings
  endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
};
