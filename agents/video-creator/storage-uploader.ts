import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

interface UploadResult {
  url: string;
  bucket?: string;
  key?: string;
}

/**
 * Upload a file to S3 or Cloudflare R2 and return its public URL.
 *
 * Supported env vars:
 *   STORAGE_BUCKET      - bucket name (required for S3/R2)
 *   STORAGE_REGION      - AWS region, default us-east-1
 *   STORAGE_ENDPOINT    - custom endpoint for R2: https://{accountId}.r2.cloudflarestorage.com
 *   STORAGE_PUBLIC_URL  - base URL for public access, e.g. https://videos.yourdomain.com
 *   AWS_ACCESS_KEY_ID   - S3/R2 access key
 *   AWS_SECRET_ACCESS_KEY - S3/R2 secret key
 *
 * If no STORAGE_BUCKET is set, falls back to a local file:// URL.
 */
export async function uploadVideo(
  localPath: string,
  projectName: string
): Promise<UploadResult> {
  const bucket = process.env.STORAGE_BUCKET;

  if (!bucket) {
    // Local fallback — return absolute path as URL
    const absPath = path.resolve(localPath);
    console.log(`[STORAGE] No STORAGE_BUCKET set — using local path: ${absPath}`);
    return { url: `file://${absPath}` };
  }

  const region = process.env.STORAGE_REGION || 'us-east-1';
  const endpoint = process.env.STORAGE_ENDPOINT; // set for R2
  const publicBaseUrl = process.env.STORAGE_PUBLIC_URL;

  const s3 = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: false } : {}),
  });

  const key = `videos/${projectName}/out.mp4`;
  const fileStream = fs.createReadStream(localPath);
  const fileSize = fs.statSync(localPath).size;

  console.log(`[STORAGE] Uploading ${projectName} (${(fileSize / 1024 / 1024).toFixed(1)}MB) to s3://${bucket}/${key}`);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentType: 'video/mp4',
      // Remove ACL for R2 compatibility — use public bucket policy instead
    },
  });

  upload.on('httpUploadProgress', (progress) => {
    if (progress.loaded && progress.total) {
      const pct = Math.round((progress.loaded / progress.total) * 100);
      process.stdout.write(`\r[STORAGE] Upload progress: ${pct}%`);
    }
  });

  await upload.done();
  process.stdout.write('\n');

  // Build public URL
  let url: string;
  if (publicBaseUrl) {
    url = `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
  } else if (endpoint) {
    // R2 without custom domain — construct from endpoint
    url = `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
  } else {
    url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  console.log(`[STORAGE] ✅ Uploaded: ${url}`);
  return { url, bucket, key };
}
