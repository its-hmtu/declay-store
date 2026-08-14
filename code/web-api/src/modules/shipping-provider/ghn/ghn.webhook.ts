import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { logger } from '@/lib/logger';
import OrderShipmentService from '@/modules/order-shipment/order-shipment.service';
import { isStatusChangeType } from './ghn.status';

const shipmentService = new OrderShipmentService();

/**
 * M-24: webhook trạng thái đơn của GHN (docs id=47).
 *
 * GHN POST về đây mỗi khi vận đơn đổi trạng thái. Yêu cầu của GHN: trả về
 * code=200, nếu không họ retry 10 lần cách nhau 5 giây. Vì vậy handler LUÔN trả
 * 200 — kể cả khi không tìm thấy vận đơn khớp — để không bị dội request.
 *
 * Không có chữ ký: GHN chỉ cho khai ClientID + URL. Lớp bảo vệ là:
 *  - Chỉ khớp theo OrderCode (mã vận đơn GHN cấp, khó đoán) đã có trong DB.
 *  - Cập nhật trạng thái đơn TIẾN-MỘT-CHIỀU: payload giả không kéo lùi được đơn
 *    đã delivered, và không tạo ra đơn mới.
 */
export const ghnWebhook = asyncHandler(async (req: Request, res: Response) => {
  // Webhook router mount bằng express.raw -> req.body là Buffer. Tự parse JSON.
  let payload: Record<string, unknown>;
  try {
    payload = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString('utf8'))
      : (req.body ?? {});
  } catch {
    logger.warn('GHN webhook: body không phải JSON hợp lệ');
    res.status(200).json({ code: 200, message: 'ignored' });
    return;
  }

  const ghnOrderCode = String(payload.OrderCode ?? '').trim();
  const status = String(payload.Status ?? '').trim();
  const type = String(payload.Type ?? '').trim();

  logger.info('GHN webhook', {
    orderCode: ghnOrderCode,
    clientOrderCode: payload.ClientOrderCode,
    status,
    type,
  });

  // Bỏ qua sự kiện không phải đổi trạng thái (update_weight/cod/fee) — vẫn 200.
  if (!ghnOrderCode || !isStatusChangeType(type)) {
    res.status(200).json({ code: 200, message: 'skipped' });
    return;
  }

  try {
    const handled = await shipmentService.applyGhnWebhook({
      ghnOrderCode,
      status,
      description: (payload.Description as string) ?? null,
      time: (payload.Time as string) ?? null,
    });
    if (!handled) logger.warn('GHN webhook: không có vận đơn khớp', { orderCode: ghnOrderCode });
  } catch (err) {
    // Kể cả khi xử lý lỗi vẫn trả 200: retry của GHN không khắc phục được lỗi
    // logic của mình, chỉ làm dội request. Lỗi đã được log để xử lý sau.
    logger.error('GHN webhook xử lý lỗi', { orderCode: ghnOrderCode, error: (err as Error).message });
  }

  res.status(200).json({ code: 200, message: 'ok' });
});
