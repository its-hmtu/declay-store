import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import config from '@/config/env';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface StoreOptions {
  folder: string;
  resourceType: 'image' | 'raw';
}

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  configured = true;
}

export function isCloudinaryEnabled(): boolean {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * W-18: store a file in Cloudinary when configured, otherwise fall back to the local
 * public/uploads disk (dev / single-instance). Returns a served URL.
 */
export async function storeFile(file: UploadFile, opts: StoreOptions): Promise<string> {
  return isCloudinaryEnabled() ? uploadToCloudinary(file, opts) : saveToDisk(file);
}

async function uploadToCloudinary(file: UploadFile, opts: StoreOptions): Promise<string> {
  ensureConfigured();
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: opts.folder, resource_type: opts.resourceType },
      (err, res) => (err || !res ? reject(err ?? new Error('Cloudinary upload failed')) : resolve(res)),
    );
    stream.end(file.buffer);
  });
  return result.secure_url;
}

function saveToDisk(file: UploadFile): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return `${config.server.publicUrl}/uploads/${filename}`;
}

/**
 * Best-effort deletion of a previously stored file. Cloudinary assets are removed via
 * the SDK's destroy (public_id + resource_type parsed from the URL); local files are
 * unlinked. Never throws for the caller — cleanup failures must not block the operation.
 */
export async function deleteFile(url: string): Promise<void> {
  if (!url) return;
  try {
    if (url.includes('res.cloudinary.com')) {
      if (!isCloudinaryEnabled()) return;
      ensureConfigured();
      const m = /res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/.exec(url);
      if (!m) return;
      const resourceType = m[1] as 'image' | 'raw' | 'video';
      const publicId = m[2].replace(/\.[^./]+$/, '');
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } else {
      const m = /\/uploads\/([^/?#]+)$/.exec(url);
      if (m) fs.rmSync(path.join(UPLOAD_DIR, m[1]), { force: true });
    }
  } catch {
    // swallow — orphan cleanup is non-critical
  }
}
