import {
  CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import Product from '@/modules/product/product.entity';

export class Collection extends Model<InferAttributes<Collection>, InferCreationAttributes<Collection>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare slug: string;
  declare description: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  declare sortOrder: CreationOptional<number>;
  declare createdBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Collection.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(170), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(500), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'collections', modelName: 'Collection', timestamps: true, underscored: true },
);

export class CollectionProduct extends Model<InferAttributes<CollectionProduct>, InferCreationAttributes<CollectionProduct>> {
  declare collectionId: number;
  declare productId: number;
}

CollectionProduct.init(
  {
    collectionId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: 'collection_id' },
    productId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, field: 'product_id' },
  },
  { sequelize, tableName: 'collection_products', modelName: 'CollectionProduct', timestamps: false, underscored: true },
);

Collection.belongsToMany(Product, { through: CollectionProduct, foreignKey: 'collection_id', otherKey: 'product_id', as: 'products' });
Product.belongsToMany(Collection, { through: CollectionProduct, foreignKey: 'product_id', otherKey: 'collection_id', as: 'collections' });
CollectionProduct.belongsTo(Collection, { foreignKey: 'collectionId', as: 'collection' });
CollectionProduct.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
