import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { IOrderShipmentController, IOrderShipmentService } from './order-shipment.interface';

export default class OrderShipmentController implements IOrderShipmentController {
  constructor(private shipmentService: IOrderShipmentService) {}

  private getUserId(req: Request): number {
    const user = req.user as { userId: number };
    if (!user?.userId) throw httpError(401, 'Not authenticated');
    return user.userId;
  }

  getMine = asyncHandler(async (req: Request, res: Response) => {
    const shipment = await this.shipmentService.getForUser(
      Number(req.params.orderId),
      this.getUserId(req),
    );
    sendSuccess(res, shipment, 'Shipment retrieved successfully');
  });

  adminGet = asyncHandler(async (req: Request, res: Response) => {
    const shipment = await this.shipmentService.getByOrder(Number(req.params.orderId));
    sendSuccess(res, shipment, 'Shipment retrieved successfully');
  });

  adminCreate = asyncHandler(async (req: Request, res: Response) => {
    const shipment = await this.shipmentService.create(Number(req.params.orderId), req.body);
    sendSuccess(res, shipment, 'Shipment created successfully', 201);
  });

  adminCreateViaProvider = asyncHandler(async (req: Request, res: Response) => {
    const shipment = await this.shipmentService.createViaProvider(Number(req.params.orderId));
    sendSuccess(res, shipment, 'Shipment created via provider', 201);
  });

  /** M-13d: tạo vận đơn GHN. ⚠️ Phát sinh cước thật khi GHN_ALLOW_WRITE=true. */
  adminCreateGhn = asyncHandler(async (req: Request, res: Response) => {
    const shipment = await this.shipmentService.createGhnShipment(Number(req.params.orderId));
    sendSuccess(res, shipment, 'Đã tạo vận đơn GHN', 201);
  });

  adminSyncGhn = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.shipmentService.syncFromGhn(Number(req.params.orderId));
    sendSuccess(res, result, result.synced ? `Đã đồng bộ: ${result.ghnStatus}` : 'GHN chưa có trạng thái mới');
  });

  adminSimulate = asyncHandler(async (req: Request, res: Response) => {
    const shipment = await this.shipmentService.simulate(Number(req.params.orderId), req.body.status);
    sendSuccess(res, shipment, 'Tracking simulated');
  });

  adminUpdate = asyncHandler(async (req: Request, res: Response) => {
    const shipment = await this.shipmentService.update(Number(req.params.orderId), req.body);
    sendSuccess(res, shipment, 'Shipment updated successfully');
  });

  adminRemove = asyncHandler(async (req: Request, res: Response) => {
    await this.shipmentService.remove(Number(req.params.orderId));
    sendSuccess(res, null, 'Shipment deleted successfully');
  });
}
