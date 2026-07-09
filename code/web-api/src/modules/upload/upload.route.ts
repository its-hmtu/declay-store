import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import asyncHandler from 'express-async-handler';
import { adminProtect } from '@/middlewares/admin.middleware';
import { uploadLimiter } from '@/middlewares/rate-limit.middleware';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import config from '@/config/env';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
  },
});

// Admin-only image upload: POST /api/admin/upload  (multipart field "file")
export function createUploadRouter(): Router {
  const router = Router();

  router.post(
    '/',
    adminProtect,
    upload.single('file'),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) throw httpError(400, 'No file provided');
      const url = `${config.server.publicUrl}/uploads/${req.file.filename}`;
      sendSuccess(res, { url }, 'File uploaded successfully', 201);
    }),
  );

  return router;
}

const CV_ALLOWED = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const cvUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (CV_ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF or Word documents are allowed'));
  },
});

// Public CV upload for job applicants: POST /api/careers/cv (multipart field "file")
export function createCvUploadRouter(): Router {
  const router = Router();

  router.post(
    '/',
    uploadLimiter,
    cvUpload.single('file'),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) throw httpError(400, 'No file provided');
      const url = `${config.server.publicUrl}/uploads/${req.file.filename}`;
      sendSuccess(res, { url }, 'CV uploaded successfully', 201);
    }),
  );

  return router;
}
