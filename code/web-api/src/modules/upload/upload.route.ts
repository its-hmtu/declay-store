import { Router, type Request, type Response, type RequestHandler } from 'express';
import multer from 'multer';
import asyncHandler from 'express-async-handler';
import { adminProtect } from '@/middlewares/admin.middleware';
import { routeProtect } from '@/middlewares/auth.middleware';
import { uploadLimiter } from '@/middlewares/rate-limit.middleware';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import { storeFile } from '@/lib/storage';

const storage = multer.memoryStorage();

/** Translate multer rejections (bad type / too large) into clean 400s instead of 500s. */
function handleUpload(mw: RequestHandler): RequestHandler {
  return (req, res, next) => {
    mw(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof multer.MulterError
          ? (err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message)
          : (err instanceof Error ? err.message : 'Upload failed');
        return next(httpError(400, msg));
      }
      next();
    });
  };
}

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
    handleUpload(imageUpload.single('file')),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) throw httpError(400, 'No file provided');
      const url = await storeFile(req.file, { folder: 'declay/products', resourceType: 'image' });
      sendSuccess(res, { url }, 'File uploaded successfully', 201);
    }),
  );
  return router;
}

// M-29e: khách đăng nhập tải ảnh bằng chứng trả hàng: POST /api/returns/upload
export function createReturnUploadRouter(): Router {
  const router = Router();
  router.post(
    '/upload',
    routeProtect,
    uploadLimiter,
    handleUpload(imageUpload.single('file')),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) throw httpError(400, 'No file provided');
      const url = await storeFile(req.file, { folder: 'declay/returns', resourceType: 'image' });
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
    handleUpload(cvUpload.single('file')),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) throw httpError(400, 'No file provided');
      const url = await storeFile(req.file, { folder: 'declay/cvs', resourceType: 'raw' });
      sendSuccess(res, { url }, 'CV uploaded successfully', 201);
    }),
  );
  return router;
}
