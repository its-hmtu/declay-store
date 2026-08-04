import {
  DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';

/** M-35: cặp sản phẩm hay mua chung (do job nền dựng lại). */
export class ProductCooccurrence extends Model<
  InferAttributes<ProductCooccurrence>, InferCreationAttributes<ProductCooccurrence>
> {
  declare productId: number;
  declare coProductId: number;
  declare score: number;
  declare updatedAt: CreationOptional<Date>;
}

ProductCooccurrence.init(
  {
    productId: { type: DataTypes.INTEGER, primaryKey: true, field: 'product_id' },
    coProductId: { type: DataTypes.INTEGER, primaryKey: true, field: 'co_product_id' },
    score: { type: DataTypes.DECIMAL, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'product_cooccurrence', modelName: 'ProductCooccurrence', timestamps: false, underscored: true },
);

/** M-35: sự kiện xem sản phẩm theo người (cho gợi ý theo hành vi duyệt). */
export class ProductViewEvent extends Model<
  InferAttributes<ProductViewEvent>, InferCreationAttributes<ProductViewEvent>
> {
  declare id: CreationOptional<number>;
  declare userId: CreationOptional<number | null>;
  declare sessionId: CreationOptional<string | null>;
  declare productId: number;
  declare viewedAt: CreationOptional<Date>;
}

ProductViewEvent.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
    sessionId: { type: DataTypes.STRING(64), allowNull: true, field: 'session_id' },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: 'product_id' },
    viewedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'viewed_at' },
  },
  { sequelize, tableName: 'product_view_events', modelName: 'ProductViewEvent', timestamps: false, underscored: true },
);

/** M-35 (đo lường): impression/click của gợi ý -> tính CTR theo ngữ cảnh. */
export type RecoEventKind = 'impression' | 'click';

export class RecommendationEvent extends Model<
  InferAttributes<RecommendationEvent>, InferCreationAttributes<RecommendationEvent>
> {
  declare id: CreationOptional<number>;
  declare kind: RecoEventKind;
  declare context: string;
  declare productId: CreationOptional<number | null>;
  declare userId: CreationOptional<number | null>;
  declare sessionId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
}

RecommendationEvent.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    kind: { type: DataTypes.STRING(12), allowNull: false },
    context: { type: DataTypes.STRING(24), allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: true, field: 'product_id' },
    userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
    sessionId: { type: DataTypes.STRING(64), allowNull: true, field: 'session_id' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  { sequelize, tableName: 'recommendation_events', modelName: 'RecommendationEvent', timestamps: false, underscored: true },
);
