import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import { Order } from '@/modules/order/order.entity';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';
export type RefundStatus = 'pending' | 'succeeded' | 'failed';

export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare stripePaymentIntentId: CreationOptional<string | null>;
  declare amount: number;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<PaymentStatus>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Payment.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false, field: 'order_id' },
    stripePaymentIntentId: { type: DataTypes.STRING(255), allowNull: true, field: 'stripe_payment_intent_id' },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'usd' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'payments', modelName: 'Payment', timestamps: true, underscored: true },
);

export class Refund extends Model<InferAttributes<Refund>, InferCreationAttributes<Refund>> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare paymentId: CreationOptional<number | null>;
  declare stripeRefundId: CreationOptional<string | null>;
  declare amount: number;
  declare reason: CreationOptional<string | null>;
  declare status: CreationOptional<RefundStatus>;
  declare createdAt: CreationOptional<Date>;
}

Refund.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false, field: 'order_id' },
    paymentId: { type: DataTypes.BIGINT, allowNull: true, field: 'payment_id' },
    stripeRefundId: { type: DataTypes.STRING(255), allowNull: true, field: 'stripe_refund_id' },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'succeeded' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  { sequelize, tableName: 'refunds', modelName: 'Refund', timestamps: false, underscored: true },
);

// Associations
Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(Refund, { foreignKey: 'orderId', as: 'refunds' });
Refund.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Payment.hasMany(Refund, { foreignKey: 'paymentId', as: 'refunds' });
Refund.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
