import {
  DataTypes, Model,
  type InferAttributes, type InferCreationAttributes, type CreationOptional,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import AdminUser from '@/modules/admin-auth/admin-auth.entity';

export class Page extends Model<InferAttributes<Page>, InferCreationAttributes<Page>> {
  declare id: CreationOptional<number>;
  declare slug: string;
  declare title: string;
  declare body: string;
  declare isPublished: CreationOptional<boolean>;
  declare effectiveDate: CreationOptional<string | null>;
  declare version: CreationOptional<number>;
  declare updatedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Page.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_published' },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_date' },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    updatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'updated_by' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  { sequelize, tableName: 'pages', modelName: 'Page', timestamps: true, underscored: true },
);

export class PageVersion extends Model<InferAttributes<PageVersion>, InferCreationAttributes<PageVersion>> {
  declare id: CreationOptional<number>;
  declare pageId: number;
  declare version: number;
  declare title: string;
  declare body: string;
  declare effectiveDate: CreationOptional<string | null>;
  declare isPublished: CreationOptional<boolean>;
  declare editedBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
}

PageVersion.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    pageId: { type: DataTypes.INTEGER, allowNull: false, field: 'page_id' },
    version: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_date' },
    isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_published' },
    editedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'edited_by' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  { sequelize, tableName: 'page_versions', modelName: 'PageVersion', timestamps: false, underscored: true },
);

// Associations
Page.hasMany(PageVersion, { foreignKey: 'pageId', as: 'versions', onDelete: 'CASCADE' });
PageVersion.belongsTo(Page, { foreignKey: 'pageId', as: 'page' });
AdminUser.hasMany(Page, { foreignKey: 'updatedBy', as: 'pages' });
Page.belongsTo(AdminUser, { foreignKey: 'updatedBy', as: 'editor' });
