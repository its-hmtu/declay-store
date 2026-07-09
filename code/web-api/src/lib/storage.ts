import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
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

export function isCloudinaryEnabled(): boolean {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * W-18: store a file in object storage (Cloudinary) when configured, otherwise
 * fall back to the local public/uploads disk (dev / single-instance). Returns a URL.
 */
export async function storeFile(file: UploadFile, opts: StoreOptions): Promise<string> {
  return isCloudinaryEnabled() ? uploadToCloudinary(file, opts) : saveToDisk(file);
}

async function uploadToCloudinary(file: UploadFile, opts: StoreOptions): Promise<string> {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  const timestamp = Math.floor(Date.now() / 1000);

  // Sign only the non-file params, alphabetically, per Cloudinary's signed-upload spec.
  const signParams: Record<string, string | number> = { folder: opts.folder, timestamp };
  const toSign = Object.keys(signParams).sort().map((k) => `${k}=${signParams[k]}`).join('&');
  const signature = crypto.createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', opts.folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${opts.resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) {
    throw new Error(json.error?.message || 'Cloudinary upload failed');
  }
  return json.secure_url;
}

function saveToDisk(file: UploadFile): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return `${config.server.publicUrl}/uploads/${filename}`;
}
