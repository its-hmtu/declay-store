import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import AdminUser from '@/modules/admin-auth/admin-auth.entity';

class SiteSetting extends Model<
  InferAttributes<SiteSetting>,
  InferCreationAttributes<SiteSetting>
> {
  declare key: string;
  declare value: CreationOptional<string | null>;
  declare updatedAt: CreationOptional<Date>;
  declare updatedBy: CreationOptional<number | null>;
}

SiteSetting.init(
  {
    key: { type: DataTypes.STRING(100), primaryKey: true },
    value: { type: DataTypes.TEXT, allowNull: true },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'updated_by',
      references: { model: 'admin_users', key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'site_settings',
    modelName: 'SiteSetting',
    timestamps: false,
    underscored: true,
  },
);

// Associations
AdminUser.hasMany(SiteSetting, { foreignKey: 'updatedBy', as: 'siteSettings' });
SiteSetting.belongsTo(AdminUser, { foreignKey: 'updatedBy', as: 'editor' });

export default SiteSetting;
