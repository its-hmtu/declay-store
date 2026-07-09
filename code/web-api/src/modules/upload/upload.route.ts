import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import asyncHandler from 'express-async-handler';
import { adminProtect } from '@/middlewares/admin.middleware';
import { uploadLimiter } from '@/middlewares/rate-limit.middleware';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import { storeFile } from '@/lib/storage';

const storage = multer.memoryStorage();

const ALLOWED_IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
  },
});

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

// Admin image upload: POST /api/admin/upload  (multipart field "file")
export function createUploadRouter(): Router {
  const router = Router();
  router.post(
    '/',
    adminProtect,
    imageUpload.single('file'),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) throw httpError(400, 'No file provided');
      const url = await storeFile(req.file, { folder: 'declay/products', resourceType: 'image' });
      sendSuccess(res, { url }, 'File uploaded successfully', 201);
    }),
  );
  return router;
}

// Public CV upload for job applicants: POST /api/careers/cv  (multipart field "file")
export function createCvUploadRouter(): Router {
  const router = Router();
  router.post(
    '/',
    uploadLimiter,
    cvUpload.single('file'),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) throw httpError(400, 'No file provided');
      const url = await storeFile(req.file, { folder: 'declay/cvs', resourceType: 'raw' });
      sendSuccess(res, { url }, 'CV uploaded successfully', 201);
    }),
  );
  return router;
}
