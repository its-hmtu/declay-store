import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import { Order, OrderItem } from '@/modules/order/order.entity';
import User from '@/modules/user/user.entity';
import { Refund } from '@/modules/payment/payment.entity';

/**
 * M-29a: khung dữ liệu Huỷ đơn & Trả hàng lỗi. Xem docs/business-analysis/07.
 *
 * Cố ý KHÔNG thêm giá trị vào enum `orders.status`: các yêu cầu huỷ/trả là thực
 * thể phụ, để máy trạng thái đơn (forward-only, webhook GHN, job M-27) không đổi.
 */

export type CancellationRequestStatus = 'pending' | 'approved' | 'rejected' | 'needs_manual';
export type ReturnRequestType = 'defective' | 'wrong_item';
export type ReturnRequestStatus =
  | 'pending' | 'approved' | 'rejected' | 'awaiting_return' | 'received' | 'refunded' | 'expired';
export type ReturnItemStatus = 'requested' | 'approved' | 'rejected' | 'received';

/** Thông tin ngân hàng để hoàn CK/COD (A3). Không lưu dữ liệu nhạy cảm ngoài các trường này. */
export interface RefundBankInfo {
  accountName: string;
  accountNumber: string;
  bankName: string;
}

/* ── Yêu cầu huỷ đơn (khi đã có vận đơn GHN — cần admin duyệt) ── */

export class CancellationRequest extends Model<
  InferAttributes<CancellationRequest>,
  InferCreationAttributes<CancellationRequest>
> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare requestedBy: CreationOptional<number | null>;
  declare reason: CreationOptional<string | null>;
  declare status: CreationOptional<CancellationRequestStatus>;
  declare ghnCancelResult: CreationOptional<Record<string, unknown> | null>;
  declare refundId: CreationOptional<number | null>;
  declare resolvedBy: CreationOptional<number | null>;
  declare resolvedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CancellationRequest.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false, field: 'order_id' },
    requestedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'requested_by' },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    ghnCancelResult: { type: DataTypes.JSONB, allowNull: true, field: 'ghn_cancel_result' },
    refundId: { type: DataTypes.BIGINT, allowNull: true, field: 'refund_id' },
    resolvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'resolved_by' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'cancellation_requests', modelName: 'CancellationRequest', timestamps: true, underscored: true },
);

/* ── Yêu cầu trả hàng lỗi/sai ── */

export class ReturnRequest extends Model<
  InferAttributes<ReturnRequest>,
  InferCreationAttributes<ReturnRequest>
> {
  declare id: CreationOptional<number>;
  declare orderId: number;
  declare requestedBy: CreationOptional<number | null>;
  declare type: CreationOptional<ReturnRequestType>;
  declare status: CreationOptional<ReturnRequestStatus>;
  declare returnTrackingNumber: CreationOptional<string | null>;
  declare refundBankInfo: CreationOptional<RefundBankInfo | null>;
  declare refundId: CreationOptional<number | null>;
  declare resolvedBy: CreationOptional<number | null>;
  declare resolvedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ReturnRequest.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false, field: 'order_id' },
    requestedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'requested_by' },
    type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'defective' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    returnTrackingNumber: { type: DataTypes.STRING(255), allowNull: true, field: 'return_tracking_number' },
    refundBankInfo: { type: DataTypes.JSONB, allowNull: true, field: 'refund_bank_info' },
    refundId: { type: DataTypes.BIGINT, allowNull: true, field: 'refund_id' },
    resolvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'resolved_by' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'return_requests', modelName: 'ReturnRequest', timestamps: true, underscored: true },
);

/* ── Chi tiết trả theo từng món ── */

export class ReturnRequestItem extends Model<
  InferAttributes<ReturnRequestItem>,
  InferCreationAttributes<ReturnRequestItem>
> {
  declare id: CreationOptional<number>;
  declare returnRequestId: number;
  declare orderItemId: number;
  declare quantity: number;
  declare reason: CreationOptional<string | null>;
  declare photoUrls: CreationOptional<string[]>;
  declare itemStatus: CreationOptional<ReturnItemStatus>;
  declare refundAmount: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ReturnRequestItem.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    returnRequestId: { type: DataTypes.BIGINT, allowNull: false, field: 'return_request_id' },
    orderItemId: { type: DataTypes.INTEGER, allowNull: false, field: 'order_item_id' },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    photoUrls: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'photo_urls' },
    itemStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'requested', field: 'item_status' },
    refundAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'refund_amount' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'return_request_items', modelName: 'ReturnRequestItem', timestamps: true, underscored: true },
);

/* ── Associations ── */

Order.hasMany(CancellationRequest, { foreignKey: 'orderId', as: 'cancellationRequests', onDelete: 'CASCADE' });
CancellationRequest.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
CancellationRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
CancellationRequest.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });
CancellationRequest.belongsTo(Refund, { foreignKey: 'refundId', as: 'refund' });

Order.hasMany(ReturnRequest, { foreignKey: 'orderId', as: 'returnRequests', onDelete: 'CASCADE' });
ReturnRequest.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
ReturnRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
ReturnRequest.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });
ReturnRequest.belongsTo(Refund, { foreignKey: 'refundId', as: 'refund' });
ReturnRequest.hasMany(ReturnRequestItem, { foreignKey: 'returnRequestId', as: 'items', onDelete: 'CASCADE' });
ReturnRequestItem.belongsTo(ReturnRequest, { foreignKey: 'returnRequestId', as: 'returnRequest' });
ReturnRequestItem.belongsTo(OrderItem, { foreignKey: 'orderItemId', as: 'orderItem' });
