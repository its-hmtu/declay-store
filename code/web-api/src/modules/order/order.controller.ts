import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { IOrderController, IOrderService } from './order.interface';

export default class OrderController implements IOrderController {
  constructor(private orderService: IOrderService) {}

  private getUserId(req: Request): number {
    const user = req.user as { userId: number };
    if (!user?.userId) throw httpError(401, 'Not authenticated');
    return user.userId;
  }

  createCheckout = asyncHandler(async (req: Request, res: Response) => {
    const { shippingAddressId, shippingAddress, notes, discountCode, shippingMethodId, paymentMethod, guest } = req.body;
    const user = req.user as { userId?: number } | undefined;
    const result = await this.orderService.createFromCart({
      userId: user?.userId ?? null,
      guestSessionId: req.header('X-Guest-Session') ?? null,
      // VNPay requires the payer IP; behind Render's proxy use the forwarded header.
      ipAddr: (req.header('X-Forwarded-For') ?? '').split(',')[0].trim() || req.ip || '127.0.0.1',
      guest,
      shippingAddressId,
      shippingAddress,
      notes,
      discountCode,
      shippingMethodId,
      paymentMethod,
    });
    sendSuccess(res, result, 'Checkout initiated', 201);
  });

  /** M-01: let a guest track their order with the opaque token issued at checkout. */
  lookupGuestOrder = asyncHandler(async (req: Request, res: Response) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) throw httpError(400, 'Order token is required');
    const order = await this.orderService.findByGuestToken(token);
    sendSuccess(res, order, 'Order retrieved successfully');
  });

  /** M-19: tóm tắt đơn cho trang cảm ơn của khách vãng lai (tra bằng token). */
  guestOrderSummary = asyncHandler(async (req: Request, res: Response) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) throw httpError(400, 'Order token is required');
    const summary = await this.orderService.getPublicSummaryByGuestToken(token);
    if (!summary) throw httpError(404, 'Order not found');
    sendSuccess(res, summary, 'Order summary');
  });

  adminReturnOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await this.orderService.returnOrder(Number(req.params.id), req.body.reason);
    sendSuccess(res, order, 'Order marked as returned');
  });

  listMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
    const limit = typeof req.query.limit === 'string' ? Math.min(Number(req.query.limit), 50) : 20;
    const result = await this.orderService.listByUser(this.getUserId(req), page, limit);
    sendSuccess(res, result.rows, 'Orders retrieved successfully', 200, { total: result.count, page, limit });
  });

  getOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await this.orderService.findById(Number(req.params.id), this.getUserId(req));
    sendSuccess(res, order, 'Order retrieved successfully');
  });

  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await this.orderService.cancelOrder(Number(req.params.id), this.getUserId(req));
    sendSuccess(res, order, 'Order cancelled successfully');
  });

  adminGetOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await this.orderService.adminGetById(Number(req.params.id));
    sendSuccess(res, order, 'Order retrieved successfully');
  });

  adminListOrders = asyncHandler(async (req: Request, res: Response) => {
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
    const limit = typeof req.query.limit === 'string' ? Math.min(Number(req.query.limit), 100) : 20;
    const status = typeof req.query.status === 'string' ? (req.query.status as any) : undefined;
    const result = await this.orderService.listAll(page, limit, status);
    sendSuccess(res, result.rows, 'Orders retrieved successfully', 200, { total: result.count, page, limit });
  });

  adminUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const order = await this.orderService.updateStatus(Number(req.params.id), status);
    sendSuccess(res, order, 'Order status updated');
  });
}
