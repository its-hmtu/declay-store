import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import AdminUser from '@/modules/admin-auth/admin-auth.entity';

class Banner extends Model<InferAttributes<Banner>, InferCreationAttributes<Banner>> {
  declare id: CreationOptional<number>;
  declare title: CreationOptional<string | null>;
  declare subtitle: CreationOptional<string | null>;
  declare imageUrl: string;
  declare linkUrl: CreationOptional<string | null>;
  declare position: CreationOptional<number>;
  declare isActive: CreationOptional<boolean>;
  declare startsAt: CreationOptional<Date | null>;
  declare endsAt: CreationOptional<Date | null>;
  declare createdBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Banner.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(255), allowNull: true },
    subtitle: { type: DataTypes.STRING(255), allowNull: true },
    imageUrl: { type: DataTypes.TEXT, allowNull: false, field: 'image_url' },
    linkUrl: { type: DataTypes.TEXT, allowNull: true, field: 'link_url' },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    startsAt: { type: DataTypes.DATE, allowNull: true, field: 'starts_at' },
    endsAt: { type: DataTypes.DATE, allowNull: true, field: 'ends_at' },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by',
      references: { model: 'admin_users', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'banners',
    modelName: 'Banner',
    timestamps: true,
    underscored: true,
  },
);

// Associations
AdminUser.hasMany(Banner, { foreignKey: 'createdBy', as: 'banners' });
Banner.belongsTo(AdminUser, { foreignKey: 'createdBy', as: 'creator' });

export default Banner;
