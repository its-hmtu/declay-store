import type { RequestHandler } from 'express';

export interface IOrderShipment {
  id: number;
  orderId: number;
  provider: string;
  providerShipmentId: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
  incoterm: string | null;
  labelUrl: string | null;
  cost: number | null;
  currency: string | null;
  lastEvent: string | null;
  lastEventAt: Date | null;
  podUrl: string | null;
  shippedAt: Date;
  estimatedDeliveryAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateShipmentData {
  carrier: string;
  trackingNumber: string;
  shippedAt?: Date;
  estimatedDeliveryAt?: Date | null;
}

export interface IUpdateShipmentData {
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: Date;
  estimatedDeliveryAt?: Date | null;
  deliveredAt?: Date | null;
}

export interface IOrderShipmentService {
  getForUser(orderId: number, userId: number): Promise<IOrderShipment>;
  getByOrder(orderId: number): Promise<IOrderShipment>;
  create(orderId: number, data: ICreateShipmentData): Promise<IOrderShipment>;
  createViaProvider(orderId: number): Promise<IOrderShipment>;
  simulate(orderId: number, rawStatus: string): Promise<IOrderShipment>;
  update(orderId: number, data: IUpdateShipmentData): Promise<IOrderShipment>;
  remove(orderId: number): Promise<void>;
}

export interface IOrderShipmentController {
  getMine: RequestHandler;
  adminGet: RequestHandler;
  adminCreate: RequestHandler;
  adminCreateViaProvider: RequestHandler;
  adminSimulate: RequestHandler;
  adminUpdate: RequestHandler;
  adminRemove: RequestHandler;
}
