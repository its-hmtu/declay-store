import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';

export type DiscountType = 'percent' | 'fixed';

class DiscountCode extends Model<
  InferAttributes<DiscountCode>,
  InferCreationAttributes<DiscountCode>
> {
  declare id: CreationOptional<number>;
  declare code: string;
  declare type: DiscountType;
  declare value: number;
  declare minOrderAmount: CreationOptional<number>;
  declare maxUses: CreationOptional<number | null>;
  declare usedCount: CreationOptional<number>;
  declare expiresAt: CreationOptional<Date | null>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

DiscountCode.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM('percent', 'fixed'),
      allowNull: false,
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    minOrderAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'min_order_amount',
    },
    maxUses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_uses',
    },
    usedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'used_count',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'discount_codes',
    modelName: 'DiscountCode',
    timestamps: true,
    underscored: true,
  },
);

export default DiscountCode;
