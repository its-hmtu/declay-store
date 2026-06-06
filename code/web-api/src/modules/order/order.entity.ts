import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import User from '@/modules/user/user.entity';
import DiscountCode from '@/modules/discount/discount.entity';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare status: CreationOptional<OrderStatus>;
  declare totalAmount: number;
  declare stripePaymentIntentId: CreationOptional<string | null>;
  declare shippingAddressId: CreationOptional<number | null>;
  declare discountCodeId: CreationOptional<number | null>;
  declare discountAmount: CreationOptional<number>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Order.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'RESTRICT',
    },
    status: {
      type: DataTypes.ENUM('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending_payment',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_amount',
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'stripe_payment_intent_id',
    },
    shippingAddressId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'shipping_address_id',
      references: { model: 'addresses', key: 'id' },
      onDelete: 'SET NULL',
    },
    discountCodeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'discount_code_id',
      references: { model: 'discount_codes', key: 'id' },
      onDelete: 'SET NULL',
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'discount_amount',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'orders', modelName: 'Order', timestamps: true, underscored: true },
);

export class OrderItem extends Model<InferAttributes<OrderItem>, InferCreationAttributes<OrderItem>> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare variantId: number;
  declare quantity: number;
  declare priceAtPurchase: number;
  declare variantNameAtPurchase: string;
  declare productNameAtPurchase: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

OrderItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'order_id',
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'variant_id',
      references: { model: 'product_variants', key: 'id' },
      onDelete: 'RESTRICT',
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    priceAtPurchase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'price_at_purchase',
    },
    variantNameAtPurchase: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'variant_name_at_purchase',
    },
    productNameAtPurchase: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'product_name_at_purchase',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'order_items', modelName: 'OrderItem', timestamps: true, underscored: true },
);

export class OrderShipment extends Model<
  InferAttributes<OrderShipment>,
  InferCreationAttributes<OrderShipment>
> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare carrier: string;
  declare trackingNumber: string;
  declare shippedAt: CreationOptional<Date>;
  declare estimatedDeliveryAt: CreationOptional<Date | null>;
  declare deliveredAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

OrderShipment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'order_id',
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    carrier: { type: DataTypes.STRING(100), allowNull: false },
    trackingNumber: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'tracking_number',
    },
    shippedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'shipped_at',
    },
    estimatedDeliveryAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'estimated_delivery_at',
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'delivered_at',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'order_shipments',
    modelName: 'OrderShipment',
    timestamps: true,
    underscored: true,
  },
);

// Associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasOne(OrderShipment, { foreignKey: 'orderId', as: 'shipment', onDelete: 'CASCADE' });
OrderShipment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
DiscountCode.hasMany(Order, { foreignKey: 'discountCodeId', as: 'orders' });
Order.belongsTo(DiscountCode, { foreignKey: 'discountCodeId', as: 'discountCode' });
