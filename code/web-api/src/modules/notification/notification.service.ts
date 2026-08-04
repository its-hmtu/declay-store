import { Op } from 'sequelize';
import Notification from './notification.entity';
import { httpError } from '@/utils/http-error';
import type {
  INotification, INotificationList, INotificationService, ICreateNotification,
} from './notification.interface';

export default class NotificationService implements INotificationService {
  // Fire-and-forget: a notification failure must never break the action that triggered it.
  async notifyAdmins(data: ICreateNotification): Promise<void> {
    try {
      await Notification.create({ recipientType: 'admin', recipientId: null, ...data });
    } catch (err) {
      console.error('⚠️  Failed to create admin notification:', (err as Error).message);
    }
  }

  /**
   * M-33: khách KHÔNG còn thông báo on-site — chỉ nhận qua email. Giữ chữ ký để
   * các lời gọi cũ vẫn biên dịch, nhưng không tạo bản ghi in-app nữa. Các sự kiện
   * cho khách được gửi bằng email ở tầng service (queueOrderStatusEmail /
   * queueCustomerNotice).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async notifyUser(_userId: number, _data: ICreateNotification): Promise<void> {
    // no-op
  }

  async listForUser(userId: number, page: number, limit: number): Promise<INotificationList> {
    const where = { recipientType: 'user' as const, recipientId: userId };
    const { rows, count } = await Notification.findAndCountAll({
      where, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit,
    });
    const unread = await Notification.count({ where: { ...where, isRead: false } });
    return { rows: rows.map((r) => r.toJSON() as INotification), count, unread };
  }

  async listForAdmin(page: number, limit: number): Promise<INotificationList> {
    const where = { recipientType: 'admin' as const };
    const { rows, count } = await Notification.findAndCountAll({
      where, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit,
    });
    const unread = await Notification.count({ where: { ...where, isRead: false } });
    return { rows: rows.map((r) => r.toJSON() as INotification), count, unread };
  }

  async markReadForUser(userId: number, id: number): Promise<void> {
    const [n] = await Notification.update(
      { isRead: true },
      { where: { id, recipientType: 'user', recipientId: userId } },
    );
    if (n === 0) throw httpError(404, 'Notification not found');
  }

  async markReadForAdmin(id: number): Promise<void> {
    const [n] = await Notification.update(
      { isRead: true },
      { where: { id, recipientType: 'admin' } },
    );
    if (n === 0) throw httpError(404, 'Notification not found');
  }

  async markAllReadForUser(userId: number): Promise<void> {
    await Notification.update(
      { isRead: true },
      { where: { recipientType: 'user', recipientId: userId, isRead: false } },
    );
  }

  async markAllReadForAdmin(): Promise<void> {
    await Notification.update(
      { isRead: true },
      { where: { recipientType: 'admin', isRead: false, id: { [Op.gt]: 0 } } },
    );
  }
}
