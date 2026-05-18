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
    const { shippingAddressId, notes } = req.body;
    const result = await this.orderService.createFromCart({
      userId: this.getUserId(req),
      shippingAddressId,
      notes,
    });
    sendSuccess(res, result, 'Checkout initiated', 201);
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
