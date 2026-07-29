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
import Address from '@/modules/address/address.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'cancelled';

export class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
  declare id: CreationOptional<number>;
  declare userId: CreationOptional<number | null>;
  declare guestName: CreationOptional<string | null>;
  declare guestEmail: CreationOptional<string | null>;
  declare guestPhone: CreationOptional<string | null>;
  declare guestToken: CreationOptional<string | null>;
  declare deliveredAt: CreationOptional<Date | null>;
  declare returnedAt: CreationOptional<Date | null>;
  declare returnReason: CreationOptional<string | null>;
  declare status: CreationOptional<OrderStatus>;
  declare totalAmount: number;
  declare stripePaymentIntentId: CreationOptional<string | null>;
  declare shippingAddressId: CreationOptional<number | null>;
  declare discountCodeId: CreationOptional<number | null>;
  declare discountAmount: CreationOptional<number>;
  declare subtotal: CreationOptional<number>;
  declare shippingFee: CreationOptional<number>;
  declare shippingMethodId: CreationOptional<number | null>;
  /** M-16: mã hiển thị cho khách. Giao diện KHÔNG dùng id. */
  declare orderCode: CreationOptional<string>;
  /** M-20: giỏ hàng đã sinh ra đơn — để xoá đúng giỏ khi thanh toán xong. */
  declare cartId: CreationOptional<number | null>;
  // M-13: chốt lại thông tin vận chuyển GHN tại thời điểm đặt hàng.
  declare shippingCarrier: CreationOptional<string | null>;
  declare ghnServiceId: CreationOptional<number | null>;
  declare ghnServiceTypeId: CreationOptional<number | null>;
  declare shippingFeeQuoted: CreationOptional<number | null>;
  declare shippingWeightGram: CreationOptional<number | null>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Order.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'RESTRICT',
    },
    guestName: { type: DataTypes.STRING(120), allowNull: true, field: 'guest_name' },
    guestEmail: { type: DataTypes.STRING(160), allowNull: true, field: 'guest_email' },
    guestPhone: { type: DataTypes.STRING(32), allowNull: true, field: 'guest_phone' },
    guestToken: { type: DataTypes.STRING(64), allowNull: true, field: 'guest_token' },
    deliveredAt: { type: DataTypes.DATE, allowNull: true, field: 'delivered_at' },
    returnedAt: { type: DataTypes.DATE, allowNull: true, field: 'returned_at' },
    returnReason: { type: DataTypes.STRING(500), allowNull: true, field: 'return_reason' },
    status: {
      type: DataTypes.ENUM('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'),
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
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    shippingFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'shipping_fee',
    },
    orderCode:          { type: DataTypes.STRING(20), allowNull: false, field: 'order_code' },
    cartId:             { type: DataTypes.INTEGER, allowNull: true, field: 'cart_id' },
    shippingCarrier:    { type: DataTypes.STRING(20), allowNull: true, field: 'shipping_carrier' },
    ghnServiceId:       { type: DataTypes.INTEGER, allowNull: true, field: 'ghn_service_id' },
    ghnServiceTypeId:   { type: DataTypes.SMALLINT, allowNull: true, field: 'ghn_service_type_id' },
    shippingFeeQuoted:  { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: 'shipping_fee_quoted' },
    shippingWeightGram: { type: DataTypes.INTEGER, allowNull: true, field: 'shipping_weight_gram' },
    shippingMethodId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'shipping_method_id',
      references: { model: 'shipping_methods', key: 'id' },
      onDelete: 'SET NULL',
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
  declare provider: CreationOptional<string>;
  declare providerShipmentId: CreationOptional<string | null>;
  declare carrier: CreationOptional<string | null>;
  declare trackingNumber: CreationOptional<string | null>;
  declare status: CreationOptional<string>;
  declare incoterm: CreationOptional<string | null>;
  declare labelUrl: CreationOptional<string | null>;
  declare cost: CreationOptional<number | null>;
  declare currency: CreationOptional<string | null>;
  declare lastEvent: CreationOptional<string | null>;
  declare lastEventAt: CreationOptional<Date | null>;
  declare podUrl: CreationOptional<string | null>;
  /** M-13d: phản hồi gốc của hãng vận chuyển, giữ để đối soát khi có tranh chấp. */
  declare rawResponse: CreationOptional<Record<string, unknown> | null>;
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
    provider: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'manual' },
    providerShipmentId: { type: DataTypes.STRING(120), allowNull: true, field: 'provider_shipment_id' },
    carrier: { type: DataTypes.STRING(100), allowNull: true },
    trackingNumber: { type: DataTypes.STRING(255), allowNull: true, field: 'tracking_number' },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'created' },
    incoterm: { type: DataTypes.STRING(10), allowNull: true },
    labelUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'label_url' },
    rawResponse: { type: DataTypes.JSONB, allowNull: true, field: 'raw_response' },
    cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    currency: { type: DataTypes.STRING(3), allowNull: true },
    lastEvent: { type: DataTypes.STRING(255), allowNull: true, field: 'last_event' },
    lastEventAt: { type: DataTypes.DATE, allowNull: true, field: 'last_event_at' },
    podUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'pod_url' },
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

// M-19: hai quan hệ này TRƯỚC ĐÂY CHƯA ĐƯỢC KHAI BÁO. Mọi truy vấn dùng
// `include: [{ model: Address, as: 'shippingAddress' }]` hay `as: 'variant'`
// đều ném lỗi lúc chạy ("is not associated"), và TypeScript không bắt được vì
// `include` nhận kiểu lỏng. Cần cho: email xác nhận, email vận đơn, tóm tắt
// trang cảm ơn, và việc tạo vận đơn GHN.
Order.belongsTo(Address, { foreignKey: 'shippingAddressId', as: 'shippingAddress' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
