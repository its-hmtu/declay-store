import type { RequestHandler } from 'express';
import type { NotificationRecipient } from './notification.entity';

export interface INotification {
  id: number;
  recipientType: NotificationRecipient;
  recipientId: number | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface ICreateNotification {
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

export interface INotificationList {
  rows: INotification[];
  count: number;
  unread: number;
}

export interface INotificationService {
  notifyAdmins(data: ICreateNotification): Promise<void>;
  notifyUser(userId: number, data: ICreateNotification): Promise<void>;
  listForUser(userId: number, page: number, limit: number): Promise<INotificationList>;
  listForAdmin(page: number, limit: number): Promise<INotificationList>;
  markReadForUser(userId: number, id: number): Promise<void>;
  markReadForAdmin(id: number): Promise<void>;
  markAllReadForUser(userId: number): Promise<void>;
  markAllReadForAdmin(): Promise<void>;
}

export interface INotificationController {
  listMine: RequestHandler;
  markMineRead: RequestHandler;
  markAllMineRead: RequestHandler;
  adminList: RequestHandler;
  adminMarkRead: RequestHandler;
  adminMarkAllRead: RequestHandler;
}
