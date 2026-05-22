/**
 * Video Creator API Server
 *
 * POST /videos  — submit a brief, receive jobId immediately
 * GET  /videos/:jobId — check job status
 *
 * When the video is ready:
 *   1. Uploads MP4 to S3 / R2 (or keeps local path if no storage configured)
 *   2. POSTs result to callbackUrl provided in the brief
 *
 * Start: npx ts-node agents/video-creator/api-server.ts
 */

import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { videoCreatorSkill } from './skill-entry';
import { uploadVideo } from './storage-uploader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoBriefRequest {
  // Required
  brief: string;
  audience: string;
  message: string;
  callbackUrl: string;
  // Optional
  duration?: number;
  tone?: 'energetic' | 'steady' | 'comedic' | 'educational' | 'professional';
  style?: string;
  motion?: 'subtle-camera' | 'subject-motion' | 'complex-motion' | 'static';
  colorMood?: 'warm' | 'cool' | 'vibrant' | 'neutral';
}

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface Job {
  jobId: string;
  status: JobStatus;
  brief: VideoBriefRequest;
  startedAt?: string;
  completedAt?: string;
  videoUrl?: string;
  error?: string;
}

// ─── In-memory job store ───────────────────────────────────────────────────────

const jobs = new Map<string, Job>();

// ─── Validation ───────────────────────────────────────────────────────────────

function validateBrief(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!body.brief)       errors.push('brief is required');
  if (!body.audience)    errors.push('audience is required');
  if (!body.message)     errors.push('message is required');
  if (!body.callbackUrl) errors.push('callbackUrl is required');

  const validTones = ['energetic', 'steady', 'comedic', 'educational', 'professional'];
  if (body.tone && !validTones.includes(body.tone)) {
    errors.push(`tone must be one of: ${validTones.join(', ')}`);
  }

  const validMotions = ['subtle-camera', 'subject-motion', 'complex-motion', 'static'];
  if (body.motion && !validMotions.includes(body.motion)) {
    errors.push(`motion must be one of: ${validMotions.join(', ')}`);
  }

  const validMoods = ['warm', 'cool', 'vibrant', 'neutral'];
  if (body.colorMood && !validMoods.includes(body.colorMood)) {
    errors.push(`colorMood must be one of: ${validMoods.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Job runner ───────────────────────────────────────────────────────────────

async function runJob(job: Job): Promise<void> {
  const { brief } = job;

  jobs.set(job.jobId, { ...job, status: 'processing', startedAt: new Date().toISOString() });
  console.log(`[JOB ${job.jobId}] Started`);

  let videoUrl: string | undefined;
  let error: string | undefined;

  try {
    const result = await videoCreatorSkill({
      brief: brief.brief,
      audience: brief.audience,
      message: brief.message,
      duration: brief.duration ? String(brief.duration) : undefined,
      tone: brief.tone,
      style: brief.style,
      motion: brief.motion,
      colorMood: brief.colorMood,
    });

    if (!result.success || !result.outputPath) {
      throw new Error(result.message || 'Video generation failed');
    }

    // Upload to storage
    console.log(`[JOB ${job.jobId}] Uploading video...`);
    const upload = await uploadVideo(result.outputPath, job.jobId);
    videoUrl = upload.url;

    console.log(`[JOB ${job.jobId}] ✅ Done — ${videoUrl}`);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`[JOB ${job.jobId}] ❌ Failed: ${error}`);
  }

  const completedAt = new Date().toISOString();
  const finalStatus: JobStatus = error ? 'failed' : 'completed';

  jobs.set(job.jobId, {
    ...jobs.get(job.jobId)!,
    status: finalStatus,
    completedAt,
    videoUrl,
    error,
  });

  // Fire webhook
  await fireWebhook(brief.callbackUrl, {
    jobId: job.jobId,
    status: finalStatus,
    videoUrl,
    error,
    brief: brief.brief,
    completedAt,
  });
}

async function fireWebhook(url: string, payload: object): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`[WEBHOOK] POST ${url} → ${res.status}`);
  } catch (err) {
    console.error(`[WEBHOOK] Failed to deliver to ${url}:`, err);
  }
}

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

/**
 * POST /videos
 * Submit a video brief. Returns jobId immediately.
 */
app.post('/videos', (req: Request, res: Response) => {
  const body = req.body as VideoBriefRequest;

  const validation = validateBrief(body);
  if (!validation.valid) {
    res.status(400).json({ error: 'Invalid brief', details: validation.errors });
    return;
  }

  // Generate jobId from brief title slug
  const jobId = body.brief
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50)
    .replace(/^-+|-+$/g, '');

  if (jobs.has(jobId)) {
    const existing = jobs.get(jobId)!;
    res.status(409).json({
      error: `Job "${jobId}" already exists`,
      status: existing.status,
      jobId,
    });
    return;
  }

  const job: Job = { jobId, status: 'queued', brief: body };
  jobs.set(jobId, job);

  // Fire and forget — response returns before processing starts
  setImmediate(() => runJob(job));

  res.status(202).json({
    jobId,
    status: 'queued',
    message: 'Video creation started. You will receive a webhook when complete.',
    estimatedMinutes: '60-90',
  });
});

/**
 * GET /videos/:jobId
 * Check the status of a job.
 */
app.get('/videos/:jobId', (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json({
    jobId: job.jobId,
    status: job.status,
    videoUrl: job.videoUrl,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});

/**
 * GET /health
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, jobs: jobs.size });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, () => {
  console.log(`\n🎬 Video Creator API running on port ${PORT}`);
  console.log(`   POST /videos        — submit a brief`);
  console.log(`   GET  /videos/:jobId — check status`);
  console.log(`   GET  /health        — health check\n`);
});

export default app;
