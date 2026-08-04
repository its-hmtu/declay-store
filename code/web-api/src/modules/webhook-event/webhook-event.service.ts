import { sequelize } from '@/config/sequelize';
import { ProcessedWebhookEvent, type WebhookProvider } from './webhook-event.entity';

/**
 * W-01: idempotency ở tầng webhook.
 *
 * `claim()` cố ghi một dòng cho (provider, eventId). Nhờ UNIQUE + `ON CONFLICT DO
 * NOTHING`, thao tác này NGUYÊN TỬ: đúng một lần trả về true (lần đầu, được xử
 * lý), mọi lần lặp trả về false (bỏ qua). Không cần khoá ứng dụng.
 *
 * Mẫu dùng ở handler: claim -> nếu false thì bỏ qua; nếu true thì xử lý, và nếu
 * xử lý NÉM LỖI thì gọi `release()` để cổng có thể retry (nếu không, sự kiện đã
 * bị đánh dấu xử lý trong khi side-effect chưa hoàn tất).
 */
export default class WebhookEventService {
  /** Trả về true nếu đây là lần đầu thấy sự kiện (được phép xử lý). */
  async claim(
    provider: WebhookProvider,
    eventId: string,
    eventType?: string | null,
    orderId?: number | null,
  ): Promise<boolean> {
    const [rows] = await sequelize.query(
      `INSERT INTO processed_webhook_events (provider, event_id, event_type, order_id)
       VALUES (:provider, :eventId, :eventType, :orderId)
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING id`,
      { replacements: { provider, eventId, eventType: eventType ?? null, orderId: orderId ?? null } },
    );
    // Có RETURNING id => chèn thành công => lần đầu. Rỗng => đã tồn tại => lặp.
    return (rows as unknown[]).length > 0;
  }

  /** Gỡ dấu đã-xử-lý khi side-effect thất bại, cho phép cổng retry. */
  async release(provider: WebhookProvider, eventId: string): Promise<void> {
    await ProcessedWebhookEvent.destroy({ where: { provider, eventId } });
  }
}
