import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { AdapterExecutionContext, AdapterExecutionResult, asString, asNumber } from './types';

// Root of the video-creator project (two levels up from adapters/paperclip/)
const AGENT_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

/**
 * Build the env vars the video creator needs, merging Paperclip config
 * with whatever is already set in process.env.
 */
function buildEnv(config: Record<string, unknown>): Record<string, string> {
  return {
    ...process.env as Record<string, string>,
    // API keys from Paperclip agent config (override process.env if provided)
    ...(asString(config.claudeApiKey)       ? { CLAUDE_API_KEY: asString(config.claudeApiKey) }       : {}),
    ...(asString(config.kieApiKey)          ? { KIE_API_KEY: asString(config.kieApiKey) }             : {}),
    ...(asString(config.elevenLabsApiKey)   ? { ELEVEN_LABS_API_KEY: asString(config.elevenLabsApiKey) } : {}),
    ...(asString(config.awsAccessKeyId)     ? { AWS_ACCESS_KEY_ID: asString(config.awsAccessKeyId) }  : {}),
    ...(asString(config.awsSecretAccessKey) ? { AWS_SECRET_ACCESS_KEY: asString(config.awsSecretAccessKey) } : {}),
    ...(asString(config.storageBucket)      ? { STORAGE_BUCKET: asString(config.storageBucket) }      : {}),
    ...(asString(config.storagePublicUrl)   ? { STORAGE_PUBLIC_URL: asString(config.storagePublicUrl) } : {}),
    ...(asString(config.storageEndpoint)    ? { STORAGE_ENDPOINT: asString(config.storageEndpoint) }  : {}),
  };
}

/**
 * Extract the video brief from the Paperclip task context.
 * Paperclip passes task input via context.data (or the template prompt).
 */
function extractBrief(context: Record<string, unknown>): {
  brief: string;
  audience: string;
  message: string;
  duration?: string;
  tone?: string;
  style?: string;
  motion?: string;
  colorMood?: string;
} | null {
  // Try context.data first (structured input)
  const data = (context.data ?? context) as Record<string, unknown>;

  const brief    = asString(data.brief);
  const audience = asString(data.audience);
  const message  = asString(data.message ?? data.keyMessage);

  if (!brief || !audience || !message) return null;

  return {
    brief,
    audience,
    message,
    duration:   asString(data.duration)   || undefined,
    tone:       asString(data.tone)        || undefined,
    style:      asString(data.style)       || undefined,
    motion:     asString(data.motion)      || undefined,
    colorMood:  asString(data.colorMood)   || undefined,
  };
}

/**
 * Spawn the video creator CLI as a child process and stream its output
 * back to Paperclip via onLog.
 */
async function runVideoCreator(
  briefArgs: string[],
  env: Record<string, string>,
  timeoutMs: number,
  onLog: AdapterExecutionContext['onLog']
): Promise<{ exitCode: number | null; stdout: string; timedOut: boolean }> {
  const skillEntry = path.join(AGENT_ROOT, 'agents', 'video-creator', 'skill-entry.ts');
  const tsNode     = path.join(AGENT_ROOT, 'node_modules', '.bin', 'ts-node');

  return new Promise((resolve) => {
    const proc = spawn(tsNode, [skillEntry, ...briefArgs], {
      cwd: AGENT_ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, timeoutMs);

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      onLog('stdout', text).catch(() => {});
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      onLog('stderr', chunk.toString()).catch(() => {});
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code, stdout, timedOut });
    });
  });
}

/**
 * Main Paperclip adapter execute function.
 */
export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, config, context, onLog } = ctx;

  // 90-minute timeout (video creation takes 60-90 min)
  const timeoutSec = asNumber(config.timeoutSec, 5400);
  const model      = asString(config.model, 'kling-2.6');

  await onLog('stdout', '[video-creator] Starting Paperclip adapter\n');
  await onLog('stdout', `[video-creator] Agent root: ${AGENT_ROOT}\n`);

  // ── Extract brief ──────────────────────────────────────────────────────────
  const brief = extractBrief(context);
  if (!brief) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: 'Missing required fields: brief, audience, message. ' +
        'Pass them in the task data as { "brief": "...", "audience": "...", "message": "..." }',
      errorCode: 'missing_brief',
      summary: '❌ Brief inválido — faltan campos requeridos',
    };
  }

  await onLog('stdout', `[video-creator] Brief: "${brief.brief}"\n`);
  await onLog('stdout', `[video-creator] Audience: "${brief.audience}"\n`);
  await onLog('stdout', `[video-creator] Message: "${brief.message}"\n`);
  if (brief.style)     await onLog('stdout', `[video-creator] Style: "${brief.style}"\n`);
  if (brief.motion)    await onLog('stdout', `[video-creator] Motion: "${brief.motion}"\n`);
  if (brief.colorMood) await onLog('stdout', `[video-creator] Color Mood: "${brief.colorMood}"\n`);

  // ── Build CLI args ─────────────────────────────────────────────────────────
  const args: string[] = [
    '--brief',    brief.brief,
    '--audience', brief.audience,
    '--message',  brief.message,
  ];
  if (brief.duration)   args.push('--duration',    brief.duration);
  if (brief.tone)       args.push('--tone',         brief.tone);
  if (brief.style)      args.push('--style',        brief.style);
  if (brief.motion)     args.push('--motion',       brief.motion);
  if (brief.colorMood)  args.push('--color-mood',   brief.colorMood);

  if (model === 'remotion-only') {
    // Disable Kling — use Remotion fallback only
    args.push('--skipStep', 'images');
  }

  // ── Run ────────────────────────────────────────────────────────────────────
  const env = buildEnv(config);
  const start = Date.now();

  await onLog('stdout', `[video-creator] Spawning skill-entry.ts (timeout: ${timeoutSec}s)\n`);

  const result = await runVideoCreator(args, env, timeoutSec * 1000, onLog);
  const durationMin = ((Date.now() - start) / 60000).toFixed(1);

  if (result.timedOut) {
    return {
      exitCode: null,
      signal: 'SIGTERM',
      timedOut: true,
      errorMessage: `Video creation timed out after ${timeoutSec}s`,
      errorCode: 'timeout',
      summary: `⏱ Timeout después de ${durationMin} minutos`,
    };
  }

  const succeeded = result.exitCode === 0;

  // Parse output path from stdout
  const outputMatch = result.stdout.match(/📂 Output: (.+\.mp4)/);
  const videoUrl = outputMatch?.[1] ?? null;

  const projectMatch = result.stdout.match(/Project: ([a-z0-9-]+)/);
  const projectName = projectMatch?.[1] ?? 'unknown';

  if (!succeeded) {
    const errorMatch = result.stdout.match(/❌ .+?: (.+)/);
    return {
      exitCode: result.exitCode,
      signal: null,
      timedOut: false,
      errorMessage: errorMatch?.[1] ?? 'Video creation failed',
      errorCode: 'generation_failed',
      summary: `❌ Falló en ${durationMin} min — ${errorMatch?.[1] ?? 'error desconocido'}`,
      resultJson: { projectName, stdout: result.stdout.slice(-4096) },
    };
  }

  await onLog('stdout', `[video-creator] ✅ Completed in ${durationMin} min\n`);

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    provider: 'authoflow',
    biller: 'authoflow',
    model,
    billingType: 'metered_api',
    resultJson: {
      videoUrl,
      projectName,
      durationMin: parseFloat(durationMin),
    },
    summary: `✅ Video generado en ${durationMin} min — ${videoUrl ?? projectName}`,
  };
}
