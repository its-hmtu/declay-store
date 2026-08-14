import {
  DataTypes, Model,
  type InferAttributes, type InferCreationAttributes, type CreationOptional,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';

export type ShippingZone = 'all' | 'domestic' | 'international';

export class ShippingMethod extends Model<InferAttributes<ShippingMethod>, InferCreationAttributes<ShippingMethod>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare zone: CreationOptional<ShippingZone>;
  declare fee: number;
  declare freeOver: CreationOptional<number | null>;
  declare estimatedDays: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ShippingMethod.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    zone: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'all' },
    fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    freeOver: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'free_over' },
    estimatedDays: { type: DataTypes.STRING(50), allowNull: true, field: 'estimated_days' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'shipping_methods', modelName: 'ShippingMethod', timestamps: true, underscored: true },
);

export default ShippingMethod;
