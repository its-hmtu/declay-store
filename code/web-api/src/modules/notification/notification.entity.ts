import {
  DataTypes, Model,
  type InferAttributes, type InferCreationAttributes, type CreationOptional,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';

export type NotificationRecipient = 'admin' | 'user';

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
  declare id: CreationOptional<number>;
  declare recipientType: NotificationRecipient;
  declare recipientId: CreationOptional<number | null>;
  declare type: string;
  declare title: string;
  declare body: CreationOptional<string | null>;
  declare link: CreationOptional<string | null>;
  declare isRead: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

Notification.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    recipientType: { type: DataTypes.STRING(10), allowNull: false, field: 'recipient_type' },
    recipientId: { type: DataTypes.INTEGER, allowNull: true, field: 'recipient_id' },
    type: { type: DataTypes.STRING(50), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    link: { type: DataTypes.STRING(500), allowNull: true },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  { sequelize, tableName: 'notifications', modelName: 'Notification', timestamps: false, underscored: true },
);

export default Notification;
