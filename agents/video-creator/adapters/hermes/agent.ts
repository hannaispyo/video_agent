/**
 * Hermes AI Agent — Video Creator
 *
 * Reads task from the Hermes API, generates a video, and reports back.
 *
 * Env vars:
 *   HERMES_API_URL      - Base URL of the Hermes API, e.g. https://hermes.yourdomain.com
 *   HERMES_API_KEY      - Bearer token for Hermes API
 *   HERMES_TASK_ID      - Task ID to execute (set by Hermes when spawning this agent)
 *
 * Usage:
 *   npx ts-node agents/video-creator/adapters/hermes/agent.ts
 */

import { videoCreatorSkill } from '../../skill-entry';
import { uploadVideo } from '../../storage-uploader';

// ─── Hermes API client ────────────────────────────────────────────────────────

interface HermesTask {
  id: string;
  status: string;
  input: {
    brief: string;
    audience: string;
    message: string;
    duration?: number;
    tone?: string;
    style?: string;
    motion?: string;
    colorMood?: string;
    callbackUrl?: string;
  };
}

interface HermesResult {
  taskId: string;
  status: 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
  durationMin?: number;
  completedAt: string;
}

async function fetchTask(taskId: string): Promise<HermesTask> {
  const base = process.env.HERMES_API_URL?.replace(/\/$/, '');
  const key  = process.env.HERMES_API_KEY;

  if (!base) throw new Error('HERMES_API_URL is not set');

  const res = await fetch(`${base}/api/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) throw new Error(`Hermes API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<HermesTask>;
}

async function reportResult(taskId: string, result: HermesResult): Promise<void> {
  const base = process.env.HERMES_API_URL?.replace(/\/$/, '');
  const key  = process.env.HERMES_API_KEY;

  if (!base) {
    console.log('[hermes] No HERMES_API_URL — printing result to stdout');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const res = await fetch(`${base}/api/tasks/${taskId}/result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(result),
  });

  if (res.ok) {
    console.log(`[hermes] ✅ Result reported to Hermes (${res.status})`);
  } else {
    console.error(`[hermes] ⚠️  Failed to report result: ${res.status} ${res.statusText}`);
  }

  // Also fire callbackUrl if provided in the task
  const callbackUrl = (await fetchTask(taskId)).input?.callbackUrl;
  if (callbackUrl) {
    try {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      console.log(`[hermes] ✅ Webhook delivered to ${callbackUrl}`);
    } catch (e) {
      console.error(`[hermes] ⚠️  Webhook failed: ${e}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const taskId = process.env.HERMES_TASK_ID;

  if (!taskId) {
    console.error('❌ HERMES_TASK_ID is not set');
    process.exit(1);
  }

  console.log(`[hermes] Task ID: ${taskId}`);

  // ── Fetch task ──────────────────────────────────────────────────────────────
  let task: HermesTask;
  try {
    task = await fetchTask(taskId);
    console.log(`[hermes] Brief: "${task.input.brief}"`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[hermes] ❌ Failed to fetch task: ${msg}`);
    process.exit(1);
  }

  const { brief, audience, message, duration, tone, style, motion, colorMood } = task.input;

  if (!brief || !audience || !message) {
    await reportResult(taskId, {
      taskId,
      status: 'failed',
      error: 'Missing required fields in task input: brief, audience, message',
      completedAt: new Date().toISOString(),
    });
    process.exit(1);
  }

  // ── Execute ─────────────────────────────────────────────────────────────────
  const startMs = Date.now();

  console.log('[hermes] Starting video creation workflow...\n');

  const result = await videoCreatorSkill({
    brief,
    audience,
    message,
    duration: duration ? String(duration) : undefined,
    tone,
    style,
    motion,
    colorMood,
  });

  const durationMin = parseFloat(((Date.now() - startMs) / 60000).toFixed(1));

  // ── Upload & report ─────────────────────────────────────────────────────────
  let videoUrl: string | undefined;

  if (result.success && result.outputPath) {
    try {
      const projectName = result.projectName ?? taskId;
      const upload = await uploadVideo(result.outputPath, projectName);
      videoUrl = upload.url;
      console.log(`[hermes] Uploaded: ${videoUrl}`);
    } catch (err) {
      console.warn(`[hermes] ⚠️  Upload failed (continuing): ${err}`);
      videoUrl = result.outputPath; // fallback to local path
    }
  }

  await reportResult(taskId, {
    taskId,
    status: result.success ? 'completed' : 'failed',
    videoUrl,
    error: result.success ? undefined : result.message,
    durationMin,
    completedAt: new Date().toISOString(),
  });

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('[hermes] Unhandled error:', err);
  process.exit(1);
});
