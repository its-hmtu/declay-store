import { Router, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import config from '@/config/env';
import { convertUsdToVnd, formatVnd, FxConfigurationError } from './vnpay.fx';

/**
 * M-12 FX: cho storefront hỏi trước "đơn này sẽ bị trừ bao nhiêu VND".
 * Tỉ giá chỉ được định nghĩa ở backend — FE không tự nhân, tránh việc màn hình
 * checkout và số tiền gửi cổng nói hai con số khác nhau.
 */
export function createVnpayQuoteRouter(): Router {
  const router = Router();

  router.get(
    '/quote',
    asyncHandler(async (req: Request, res: Response) => {
      const amountUsd = Number(req.query.amount);
      if (!Number.isFinite(amountUsd) || amountUsd < 0) {
        res.status(400).json({ success: false, message: 'Invalid amount' });
        return;
      }
      try {
        const amountVnd = convertUsdToVnd(amountUsd, config.vnpay.usdToVnd);
        res.json({
          success: true,
          data: { amountUsd, rate: config.vnpay.usdToVnd, amountVnd, display: formatVnd(amountVnd) },
          message: 'VNPay quote',
        });
      } catch (err) {
        // Chưa cấu hình tỉ giá: báo 503 để FE ẩn lựa chọn VNPay,
        // thay vì để khách bấm rồi mới hỏng ở bước tạo đơn.
        if (err instanceof FxConfigurationError) {
          res.status(503).json({ success: false, message: 'VNPay chưa sẵn sàng (thiếu cấu hình tỉ giá).' });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
