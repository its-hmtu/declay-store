import {
  DataTypes, Model,
  type InferAttributes, type InferCreationAttributes, type CreationOptional,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import Product from '@/modules/product/product.entity';

export class Campaign extends Model<InferAttributes<Campaign>, InferCreationAttributes<Campaign>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare discountPercent: number;
  declare startsAt: CreationOptional<Date | null>;
  declare endsAt: CreationOptional<Date | null>;
  declare isActive: CreationOptional<boolean>;
  declare createdBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Campaign.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: true },
    discountPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, field: 'discount_percent' },
    startsAt: { type: DataTypes.DATE, allowNull: true, field: 'starts_at' },
    endsAt: { type: DataTypes.DATE, allowNull: true, field: 'ends_at' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'campaigns', modelName: 'Campaign', timestamps: true, underscored: true },
);

export class CampaignProduct extends Model<InferAttributes<CampaignProduct>, InferCreationAttributes<CampaignProduct>> {
  declare campaignId: number;
  declare productId: number;
}

CampaignProduct.init(
  {
    campaignId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: 'campaign_id' },
    productId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: 'product_id' },
  },
  { sequelize, tableName: 'campaign_products', modelName: 'CampaignProduct', timestamps: false, underscored: true },
);

// Associations
Campaign.belongsToMany(Product, { through: CampaignProduct, foreignKey: 'campaign_id', otherKey: 'product_id', as: 'products' });
Product.belongsToMany(Campaign, { through: CampaignProduct, foreignKey: 'product_id', otherKey: 'campaign_id', as: 'campaigns' });
CampaignProduct.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });
CampaignProduct.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export default Campaign;
