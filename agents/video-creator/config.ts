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
  storyboarding: 5,
  prompts: 2,
  images: 15,
  animation: 20,
  assembly: 5,
};

export const STEPS = [
  'scripting',
  'storyboarding',
  'prompts',
  'images',
  'animation',
  'assembly',
] as const;
