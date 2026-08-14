import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';

export type WebhookProvider = 'stripe' | 'vnpay' | 'ghn';

/**
 * W-01: sổ ghi sự kiện webhook đã xử lý. Một dòng = một sự kiện đã "nhận trách
 * nhiệm xử lý". Ràng buộc UNIQUE(provider, event_id) biến việc chèn thành khoá
 * idempotent: chỉ lần chèn ĐẦU TIÊN thành công, các lần lặp bị chặn.
 */
export class ProcessedWebhookEvent extends Model<
  InferAttributes<ProcessedWebhookEvent>,
  InferCreationAttributes<ProcessedWebhookEvent>
> {
  declare id: CreationOptional<number>;
  declare provider: WebhookProvider;
  declare eventId: string;
  declare eventType: CreationOptional<string | null>;
  declare orderId: CreationOptional<number | null>;
  declare processedAt: CreationOptional<Date>;
}

ProcessedWebhookEvent.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    provider: { type: DataTypes.STRING(20), allowNull: false },
    eventId: { type: DataTypes.STRING(255), allowNull: false, field: 'event_id' },
    eventType: { type: DataTypes.STRING(80), allowNull: true, field: 'event_type' },
    orderId: { type: DataTypes.INTEGER, allowNull: true, field: 'order_id' },
    processedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'processed_at' },
  },
  { sequelize, tableName: 'processed_webhook_events', modelName: 'ProcessedWebhookEvent', timestamps: false, underscored: true },
);
