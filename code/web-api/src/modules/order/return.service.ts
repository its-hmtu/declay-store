import { Op } from 'sequelize';
import { sequelize } from '@/config/sequelize';
import config from '@/config/env';
import { httpError } from '@/utils/http-error';
import { logger } from '@/lib/logger';
import { Order, OrderItem } from './order.entity';
import Address from '@/modules/address/address.entity';
import GhnService from '@/modules/shipping-provider/ghn/ghn.service';
import { ReturnRequest, ReturnRequestItem, type ReturnRequestType } from './order-requests.entity';
import { returnRejectionReason } from './order.returns';
import {
  validateReturnLines, returnItemsSubtotal, isWholeOrderReturn, returnRefundTotal,
  type ReturnLine, type PurchasedLine,
} from './order.return';
import RefundService from '@/modules/refund/refund.service';
import NotificationService from '@/modules/notification/notification.service';
import { queueOrderStatusEmail, queueCustomerNotice } from '@/lib/email-queue';

const OPEN_STATUSES = ['pending', 'approved', 'awaiting_return', 'received'];
const COUNTED_STATUSES = ['pending', 'approved', 'awaiting_return', 'received', 'refunded'];

/**
 * M-29e: trả hàng lỗi/sai theo từng món.
 *
 * Chỉ nhận khi đơn đã `delivered` và trong cửa sổ 7 ngày (BR-R1, tái dùng
 * `returnRejectionReason`). Bắt buộc ảnh (BR-R2). Hàng trả KHÔNG hoàn kho (P5) —
 * hoàn tiền qua RefundService. Trả toàn bộ -> đơn `returned`; một phần -> giữ
 * `delivered` + cờ `partial_returned`.
 */
export default class ReturnService {
  private refundService = new RefundService();
  private notifications = new NotificationService();

  /** Khách gửi yêu cầu trả. */
  async createReturn(
    orderId: number,
    userId: number,
    input: { type?: ReturnRequestType; items: ReturnLine[] },
  ): Promise<ReturnRequest> {
    const order = await Order.findOne({
      where: { id: orderId, userId },
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) throw httpError(404, 'Order not found');

    const rejection = returnRejectionReason(order.status, order.deliveredAt ?? null);
    if (rejection) throw httpError(400, rejection);

    const open = await ReturnRequest.findOne({ where: { orderId, status: OPEN_STATUSES } });
    if (open) throw httpError(409, 'Đơn đã có một yêu cầu trả đang xử lý.');

    const items = (order as unknown as { items?: OrderItem[] }).items ?? [];
    const priorReturned = await this.returnedUnitsPerItem(orderId, COUNTED_STATUSES);

    const purchased = new Map<number, PurchasedLine>();
    for (const it of items) {
      purchased.set(it.id, {
        purchased: it.quantity,
        alreadyReturned: priorReturned.get(it.id) ?? 0,
        unitPrice: Number(it.priceAtPurchase),
      });
    }

    const error = validateReturnLines(input.items, purchased);
    if (error) throw httpError(400, error);

    const request = await sequelize.transaction(async (t) => {
      const req = await ReturnRequest.create({
        orderId, requestedBy: userId, type: input.type ?? 'defective', status: 'pending',
      }, { transaction: t });
      for (const l of input.items) {
        await ReturnRequestItem.create({
          returnRequestId: req.id, orderItemId: l.orderItemId, quantity: l.quantity,
          reason: l.reason ?? null, photoUrls: l.photoUrls, itemStatus: 'requested',
        }, { transaction: t });
      }
      return req;
    });

    await this.notifications.notifyAdmins({
      type: 'order_status', title: `Yêu cầu trả hàng đơn ${order.orderCode}`,
      body: 'Khách báo hàng lỗi/sai — cần duyệt.', link: `/admin/orders/${orderId}`,
    });
    return request;
  }

  /**
   * Admin duyệt. `returnTrackingNumber` nhập tay (shop tạo vận đơn trả GHN rồi
   * dán mã vào — P10). Tự động tạo vận đơn trả GHN là bước nâng cấp sau (cần địa
   * chỉ kho shop đầy đủ trong cấu hình).
   */
  async approveReturn(requestId: number, adminId: number, returnTrackingNumber?: string | null): Promise<void> {
    const req = await this.pendingOrThrow(requestId);
    // Admin nhập mã tay thì dùng luôn; nếu không, thử tự tạo vận đơn trả GHN.
    // Không chặn: thiếu cấu hình kho / GHN lỗi thì để null, admin nhập sau.
    let tracking = returnTrackingNumber ?? null;
    if (!tracking) {
      try {
        tracking = await this.createReturnWaybill(req.orderId);
      } catch (err) {
        logger.warn('Tạo vận đơn trả GHN thất bại (bỏ qua, admin nhập tay)', { error: (err as Error).message });
      }
    }
    await req.update({
      status: 'awaiting_return', resolvedBy: adminId, resolvedAt: new Date(),
      returnTrackingNumber: tracking,
    });
    await ReturnRequestItem.update({ itemStatus: 'approved' }, { where: { returnRequestId: requestId } });
    await this.notifyRequester(req.orderId, 'Yêu cầu trả hàng đã được duyệt', 'Vui lòng gửi hàng về theo hướng dẫn.');
  }

  async rejectReturn(requestId: number, adminId: number, reason?: string): Promise<void> {
    const req = await this.pendingOrThrow(requestId);
    await req.update({ status: 'rejected', resolvedBy: adminId, resolvedAt: new Date() });
    await ReturnRequestItem.update({ itemStatus: 'rejected' }, { where: { returnRequestId: requestId } });
    await this.notifyRequester(req.orderId, 'Yêu cầu trả hàng bị từ chối', reason ?? 'Không đủ điều kiện trả.');
  }

  /** Admin xác nhận đã nhận hàng trả -> hoàn tiền theo món (KHÔNG hoàn kho). */
  async markReceived(requestId: number, adminId: number): Promise<{ refundId: number | null; wholeOrder: boolean }> {
    const req = await ReturnRequest.findByPk(requestId);
    if (!req) throw httpError(404, 'Không tìm thấy yêu cầu trả.');
    if (!['approved', 'awaiting_return'].includes(req.status)) {
      throw httpError(400, `Yêu cầu đang ở trạng thái "${req.status}", không thể nhận hàng.`);
    }

    const order = await Order.findByPk(req.orderId);
    if (!order) throw httpError(404, 'Order not found');

    const orderItems = await OrderItem.findAll({ where: { orderId: order.id } });
    const priceMap = new Map(orderItems.map((i) => [i.id, Number(i.priceAtPurchase)]));
    const returnItems = await ReturnRequestItem.findAll({ where: { returnRequestId: requestId } });

    const lines = returnItems.map((i) => ({ unitPrice: priceMap.get(i.orderItemId) ?? 0, quantity: i.quantity }));
    const subtotal = returnItemsSubtotal(lines);

    const totalPurchasedUnits = orderItems.reduce((s, i) => s + i.quantity, 0);
    const returnedUnits = await this.receivedUnitsForOrder(order.id, requestId);
    const wholeOrder = isWholeOrderReturn(totalPurchasedUnits, 0, returnedUnits);
    const refundAmount = returnRefundTotal(subtotal, wholeOrder, Number(order.shippingFee));

    // Ghi nhận nhận hàng + số tiền hoàn từng món (KHÔNG hoàn kho — P5).
    await sequelize.transaction(async (t) => {
      for (const it of returnItems) {
        await it.update({
          itemStatus: 'received',
          refundAmount: (priceMap.get(it.orderItemId) ?? 0) * it.quantity,
        }, { transaction: t });
      }
      await req.update({ status: 'received' }, { transaction: t });
      if (wholeOrder) await order.update({ status: 'returned', returnedAt: new Date() }, { transaction: t });
      else await order.update({ partialReturned: true }, { transaction: t });
    });

    const refund = await this.refundService.issueRefund({
      order, amountVnd: refundAmount, reason: `Trả hàng đơn ${order.orderCode}`,
      type: 'return', returnRequestId: requestId, initiatedBy: adminId,
    });
    await req.update({ status: 'refunded', refundId: refund.id });

    await queueOrderStatusEmail({ orderId: order.id, status: wholeOrder ? 'returned' : 'delivered' });
    await this.notifyRequester(order.id, 'Đã nhận hàng trả & xử lý hoàn tiền',
      `Hoàn ${refundAmount.toLocaleString('vi-VN')}đ theo phương thức thanh toán ban đầu.`);
    return { refundId: refund.id, wholeOrder };
  }

  /**
   * M-29 (P12/BR-R8): tự đóng các yêu cầu trả treo ở `awaiting_return` quá N
   * ngày (mặc định 14) mà chưa nhận được hàng; nhắc khách khi sắp hết hạn.
   * Dùng `updatedAt` làm mốc "bắt đầu chờ hàng" (được đặt khi duyệt).
   */
  async expireStaleReturns(days = 14): Promise<{ expired: number; reminded: number }> {
    const now = Date.now();
    const windowMs = days * 86_400_000;
    const remindFromMs = (days - 2) * 86_400_000;
    const awaiting = await ReturnRequest.findAll({ where: { status: 'awaiting_return' } });

    let expired = 0;
    let reminded = 0;
    for (const r of awaiting) {
      const age = now - new Date(r.updatedAt).getTime();
      if (age >= windowMs) {
        await r.update({ status: 'expired' });
        await ReturnRequestItem.update({ itemStatus: 'rejected' }, { where: { returnRequestId: r.id } });
        await this.notifyRequester(r.orderId, 'Yêu cầu trả hàng đã hết hạn',
          `Quá ${days} ngày chưa nhận được hàng gửi về. Liên hệ cửa hàng nếu vẫn muốn trả.`);
        expired += 1;
      } else if (age >= remindFromMs) {
        await this.notifyRequester(r.orderId, 'Sắp hết hạn gửi hàng trả',
          'Vui lòng gửi hàng về trong ít ngày tới, nếu không yêu cầu sẽ tự đóng.');
        reminded += 1;
      }
    }
    if (awaiting.length > 0) logger.info('Return expiry quét xong', { checked: awaiting.length, expired, reminded });
    return { expired, reminded };
  }

  async listPendingReturns(): Promise<ReturnRequest[]> {
    return ReturnRequest.findAll({
      where: { status: ['pending', 'approved', 'awaiting_return'] },
      include: [
        { model: Order, as: 'order', attributes: ['id', 'orderCode', 'status', 'totalAmount'] },
        { model: ReturnRequestItem, as: 'items' },
      ],
      order: [['createdAt', 'ASC']],
    });
  }

  /* ── nội bộ ───────────────────────────────────────────── */

  /** Tạo vận đơn trả GHN (chiều về). Trả null nếu thiếu cấu hình kho shop. */
  private async createReturnWaybill(orderId: number): Promise<string | null> {
    const { shopName, shopPhone, shopAddress, fromDistrictId, fromWardCode } = config.ghn;
    if (!shopName || !shopPhone || !shopAddress || !fromDistrictId || !fromWardCode) {
      logger.info('Bỏ qua tạo vận đơn trả: chưa cấu hình địa chỉ kho shop (GHN_SHOP_*).');
      return null;
    }

    const order = await Order.findByPk(orderId, {
      include: [{ model: Address, as: 'shippingAddress' }, { model: OrderItem, as: 'items' }],
    });
    const addr = (order as unknown as { shippingAddress?: Address })?.shippingAddress;
    const items = (order as unknown as { items?: OrderItem[] })?.items ?? [];
    if (!order || !addr?.ghnDistrictId || !addr?.ghnWardCode) return null;

    const result = await new GhnService().createReturnShipment({
      orderCode: `RET-${order.orderCode}`,
      from: {
        name: addr.receiverName, phone: addr.receiverPhone,
        address: [addr.addressLine, addr.addressLine2].filter(Boolean).join(', '),
        wardCode: String(addr.ghnWardCode), districtId: addr.ghnDistrictId,
      },
      to: { name: shopName, phone: shopPhone, address: shopAddress, wardCode: fromWardCode, districtId: fromDistrictId },
      parcel: { weightGram: order.shippingWeightGram ?? 1000, lengthCm: 20, widthCm: 20, heightCm: 10 },
      items: items.map((i) => ({
        name: i.productNameAtPurchase, code: String(i.variantId),
        quantity: i.quantity, priceVnd: Number(i.priceAtPurchase), weightGram: 500,
      })),
    });
    logger.info('Đã tạo vận đơn trả GHN', { orderId, code: result.providerOrderCode });
    return result.providerOrderCode;
  }

  private async pendingOrThrow(requestId: number): Promise<ReturnRequest> {
    const req = await ReturnRequest.findByPk(requestId);
    if (!req) throw httpError(404, 'Không tìm thấy yêu cầu trả.');
    if (req.status !== 'pending') throw httpError(400, `Yêu cầu đang ở trạng thái "${req.status}".`);
    return req;
  }

  private async returnedUnitsPerItem(orderId: number, statuses: string[]): Promise<Map<number, number>> {
    const requests = await ReturnRequest.findAll({ where: { orderId, status: statuses }, attributes: ['id'] });
    const ids = requests.map((r) => r.id);
    const map = new Map<number, number>();
    if (ids.length === 0) return map;
    const items = await ReturnRequestItem.findAll({ where: { returnRequestId: ids } });
    for (const it of items) map.set(it.orderItemId, (map.get(it.orderItemId) ?? 0) + it.quantity);
    return map;
  }

  /** Tổng số lượng đã/đang trả của đơn (gồm request hiện tại) — để phát hiện trả toàn bộ. */
  private async receivedUnitsForOrder(orderId: number, includeRequestId: number): Promise<number> {
    const requests = await ReturnRequest.findAll({
      where: { orderId, [Op.or]: [{ status: ['received', 'refunded'] }, { id: includeRequestId }] },
      attributes: ['id'],
    });
    const ids = requests.map((r) => r.id);
    if (ids.length === 0) return 0;
    const items = await ReturnRequestItem.findAll({ where: { returnRequestId: ids } });
    return items.reduce((s, i) => s + i.quantity, 0);
  }

  // M-33: thông báo cho khách qua EMAIL (khách không còn thông báo on-site). Các
  // sự kiện trả hàng (duyệt/từ chối/hết hạn) trước đây chỉ hiện trên chuông.
  private async notifyRequester(orderId: number, title: string, body: string): Promise<void> {
    await queueCustomerNotice(orderId, title, body);
  }
}
